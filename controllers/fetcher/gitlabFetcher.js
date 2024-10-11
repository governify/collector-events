const fetcherUtils = require('./fetcherUtils');
const logger = require('governify-commons').getLogger().tag('fetcher-gitlab');

const apiUrl = 'https://gitlab.com/api/v4';
const eventType = 'gitlab';

const redisManager = require('./redisManager');

const ALL_REPOS_ENDPOINT_TYPES = ['newBranchesAllRepos', 'closedBranchesAllRepos', 'branchesUpdateRatioAllRepos'];

const getInfo = (options) => {
  return new Promise((resolve, reject) => {
    if (ALL_REPOS_ENDPOINT_TYPES.includes(options.endpointType)) {
      const promises = [];
      fetcherUtils.requestWithHeaders((options.gitlabApiBaseUrl || apiUrl) + '/projects', { 'PRIVATE-TOKEN': options.token }).then(data => {
        for (const project of data) {
          options.endpoint = options.endpoint.replace(/(\/projects\/[0-9]+\/)/, '/projects/' + project.id + '/');
          promises.push(getProjectInfo(options));
        }

        Promise.all(promises).then((response) => {
          if (options.endpointType === 'branchesUpdateRatioAllRepos') {
            let numberUpdatedBranches = 0;
            for (const value of response) {
              if (value.length > 0) {
                numberUpdatedBranches++;
              }
            }

            resolve([{ updateRatio: numberUpdatedBranches / response.length }]);
          } else if (options.endpointType === 'newBranchesAllRepos') {
            const result = [];
            for (const value of response) {
              if (value.length > 0) {
                result.push(value);
              }
            }

            resolve(result.flat());
          } else if (options.endpointType === 'closedBranchesAllRepos') {
            const result = [];
            for (const value of response) {
              if (value.length > 0) {
                result.push(value);
              }
            }

            resolve(result.flat());
          } else {
            resolve(response);
          }
        }).catch(err => {
          reject(err);
        });
      });
    } else {
      resolve(getProjectInfo(options));
    }
  });
};

const getProjectInfo = (options) => {
  return new Promise((resolve, reject) => {
    getDataPaginated((options.gitlabApiBaseUrl || apiUrl) + options.endpoint, options.token, options.from, options.to, options.noCache).then((data) => {
      fetcherUtils.applyFilters(
        data,
        options.from,
        options.to,
        options.mustMatch,
        options.endpointType,
        eventType
      ).then((filteredData) => {
        // TODO - Generalyze
        if (options.endpointType === 'closedMRFiles') {
          const result = [];
          const promises = [];

          for (const closedPR of filteredData) {
            const promise = new Promise((resolve, reject) => {
              try {
                getDataPaginated((options.redmineApiBaseUrl || apiUrl) + options.endpoint.split('?')[0] + '/' + closedPR.number + '/files', options.token, options.from, options.to, options.noCache).then(closedPRFiles => {
                  closedPRFiles[0].closed_at = closedPR.closed_at; // Add the date for the matches
                  result.push(closedPRFiles[0]);
                  resolve();
                }).catch(err => {
                  reject(err);
                });
              } catch (err) {
                reject(err);
              }
            });
            promises.push(promise);
          }

          Promise.all(promises).then(() => {
            let secondMustMatch = options.mustMatch;

            if (JSON.stringify(secondMustMatch).includes('%SECOND%')) {
              // Matching filter generation with only %SECOND% strings
              secondMustMatch = getSecondMustMatch(options.mustMatch);
              // Apply new filter
              fetcherUtils.applyFilters(
                result,
                options.from,
                options.to,
                secondMustMatch,
                options.endpointType,
                eventType
              ).then(finalResult => {
                resolve(finalResult);
              }).catch(err => reject(err));
            } else {
              resolve(result);
            }
          }).catch(err => {
            reject(err);
          });
        } else {
          resolve(filteredData);
        }
      }).catch(err => {
        reject(err);
      });
    }).catch(err => {
      reject(err);
    });
  });
};

const getDataPaginated = (url, token, from, to, noCache, page = 1) => {
  return new Promise(async (resolve, reject) => {
    let requestUrl = url;
    requestUrl += requestUrl.split('/').pop().includes('?') ? '&per_page=50&page=' + page : '?per_page=50&page=' + page;

    let cached;
    try {
      if (!noCache) cached = await redisManager.getCache(from + to + url);
    } catch (err) {
      logger.error(err);
      cached = null;
    }

    if (cached) {
      logger.info("[CACHED COMPUTE]: Getting information from redis cache in gitlabFetcher");
      resolve(cached);
    } else {
      const requestConfig = token ? { 'PRIVATE-TOKEN': token } : {};
      fetcherUtils.requestWithHeaders(requestUrl, requestConfig).then((originalData) => {
        let data = [];
        originalData.forEach(globject => {
          if (globject.push_data && globject.push_data.ref) globject.branch_name = globject.push_data.ref;
          data.push(globject);
        });
        if (data.length && data.length !== 0) {
          redisManager.setCache(from + to + url, data);
          getDataPaginated(url, token, from, to, noCache, page + 1).then(recData => {
            resolve(data.concat(recData));
          }).catch((err) => { reject(err); });
        } else if (typeof data[Symbol.iterator] !== 'function') { // If not iterable
          logger.error('Problem when requesting GH payload:\n', data);

          if (data.message === 'Not Found') {
            reject(new Error('GitLab project not found or unauthorized. URL: ' + requestUrl));
          } else {
            reject(new Error('Problem when requesting to GitLab. URL: ' + requestUrl));
          }
        } else {
          redisManager.setCache(from + to + url, []);
          resolve([]);
        }
      }).catch((err) => { reject(err); });
    }
  });
};

const getSecondMustMatch = (mustMatch) => {
  try {
    const copy = { ...mustMatch };
    for (const key of Object.keys(mustMatch)) {
      if (typeof copy[key] === typeof {}) {
        copy[key] = getSecondMustMatch(copy[key]);
        if (Object.keys(copy[key]).length === 0) {
          delete copy[key];
        }
      } else if (typeof copy[key] === typeof '') {
        if (copy[key].includes('%SECOND%')) {
          copy[key] = copy[key].split('%SECOND%')[1];
        } else {
          delete copy[key];
        }
      } else {
        delete copy[key];
      }
    }
    return copy;
  } catch (err) {
    logger.error(err);
    return {};
  }
};

exports.getInfo = getInfo;
