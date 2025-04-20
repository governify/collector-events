'use strict';
const fetcherUtils = require('./fetcherUtils');
const logger = require('governify-commons').getLogger().tag('fetcher-lucidchain');

// const apiUrl = 'https://wizard.lucidchain.governify.io/api';
const apiUrl = 'http://localhost:3000';
const eventType = 'lucidchain';

// Function who controls the script flow
const getInfo = (options) => {
  return new Promise((resolve, reject) => {
    getData(apiUrl+options.endpoint, options.token).then((data) => {
        logger.info(JSON.stringify(data))
        if (options.endpointType === 'issuesPassedSLAPercentage') {
          if (typeof result === "string") {
            throw new Error(result);
          }
          resolve([{ issuesPassedSLAPercentage: result }]);
        } else if (options.endpointType === 'issuesPassedTTOPercentage') {
          let result = data;
          if (typeof result === "string") {
            throw new Error(result);
          }
          resolve([{ issuesPassedTTOPercentage: result }]);
        } else if (options.endpointType === 'issuesPassedTTRPercentage') {
          let result = data;
          if (typeof result === "string") {
            throw new Error(result);
          }
          resolve([{ issuesPassedTTRPercentage: result }]);
        } else if(options.endpointType === 'problematicOpenIssues'){
          if (typeof result === "string") {
            throw new Error(result);
          }
          resolve(data.issue_group);
        } else {
          resolve(data);
        }
      }).catch(err => {
        reject(err);
      });
    }).catch(err => {
      reject(err);
    });
};

const getData = async (url, token) => {  
    const requestConfig = token ? { Authorization: "Bearer " + token } : {};
    logger.debug(`Calling ${JSON.stringify(url)} lucid chain endpoint`)
    return await fetcherUtils.requestWithHeaders(url, requestConfig);
};

exports.getInfo = getInfo;
