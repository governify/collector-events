'use strict';

const redisManager = require('./redisManager');
const logger = require('governify-commons').getLogger().tag('fetcher-gitea');
const fetcherUtils = require('./fetcherUtils');

const eventType = "gitea";
let storedBranches = []

const getInfo = async (options) => {
    try {
        let cached = null;
        try {
            cached = await redisManager.getCache(options.from + options.to + options.endpoint);
            if(cached){
                logger.info('[CACHED COMPUTE]: Getting information from redis cache in giteaFetcher', '(Length:', cached.length + ')');
                return cached;
            }
        } catch (err) {
            cached = null;
        }

        const requestConfig = options.token ? { Authorization: options.token } : {};

        if(options.endpointType === 'newBranches') {
            let page = 1;
            let pagedBranches = [];
            let allBranches = [];
            do {
                pagedBranches = await fetcherUtils.requestWithHeaders(options.giteaApiBaseUrl + options.endpoint + '?page=' + page + '&limit=50', requestConfig);
                allBranches = allBranches.concat(pagedBranches);
                page++;
            } while(pagedBranches.length === 50);
            if(storedBranches.length === 0){
                storedBranches = allBranches.map(branch => branch.name);
                return [];
            }
            const newBranches = allBranches.filter(branch => !storedBranches.includes(branch.name));
            storedBranches = allBranches.map(branch => branch.name);
            return newBranches;
        }
        
        const data = await fetcherUtils.requestWithHeaders(options.giteaApiBaseUrl + options.endpoint, requestConfig);
        const filteredData = await fetcherUtils.applyFilters(
            data,
            options.from,
            options.to,
            options.mustMatch,
            options.endpointType,
            eventType 
        );
        logger.info('Requesting Gitea URL:', options.giteaApiBaseUrl + options.endpoint, '(Length:', filteredData.length + ')');
        redisManager.setCache(options.from + options.to + options.endpoint, filteredData);
        return filteredData;
    } catch (err) {
        logger.error('Error fetching data from Gitea:', err);
        return []; 
    }
};

exports.getInfo = getInfo;