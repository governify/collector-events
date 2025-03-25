'use strict';

const redisManager = require('./redisManager');
const logger = require('governify-commons').getLogger().tag('fetcher-githubGQL');

const { GQLPaginator } = require('gql-paginator');

// Function who controls the script flow
const getInfo = (options) => {
  /* eslint-disable no-async-promise-executor */
  return new Promise(async (resolve, reject) => {
    /* eslint-enable no-async-promise-executor */
    try {
      options.steps = resolveSteps(options.steps, options.repository, options.owner, options.member);

      let resultData;
      for (const stepNumber of Object.keys(options.steps)) {
        const step = options.steps[stepNumber];
        if (step.type === 'queryGetObject' || step.type === 'queryGetObjects') {
          let cached = null; 
          if(step.cache){
              try {
                cached = await redisManager.getCache(options.from + options.to + step.query);
              } catch (err) {
                logger.error(err);
                cached = null;
              }
              logger.debug('Step.cache: ', step.cache ? 'true' : 'false');
          }

          if (cached) {
            resultData = cached;
            logger.info("[CACHED COMPUTE]: Getting information from redis cache in githubGQLFetcher")
          } else {
            if(step.query){ //generic gql paginator config
              await getDataPaginated(step.query, options.token, step.paginatorConfig ? step.paginatorConfig : 'github-v1.0.0').then(data => {
                resultData = data;
                step.cache && redisManager.setCache(options.from + options.to + step.query, data);
              }).catch(err => {
                reject(err);
              });
            } else { // specific gql paginator config
              await getDataPaginated(step.paginatorCustomQueries, options.token, step.paginatorConfig ? step.paginatorConfig : 'github-v1.0.0').then(data => {
                resultData = data;
                step.cache && redisManager.setCache(options.from + options.to + step.query, data);
              }).catch(err => {
                reject(err);
              });
            }
          }
        } else if (step.type === 'objectGetSubObject' || step.type === 'objectGetSubObjects') {
          if (options.debug || step.debug) {
            logger.info('STEP DEBUG [' + stepNumber + ']: Step.location: ', step.location);
            logger.info('STEP DEBUG [' + stepNumber + ']: ResultData before getSubObject: ', JSON.stringify(resultData));
          }
          resultData = getSubObject(resultData, step.location);
          if (options.debug || step.debug) logger.info('STEP DEBUG [' + stepNumber + ']: ResultData after getSubObject: ', JSON.stringify(resultData));
        } else if (step.type === 'objectsFilterObject' || step.type === 'objectsFilterObjects') {
          if (options.debug || step.debug) {
            logger.info('STEP DEBUG [' + stepNumber + ']: Step.filters: ', step.filters);
            logger.info('STEP DEBUG [' + stepNumber + ']: ResultData before getMatches: ', JSON.stringify(resultData));
          }
          resultData = getMatches(resultData, step.filters);
          if (options.debug || step.debug) logger.info('STEP DEBUG [' + stepNumber + ']: ResultData after getMatches: ', JSON.stringify(resultData));
          if (step.type === 'objectsFilterObject') {
            switch (step.keep) {
              case 'first': resultData = resultData[0]; break;
              case 'last': resultData = resultData[resultData.length - 1]; break;
              case 'min': resultData = resultData.sort()[0]; break;
              case 'max': resultData = resultData.sort()[resultData.length - 1]; break;
              case 'sum': resultData = resultData.reduce((a, b) => a + b); break;
              case 'avg': resultData = resultData.reduce((a, b) => a + b) / resultData.length; break;
              default:
            }
          }
        } else if (step.type === 'runScript') {
          if (options.debug || step.debug) {
            logger.info('STEP DEBUG [' + stepNumber + ']: Step.script: ', step.script);
            logger.info('STEP DEBUG [' + stepNumber + ']: Step.variables: ', JSON.stringify({ ...step.variables, from: options.from, to: options.to }));
            logger.info('STEP DEBUG [' + stepNumber + ']: ResultData before runScript: ', JSON.stringify(resultData));
          }
          resultData = requireFromString(step.script).generic(resultData, { ...step.variables, from: options.from, to: options.to });
          if (options.debug || step.debug) logger.info('STEP DEBUG [' + stepNumber + ']: ResultData after runScript: ', JSON.stringify(resultData));
        }
      }
      resolve(resultData);
    } catch (err) {
      logger.error(err);
      reject(err);
    }
  });
};

// Require() file from string
function requireFromString (src, filename = 'default') {
  var Module = module.constructor;
  var m = new Module();
  m._compile(src, filename);
  return m.exports;
}

// Paginates github data to retrieve everything
async function getDataPaginated(queryOptions, token, paginatorConfig) {
    let result = await GQLPaginator(queryOptions, token, paginatorConfig); 
    return result
};

const getMatches = (objects, filters) => {
  try {
    const matches = [];

    for (const object of objects) {
      let matched = true;
      for (const filter of filters) {
        const splitted = filter.split('==');
        const filterObjectLocation = splitted[0].replace(/'/gm, '').replace(/ /gm, '');
        const filterMustMatch = splitted[1].split("'")[1];

        if (filterObjectLocation.includes('*any*')) {
          let matched2 = false;
          const splitted2 = filterObjectLocation.split('.*any*.');

          const subObject = getSubObject(object, splitted2[0])
          if(subObject !== undefined){
            for (const object2 of subObject) {
              if (getSubObject(object2, splitted2[1]) === filterMustMatch) {
                matched2 = true;
                break;
              }
            }
          }
          matched = matched2;
        } else if (getSubObject(object, filterObjectLocation) !== filterMustMatch) {
          matched = false;
        }

        if (!matched) {
          break;
        }
      }
      matched && matches.push(object);
    }
    return matches;
  } catch (err) {
    logger.error(err);
    return [];
  }
};

const getSubObject = (object, location) => {
  try {
    if (location.includes('.')) {
      const splitted = location.split('.')[0];
      const newObject = object[splitted];

      if (!newObject) {
        return undefined;
      } else {
        return getSubObject(newObject, location.split(splitted + '.')[1]);
      }
    } else {
      return object[location];
    }
  } catch (err) {
    logger.error(err);
    return undefined;
  }
};

const resolveSteps = (steps, repository, owner, member) => {
  steps = JSON.parse(JSON.stringify(steps));

  // Substitute query integrations
  Object.keys(steps).filter(stepKeyElement => ['queryGetObject', 'queryGetObjects'].includes(steps[stepKeyElement].type)).forEach(queryKey => {
    if(steps[queryKey].query)
      steps[queryKey].query = steps[queryKey].query.replace('%PROJECT.github.repository%', repository).replace('%PROJECT.github.repoOwner%', owner);
    else if(steps[queryKey].paginatorCustomQueries)
      steps[queryKey].paginatorCustomQueries.initialQuery = steps[queryKey].paginatorCustomQueries.initialQuery.replace('%PROJECT.github.repository%', repository).replace('%PROJECT.github.repoOwner%', owner);
  });

  logger.debug('Fetcher.getEventsFromJson: Performing GraphQL request to repository: ', owner + '/' + repository);

  // Substitute match filters with member
  if (member) {
    const memberRegex = /%MEMBER\.[a-zA-Z0-9.]+%/g;

    for (const stepKey of Object.keys(steps).filter(stepKeyElement => ['objectsFilterObject', 'objectsFilterObjects', 'runScript'].includes(steps[stepKeyElement].type))) {
      if (steps[stepKey].type === 'runScript') {
        // Substitute in the script code directly
        steps[stepKey].script = steps[stepKey].script.replace(/%MEMBER\.github\.username%/g, member.identities.filter(i => i.source === 'github')[0].username);
      } else {
        const newFilters = [];
        // For each filter with a regex match
        for (let filter of steps[stepKey].filters.filter(filterElement => memberRegex.test(filterElement))) {
          // For each regex match in the filter
          for (const regexMatch of filter.match(memberRegex)) {
            const splitted = regexMatch.replace(/%/g, '').replace('MEMBER.', '').split('.');
            const identity = member.identities.filter(e => e.source === splitted[0])[0];
            if (identity) {
              filter = filter.replace(regexMatch, identity[splitted[1]]);
            }
          }

          newFilters.push(filter);
        }

        // Replace substituted filters with the new filters and the non substituted ones
        steps[stepKey].filters = newFilters.concat(steps[stepKey].filters.filter(filterElement => !memberRegex.test(filterElement)));
      }
    }
  }

  return steps;
}

exports.getInfo = getInfo;
