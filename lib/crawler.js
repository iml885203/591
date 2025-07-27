/**
 * Core crawler logic for 591.com.tw - Pure data fetching and parsing
 */

const logger = require('./utils/logger');
const SearchUrl = require('./domain/SearchUrl');

const { parseRentals } = require('./parser');
const { fetchWithRetry, getDefaultHeaders } = require('./utils/http');

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
    logger.info(`Starting crawl for URL: ${url}`);
    
    // Validate URL
    if (!SearchUrl.isValid(url)) {
      throw new Error('Please provide a valid 591.com.tw URL');
    }

    // Fetch HTML content
    const response = await fetchWithRetry(url, {
      headers: getDefaultHeaders()
    }, axios, config);

    // Save HTML in production for debugging (optional)
    if (process.env.NODE_ENV === 'production' && process.env.SAVE_DEBUG_HTML === 'true') {
      try {
        const fs = require('fs');
        const path = require('path');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const debugDir = '/app/debug-html';
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir, { recursive: true });
        }
        const filename = `crawl-${timestamp}.html`;
        fs.writeFileSync(path.join(debugDir, filename), response.data);
        logger.info(`💾 Debug HTML saved: ${filename}`);
      } catch (saveError) {
        logger.warn(`⚠️  Failed to save debug HTML: ${saveError.message}`);
      }
    }

    // Parse rentals from HTML
    const rentals = parseRentals(response.data, cheerio);
    logger.info(`Found ${rentals.length} rentals`);
    
    return rentals;
    
  } catch (error) {
    logger.error(`Crawl error: ${error.message}`);
    throw error;
  }
};

module.exports = {
  crawl591
};