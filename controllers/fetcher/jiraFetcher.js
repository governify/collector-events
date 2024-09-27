'use strict';

const fetcherUtils = require('./fetcherUtils');
const logger = require('governify-commons').getLogger().tag('fetcher-jira');

const apiUrl = 'https://jira.atlassian.com/rest/api/latest';
const eventType = 'jira';

let requestCache = {};

// Function who controls the script flow
const getInfo = (options) => {
  return new Promise((resolve, reject) => {
    getDataPaginated((options.jiraApiBaseUrl || apiUrl) + options.endpoint, options.token).then((data) => {
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

const getDataPaginated = (url, token, offset = 0) => {
  return new Promise((resolve, reject) => {
    let requestUrl = url;
    requestUrl += requestUrl.split('/').pop().includes('?') ? '&maxResults=100&startAt=' + offset : '?maxResults=100&startAt=' + offset;

    /*const cached = requestCache[requestUrl];

    if (cached !== undefined) {
      if (cached.length !== 0) {
        getDataPaginated(url, token, offset + cached.length).then(recData => {
          resolve(cached.concat(recData));
        }).catch((err) => { reject(err); });
      } else { resolve([]); }
    } else {*/
      fetcherUtils.requestWithHeaders(requestUrl, { Authorization: token }).then((response) => {
        const originalData = Object.values(response).pop(); // Result of the request
        let data = [];
        originalData.forEach(issue => {
          issue.assigneeName = issue.fields.assignee ? issue.fields.assignee.name : null;
          issue.statusName = issue.fields.status ? issue.fields.status.name : null;
          data.push(issue);
        });
        if (data.length && data.length !== 0) {
          requestCache = {};
          requestCache[requestUrl] = data;
          getDataPaginated(url, token, offset + data.length).then(recData => {
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
          requestCache[requestUrl] = [];
          resolve([]);
        }
      }).catch(err => reject(err));
    //}
  });
};

exports.getInfo = getInfo;
