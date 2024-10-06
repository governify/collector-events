'use strict';

const fetcherUtils = require('./fetcherUtils');
const logger = require('governify-commons').getLogger().tag('fetcher-github');

const apiUrl = 'https://api.github.com';
const eventType = 'github';

const redisManager = require('./redisManager');

// Function who controls the script flow
const getInfo = (options) => {
  return new Promise((resolve, reject) => {
    getDataPaginated(apiUrl + options.endpoint, options.token, options.from, options.to).then((data) => {
      fetcherUtils.applyFilters(
        data,
        options.from,
        options.to,
        options.mustMatch,
        options.endpointType,
        eventType
      ).then((filteredData) => {
          resolve(filteredData);
      }).catch(err => reject(err));
    }).catch(err => {
      reject(err);
    });
  });
};

// Paginates github data to retrieve everything
const getDataPaginated = (url, token, from, to, page = 1) => {
  return new Promise(async (resolve, reject) => {
    let requestUrl = url;
    requestUrl += requestUrl.split('/').pop().includes('?') ? '&page=' + page : '?page=' + page;

    console.log("REQUEST URL: "+ requestUrl)
    let cached;
    try {
      cached = await redisManager.getCache(from + to + url);
    } catch (err) {
      logger.error(err);
      cached = null;
    }

    if (cached) {
      logger.info("[CACHED COMPUTE]: Getting information from redis cache in githubFetcher")
      resolve(cached); 
    } else {
      const requestConfig = token ? { Authorization: token } : {};
      fetcherUtils.requestWithHeaders(requestUrl, requestConfig).then((data) => {
        if (data) {
          logger.info('Requesting GitHub URL: ', requestUrl, '(Length: ', data.length, ')');
          if (data.length === 30 && page < 10) { // Returns 30 elements per page, so if we get less than 30, we are in the last page
            getDataPaginated(url, token, from, to, page + 1).then(recData => {
              resolve(data.concat(recData));
            }).catch((err) => { reject(err); });
          } else {
            redisManager.setCache(from + to + url, data);
            resolve(data);
          }
        } else if (typeof data[Symbol.iterator] !== 'function') { // If not iterable
          logger.error('Problem when requesting GH payload:\n', data);

          if (data.message === 'Not Found') {
            reject(new Error('GitHub project not found or unauthorized. URL: ' + requestUrl));
          } else {
            reject(new Error('Problem when requesting to GitHub. URL: ' + requestUrl));
          }
        }
      }).catch((err) => { reject(err); });
    }
  })
};

exports.getInfo = getInfo;
