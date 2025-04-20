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
        if( isNumberType( options.endpointType) ){
          logger.fatal(JSON.stringify('YES'))
          const result = data.issue_group
          if (typeof result === "string") {
            throw new Error(result);
          }
          resolve(result)
        } 
        else {
          logger.fatal(JSON.stringify('NO'))
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

const isNumberType = (endpointType) => {
  const res = endpointType === 'issuesPassingSLA' || endpointType === 'issuesPassingTTO' || endpointType === 'issuesPassingTTR'  || endpointType === 'problematicOpenIssues' || endpointType === 'totalIssues'  
  return res;
}

exports.getInfo = getInfo;
