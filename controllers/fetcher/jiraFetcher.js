'use strict';

const fetcherUtils = require('./fetcherUtils');
const logger = require('governify-commons').getLogger().tag('fetcher-jira');

const apiUrl = 'https://jira.atlassian.com/rest/api/latest';
const eventType = 'jira';

const redisManager = require('./redisManager');

// Function who controls the script flow
const getInfo = (options) => {
  return new Promise((resolve, reject) => {
    getDataPaginated((options.jiraApiBaseUrl || apiUrl) + options.endpoint, options.token, options.from, options.to, options.noCache).then((data) => {
      if(options.endpointType === 'issuesByAssigneeAndStatus'){
        data = data.filter(issue => issue.assigneeName === options.mustMatch.assigneeName && issue.statusName === options.mustMatch.statusName)
        resolve(data);
      } else if(options.endpointType === 'issuesDevelByAssigneeAndStatus'){
        data = data.filter(issue => issue.statusName === options.mustMatch.statusName)
        resolve(data);
      }
      
      fetcherUtils.applyFilters(
        data,
        options.from,
        options.to,
        options.mustMatch,
        options.endpointType,
        eventType
      ).then((filteredData) => {
        resolve(filteredData);
      }).catch(err => {
        reject(err);
      });
    }).catch(err => {
      reject(err);
    });
  });
};

const getDataPaginated = (url, token, from, to, noCache, offset = 0) => {
  return new Promise(async (resolve, reject) => {
    let requestUrl = url;
    requestUrl += requestUrl.split('/').pop().includes('?') ? '&maxResults=100&startAt=' + offset : '?maxResults=100&startAt=' + offset;

    let cached;
    try {
      if (!noCache) cached = await redisManager.getCache(from + to + url);
    } catch (err) {
      logger.error(err);
      cached = null;
    }

    if (cached) {
      logger.info("[CACHED COMPUTE]: Getting information from redis cache in jiraFetcher");
      resolve(cached);
    } else {
      fetcherUtils.requestWithHeaders(requestUrl, { Authorization: token }).then((response) => {
        const originalData = Object.values(response).pop(); // Result of the request
        let data = [];
        originalData.forEach(issue => {
          issue.assigneeName = issue.fields.assignee ? issue.fields.assignee.name : null;
          issue.statusName = issue.fields.status ? issue.fields.status.name : null;
          data.push(issue);
        });
        if (data.length && data.length !== 0) {
          redisManager.setCache(from + to + url, data);
          getDataPaginated(url, token, from, to, noCache, offset + data.length).then(recData => {
            resolve(data.concat(recData));
          }).catch((err) => { reject(err); });
        } else if (typeof data[Symbol.iterator] !== 'function') { // If not iterable
          logger.error('Problem when requesting Jira payload:\n', data);

          if (data.kind === 'error') {
            if (data.error.includes('The object you tried to access could not be found.')) {
              reject(new Error('Jira project not found. URL: ' + requestUrl));
            } else if (data.error === 'Authorization failure.') {
              reject(new Error('Unauthorized access to Jira project. URL: ' + requestUrl));
            } else {
              reject(new Error(data.error + ' URL: ' + requestUrl));
            }
          } else {
            reject(new Error('Jira unknown problem. URL: ' + requestUrl));
          }
        } else {
          redisManager.setCache(from + to + url, []);
          resolve([]);
        }
      }).catch(err => reject(err));
    }
  });
};

exports.getInfo = getInfo;
