'use strict';

const redisManager = require('./redisManager');
const logger = require('governify-commons').getLogger().tag('fetcher-gitea');
const fetcherUtils = require('./fetcherUtils');

const eventType = "gitea";
let storedBranches = [];

const getInfo = async (options) => {
    try {
        let cached = null;
        try {
            cached = await redisManager.getCache(options.from + options.to + options.endpoint);
            if (cached) {
                logger.info('[CACHED COMPUTE]: Getting information from redis cache in giteaFetcher', '(Length:', cached.length + ')');
                return cached;
            }
        } catch (err) {
            cached = null;
        }

        const requestConfig = options.token ? { Authorization: options.token } : {};

        let allData = [];
        let page = 1;
        let pageSize = 50;
        let pagedData = [];

        do {
            let url = `${options.giteaApiBaseUrl}${options.endpoint}?page=${page}&limit=${pageSize}`;
            pagedData = await fetcherUtils.requestWithHeaders(url, requestConfig);
            allData = allData.concat(pagedData);
            page++;

            if(options.endpointType === 'commits'){
                if(pagedData[pagedData.length - 1].created < options.from)
                    break;
            }
        } while (pagedData.length === pageSize); // Continua hasta que no haya más datos

        if (options.endpointType === 'newBranches') {
            if (storedBranches.length === 0) {
                storedBranches = allData.map(branch => branch.name);
                return [];
            }
            const newBranches = allData.filter(branch => !storedBranches.includes(branch.name));
            storedBranches = allData.map(branch => branch.name);
            return newBranches;
        } if(options.endpointType === 'allBranches') {
            return allData;
        }

        const filteredData = await fetcherUtils.applyFilters(
            allData,
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
