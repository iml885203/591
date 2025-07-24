/**
 * Core crawler logic for 591.com.tw - Pure data fetching and parsing
 */

const { 
  logWithTimestamp 
} = require('./utils');
const SearchUrl = require('./domain/SearchUrl');

const { parseRentals } = require('./parser');
const { fetchWithRetry, getDefaultHeaders } = require('./fetcher');

/**
 * Main crawl function for 591.com.tw - Only handles data fetching and parsing
 * @param {string} url - URL to crawl
 * @param {Object} dependencies - Injected dependencies
 * @returns {Promise<Array>} All found rentals
 */
const crawl591 = async (url, dependencies = {}) => {
  const {
    axios = require('axios'),
    cheerio = require('cheerio'),
    config = {
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 30000
    }
  } = dependencies;

  try {
    logWithTimestamp(`Starting crawl for URL: ${url}`);
    
    // Validate URL
    if (!SearchUrl.isValid(url)) {
      throw new Error('Please provide a valid 591.com.tw URL');
    }

    // Fetch HTML content
    const response = await fetchWithRetry(url, {
      headers: getDefaultHeaders()
    }, axios, config);

    // Parse rentals from HTML
    const rentals = parseRentals(response.data, cheerio);
    logWithTimestamp(`Found ${rentals.length} rentals`);
    
    return rentals;
    
  } catch (error) {
    logWithTimestamp(`Crawl error: ${error.message}`, 'ERROR');
    throw error;
  }
};

module.exports = {
  crawl591
};