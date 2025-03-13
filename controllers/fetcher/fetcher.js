'use strict';

const logger = require('governify-commons').getLogger().tag('fetcher');
const githubFetcher = require('./githubFetcher');
const githubCIFetcher = require('./githubCIFetcher');
const gitlabFetcher = require('./gitlabFetcher');
const githubGQLFetcher = require('./githubGQLFetcher');
const ghwrapperFetcher = require('./ghwrapperFetcher');
const pivotalFetcher = require('./pivotalFetcher');
const herokuFetcher = require('./herokuFetcher');
const travisFetcher = require('./travisFetcher');
const redmineFetcher = require('./redmineFetcher');
const jiraFetcher = require('./jiraFetcher');
const codeclimateFetcher = require('./codeclimateFetcher');
const giteaFetcher = require('./giteaFetcher');
const sourcesManager = require('../sourcesManager/sourcesManager');

// Function who controls the flow of the app
const compute = (dsl, from, to, integrations, authKeys, member) => {
  return new Promise((resolve, reject) => {
    try {
      const element = dsl.element;
      const metricType = typeof element === typeof '' ? element : Object.keys(element)[0];

      let evidences;

      const mainEvents = {};
      const mainEventType = Object.keys(dsl.event)[0];

      // First we obtain The main events
      getEventsFromJson(dsl.event, from, to, { ...integrations }, authKeys, member).then((events) => {
        mainEvents[mainEventType] = events;
        evidences = events;

        logger.debug('Fetcher.compute: Evidences obtained: ', JSON.stringify(evidences, null, 2));

        // We call getMetric to obtain the metric and evidences depending on the type
        getMetricAndEvidences(dsl, from, to, { ...integrations }, { ...mainEvents }, mainEventType, [...evidences], metricType, authKeys, member, dsl.event).then(result => {
          resolve(result);
        }).catch(err => {
          reject(err);
        });
      }).catch((err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

// Function that return a metric and evidences depending on the metric type
const getMetricAndEvidences = (dsl, from, to, integrations, mainEvents, mainEventType, originalEvidences, metricType, authKeys, member, mainEventObject) => {
  return new Promise((resolve, reject) => {
    try {
      let metric;
      let evidences = originalEvidences;

      if (metricType === 'number') {
        metric = mainEvents[mainEventType].length;
        resolve({ metric: metric, evidences: evidences });
      } else if (metricType === 'percentage' || metricType === 'count') {
        const percentageType = Object.keys(dsl.element[metricType])[0];

        let percentageNum;

        if (percentageType === 'related') {
          const relatedObject = dsl.element[metricType].related;
          const window = relatedObject.window ? relatedObject.window : 86400 * 365 * 4; // 4 years window if not stated
          const secondaryEventFrom = new Date(Date.parse(from) - (window * 1000)).toISOString();
          const secondaryEventTo = new Date(Date.parse(to) + (window * 1000)).toISOString();

          getEventMatches(relatedObject, mainEvents, Object.keys(dsl.event[mainEventType])[0], secondaryEventFrom, secondaryEventTo, { ...integrations }, authKeys, member, mainEventObject).then((eventMatches) => {
            percentageNum = eventMatches.length;
            evidences = eventMatches;
            if (metricType === 'percentage') {
              metric = percentageNum / mainEvents[mainEventType].length * 100;
            } else if (metricType === 'count') {
              if (mainEvents[mainEventType].length === 0) {
                metric = NaN;
              } else {
                metric = percentageNum;
              }
            }
            resolve({ metric: metric, evidences: evidences });
          }).catch((err) => {
            reject(err);
          });
        } /* else if (percentageType === 'event') {
          getEventsFromJson(dsl.element[metricType].event, from, to, { ...integrations }, authKeys, member).then((events) => {
            percentageNum = events.length;
            if (metricType === 'percentage') {
              metric = percentageNum / mainEvents[mainEventType].length * 100;
            } else if (metricType === 'count') {
              if (mainEvents[mainEventType].length === 0) {
                metric = NaN;
              } else {
                metric = percentageNum;
              }
            }
            resolve({ metric: metric, evidences: evidences });
          }).catch((err) => {
            reject(err);
          });
        } */
      } else if (metricType === 'value') {
        const values = [];

        // We extract the values for all the elements
        for (const item of mainEvents[mainEventType]) {
          try {
            const splitValue = dsl.element.value.parameter.split('.');
            let value = item;

            for (let i = 0; i < splitValue.length; i++) {
              value = value[splitValue[i]];
            }

            if (value === undefined) {
              logger.error('Fetcher.compute: Undefined value (', dsl.element.value.parameter, ') for item:\n', item);
            } else {
              values.push(value);
            }
          } catch (err) {
            logger.error('Fetcher.compute: Could not extract value (', dsl.element.value.parameter, ') from item:\n', item);
          }
        }

        // We return depending on the return field
        if (values.length === 0) {
          if (dsl.element.value.traceback) { // Should return always a value due to guarantee division
            metric = 0;
          } else {
            metric = NaN;
          }
        } else {
          switch (dsl.element.value.return) {
            case 'avg':
              metric = values.reduce((a, b) => a + b, 0) / values.length || 0;
              break;
            case 'max':
              metric = Math.max(...values);
              break;
            case 'min':
              metric = Math.min(...values);
              break;
            case 'newest':
              metric = values[0];
              break;
            case 'oldest':
              metric = values.pop();
              break;
            default:
          }
        }

        resolve({ metric: metric, evidences: evidences });
      } else if (metricType === 'stdev') {
        getPeriodBoundaries(from, to, dsl.element.stdev.period).then((periodBoundaries) => {
          const resultArray = new Array(periodBoundaries.length - 1).fill(0);

          // Get distribution of events with the periods boundaries
          for (const event of mainEvents[mainEventType]) {
            const mainEventDate = Date.parse(sourcesManager.getEventDate(mainEventType, Object.keys(dsl.event[mainEventType])[0], event));

            for (const [i, boundary] of periodBoundaries.entries()) {
              if (mainEventDate < boundary) {
                resultArray[i - 1] += 1;
                break;
              }
            }
          }

          // Calculate standard deviation and resolve
          const mean = resultArray.reduce((a, b) => a + b, 0) / resultArray.length || 0;
          const variance = resultArray.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / resultArray.length || 0;
          metric = Math.sqrt(variance);

          resolve({ metric: metric, evidences: evidences });
        }).catch(err => {
          reject(err);
        });
      } else {
        reject(new Error('Invalid element metric type.'));
      }
    } catch (err) {
      reject(err);
    }
  });
};

// From a "specified related json" finds the matches of the events based on a time window
const getEventMatches = (relatedObject, mainEventsObject, mainEndpointType, from, to, integrations, authKeys, member, mainEventObject) => {
  return new Promise((resolve, reject) => {
    try {
      const relatedKeys = Object.keys(relatedObject);

      const window = relatedObject.window;
      if (window !== undefined) { relatedKeys.splice(relatedKeys.indexOf('window'), 1); } // Remove window from the keys

      if (relatedKeys.length !== 1) {
        reject(new Error('Too many arguments in related (expected 2: {api} and window)'));
      } else {
        const secondaryEventType = relatedKeys[0];
        const jsonForFunction = {};
        jsonForFunction[secondaryEventType] = relatedObject[secondaryEventType];

        getEventsFromJson(jsonForFunction, from, to, integrations, authKeys, member).then(secondaryEvents => {
          const mainEventType = Object.keys(mainEventsObject)[0];
          var mainEvents = mainEventsObject[mainEventType];

          findMatches(mainEvents, mainEventType, mainEndpointType, secondaryEvents, secondaryEventType, Object.keys(relatedObject[secondaryEventType])[0], relatedObject, mainEventObject).then(foundMatches => {
            resolve(foundMatches);
          }).catch(err => {
            reject(err);
          });
        }).catch((err) => {
          reject(err);
        });
      }
    } catch (err) {
      reject(err);
    }
  });
};

// Function that gets the events from a given json object
const getEventsFromJson = (json, from, to, integrations, authKeys, member) => {
  return new Promise((resolve, reject) => {
    try {
      const eventType = Object.keys(json)[0];
      const endpointType = Object.keys(json[eventType])[0];
      logger.info('Calculating events for:', eventType, endpointType);
      
      if (endpointType === 'custom') {
        const customOptions = {
          from: from,
          to: to,
          steps: json[eventType].custom.steps
        }
        switch(json[eventType].custom.type) {
          case 'graphQL':
            customOptions.token = generateToken(integrations.github.apiKey, authKeys.github.getKey(), '');
            customOptions.repository = integrations.github.repository;
            customOptions.owner= integrations.github.repoOwner;
            customOptions.member= member;
            githubGQLFetcher
            .getInfo(customOptions)
            .then((data) => {
              resolve(data);
            }).catch(err => {
              reject(err);
            });
            break;
        }
      } else {
        // Endpoint generation from endpoints.json
        const endpoint = sourcesManager.getEndpoint(eventType, endpointType, integrations);
        if (endpoint === undefined) {
          reject(new Error('There was a problem getting the endpoint.'));
        } else {
          // Replace each %% needed to be replaced with an integration
          const mustMatch = sourcesManager.getMustMatch(json[eventType][endpointType], integrations, member);
          
          if (mustMatch === undefined) {
            reject(new Error('There was a problem getting the mustMatch.'));
          } else {
            const options = {
              from: from,
              to: to,
              endpoint: endpoint,
              endpointType: endpointType,
              mustMatch: mustMatch
            }
            
            switch (eventType) {
              case 'pivotal':
                options.token = generateToken(integrations.pivotal.apiKey, authKeys.pivotal.getKey(), '');
                pivotalFetcher
                  .getInfo(options)
                  .then((data) => {
                    resolve(data);
                  }).catch(err => {
                    reject(err);
                  });
                break;
              case 'github':
                options.token =  generateToken(integrations.github.apiKey, authKeys.github.getKey(), 'token ');
                githubFetcher
                  .getInfo(options)
                  .then((data) => {
                    resolve(data);
                  }).catch(err => {
                    reject(err);
                  });
                break;
              case 'githubCI':
                options.token =  generateToken(integrations.github.apiKey, authKeys.github.getKey(), 'token ');
                githubCIFetcher
                  .getInfo(options)
                  .then((data) => {
                    resolve(data);
                  }).catch(err => {
                    reject(err);
                  });
                break;
              case 'gitlab':
                options.token = generateToken(integrations.gitlab.apiKey, authKeys.gitlab.getKey(), '');
                options.gitlabApiBaseUrl = integrations.gitlab.gitlabApiBaseUrl;
                options.noCache = json['gitlab']['noCache'];
                gitlabFetcher
                  .getInfo(options)
                  .then((data) => {
                    resolve(data);
                  }).catch(err => {
                    reject(err);
                  });
                break;
              case 'ghwrapper':
                ghwrapperFetcher
                  .getInfo(options)
                  .then((data) => {
                    resolve(data);
                  }).catch(err => {
                    reject(err);
                  });
                break;
              case 'heroku':
                options.token = generateToken(integrations.heroku.apiKey, authKeys.heroku.getKey(), 'Bearer ');
                herokuFetcher
                  .getInfo(options)
                  .then((data) => {
                    resolve(data);
                  }).catch(err => {
                    reject(err);
                  });
                break;
              case 'travis':
                options.token = generateToken(integrations.travis.apiKey, endpointType.includes('private') ? authKeys.travis_private.getKey() : authKeys.travis_public.getKey(), 'token ');
                options.public = endpointType.split('_')[1] === 'public';
                travisFetcher
                  .getInfo(options)
                  .then((data) => {
                    resolve(data);
                  }).catch(err => {
                    reject(err);
                  });
                break;
              case 'codeclimate':
                options.token = generateToken(integrations.codeclimate.apikey, authKeys.codeclimate.getKey(), 'Token token=');
                options.githubSlug = integrations.github.repoOwner + '/' + integrations.github.repository;
                codeclimateFetcher
                  .getInfo(options)
                  .then((data) => {
                    resolve(data);
                  }).catch(err => {
                    reject(err);
                  });
                break;
              case 'redmine':
                options.redmineApiBaseUrl = integrations.redmine.redmineApiBaseUrl;
                options.token = generateToken(integrations.redmine.apiKey, authKeys.redmine.getKey(), '');
                redmineFetcher
                  .getInfo(options)
                  .then((data) => {
                    resolve(data);
                  }).catch(err => {
                    reject(err);
                  });
                break;
              case 'jira':
                options.jiraApiBaseUrl = integrations.jira.jiraApiBaseUrl;
                options.token = generateToken(integrations.jira.apiKey, authKeys.jira.getKey(), '');
                options.noCache = json['jira']['noCache'];
                jiraFetcher
                  .getInfo(options)
                  .then((data) => {
                    resolve(data);
                  }).catch(err => {
                    reject(err);
                  });
                break;
              case 'gitea':
                options.giteaApiBaseUrl = integrations.gitea.giteaApiBaseUrl;
                options.token = generateToken(integrations.gitea.apiKey, authKeys.gitea.getKey(), '');
                options.owner = integrations.gitea.repoOwner;
                options.repository = integrations.gitea.repository;
                giteaFetcher
                  .getInfo(options)
                  .then((data) => {
                    resolve(data);
                  }).catch(err => {
                    reject(err);
                  });
                break;
            }
          }
        }
      }
    } catch (err) {
      reject(err);
    }
  });
};

const generateToken = (primary, secondary, prefix) => {
  try {
    let result = '';

    if (primary) {
      result = prefix + primary;
    } else if (secondary) {
      result = prefix + secondary;
    }

    return result;
  } catch (err) {
    logger.error('fetcher.generateToken:', err.message);
    return '';
  }
};

const findMatches = (mainEvents, mainEventType, mainEndpointType, secondaryEvents, secondaryEventType, secondaryEndpointType, relatedObject, mainEventObject) => {
  return new Promise((resolve, reject) => {
    try {
      const matches = [];

      for (const mainEvent of mainEvents) {
        for (const secondaryEvent of secondaryEvents) {
          // Get event dates
          let mainEventDate = Date.parse(sourcesManager.getEventDate(mainEventType, mainEndpointType, mainEvent));
          let secondaryEventDate = Date.parse(sourcesManager.getEventDate(secondaryEventType, secondaryEndpointType, secondaryEvent));
          // if (isNaN(mainEventDate)) { logger.error('No payload date for this API (' + mainEventType, mainEndpointType + ')'); }
          // if (isNaN(secondaryEventDate)) { logger.error('No payload date for this API (' + secondaryEventType + ')'); }

          // No Date problem
          isNaN(mainEventDate) && (mainEventDate = Date.now());
          isNaN(secondaryEventDate) && (secondaryEventDate = Date.now());

          // Match filters
          const mainEventDSL = mainEventObject[mainEventType][Object.keys(mainEventObject[mainEventType])[0]];
          const secondaryEventDSL = relatedObject[secondaryEventType][Object.keys(relatedObject[secondaryEventType])[0]];

          const window = relatedObject.window ? relatedObject.window : 86400 * 365 * 10; // 10 years window if not stated (undefined window)
          if ((Math.abs(mainEventDate - secondaryEventDate) / 1000) < window && matchBinding(mainEvent, secondaryEvent, secondaryEventDSL) && matchBinding(secondaryEvent, mainEvent, mainEventDSL)) {
            matches.push([mainEvent, secondaryEvent]);
          }

          if (matches.length > 0) { break; }
        }
        if (matches.length > 0) { break; }
      }

      if (matches.length > 0) {
        const trimmedMainEvents = [...mainEvents];
        const trimmedSecondaryEvents = [...secondaryEvents];

        trimmedMainEvents.splice(mainEvents.indexOf(matches[0][0]), 1);
        trimmedSecondaryEvents.splice(secondaryEvents.indexOf(matches[0][1]), 1);

        findMatches(trimmedMainEvents, mainEventType, mainEndpointType, trimmedSecondaryEvents, secondaryEventType, secondaryEndpointType, relatedObject, mainEventObject).then(newMatches => {
          resolve(matches.concat(newMatches));
        }).catch(err => reject(err));
      } else {
        resolve(matches);
      }
    } catch (err) {
      reject(err);
    }
  });
};

const matchBinding = (mainEvent, secondaryEvent, relatedObject) => {
  try {
    // First we find the bindings in the relatedObject
    const bindings = findBindingElement(relatedObject);
    // Now we identify each binding type and try to match
    let res = true;

    for (const binding of bindings) {
      const bindingType = binding.element.split('(')[0].split('#')[1];
      const bindingProperty = binding.element.split('(')[1].split(')')[0];

      // We get the values
      // Iterative extraction of event date based on the endpoint payloadDate configuration
      let mainEventValue = { ...mainEvent };

      for (const splitItem of bindingProperty.split('.')) {
        mainEventValue = mainEventValue[splitItem];
      }

      let secondaryEventValue = { ...secondaryEvent };

      for (const splitItem of binding.location.split('.')) {
        secondaryEventValue = secondaryEventValue[splitItem];
      }

      // Lastly we check if it matches
      if (bindingType === 'CONTAINS') {
        if (!secondaryEventValue.includes(mainEventValue)) {
          res = false;
        }
      } else if (bindingType === 'CONTAINED') {
        if (!mainEventValue.includes(secondaryEventValue)) {
          res = false;
        }
      } else if (bindingType === 'EQUALS') {
        if (mainEventValue !== secondaryEventValue) {
          res = false;
        }
      } else {
        logger.error('fetcher.matchBinding: Unknown binding type:', bindingType);
        res = false;
      }
    }
    return res;
  } catch (err) {
    logger.error('fetcher.matchBinding: Failed matching bindings:\n', err);
    return false;
  }
};

const findBindingElement = (element, location = '') => {
  try {
    if (typeof element === typeof {}) {
      let result = [];
      for (const key of Object.keys(element)) {
        result = result.concat(findBindingElement(element[key], location === '' ? key : location + '.' + key));
      }
      return result;
    } else if (typeof element === typeof '') {
      if (element.match(/^#.*#$/g) !== null) {
        return [{ element: element, location: location }];
      }
    }

    return [];
  } catch (err) {
    logger.error('fetcher.findBindingElement failed:\n', err);
    return [];
  }
};

const getPeriodBoundaries = (initial, end, windowPeriod) => {
  return new Promise((resolve, reject) => {
    try {
      // Translate period string to actual days and obtain number of periods
      const periodLengths = {
        hourly: 1,
        daily: 24,
        weekly: 7 * 24,
        biweekly: 14 * 24,
        monthly: 30 * 24,
        bimonthly: 60 * 24
      };
      const periodLength = periodLengths[windowPeriod];
      if (periodLength === undefined) { reject(new Error('metric.element.stdev.period must be within these: hourly, daily, weekly, biweekly, monthly, bimonthly.')); }

      // Obtain periods boundaries
      const periodBoundaries = [];

      const initialTS = Date.parse(initial);
      const endTS = Date.parse(end);
      periodBoundaries.push(initialTS);

      let keepGoing = true;
      let actualTS = initialTS;
      while (keepGoing) {
        actualTS = actualTS + periodLength * 60 * 60 * 1000;
        if (actualTS > endTS) {
          actualTS = endTS;
          keepGoing = false;
        }
        periodBoundaries.push(actualTS);
      }

      resolve(periodBoundaries);
    } catch (err) {
      reject(err);
    }
  });
};

exports.compute = compute;
