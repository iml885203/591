/**
 * Core crawler logic for 591.com.tw
 */

const { 
  isValid591Url, 
  generateUrlKey, 
  logWithTimestamp, 
  getPropertyId 
} = require('./utils');

const { parseProperties } = require('./parser');
const { loadPreviousData, savePreviousData, getDataFilePath } = require('./storage');
const { sendDiscordNotifications, sendErrorNotification } = require('./notification');
const { fetchWithRetry, getDefaultHeaders } = require('./fetcher');

/**
 * Filter properties to find new ones compared to previous crawl
 * @param {Array} currentProperties - Current properties
 * @param {Array} previousProperties - Previous properties
 * @returns {Array} New properties
 */
const findNewProperties = (currentProperties, previousProperties) => {
  const previousIds = new Set(previousProperties.map(p => getPropertyId(p)));
  return currentProperties.filter(prop => !previousIds.has(getPropertyId(prop)));
};

/**
 * Get properties to notify based on mode (latest N or new only)
 * @param {Array} properties - All properties
 * @param {number|null} maxLatest - Max latest properties to get (null for new only mode)
 * @param {string} url - Original URL for key generation
 * @param {Object} fs - File system module
 * @returns {Promise<Array>} Properties to notify
 */
const getPropertiesToNotify = async (properties, maxLatest, url, fs) => {
  if (maxLatest) {
    // If maxLatest is specified, just take the latest N properties
    const propertiesToNotify = properties.slice(0, maxLatest);
    logWithTimestamp(`Will notify latest ${propertiesToNotify.length} properties`);
    return propertiesToNotify;
  } else {
    // Load previous data and compare
    const dataFile = getDataFilePath();
    const previousData = await loadPreviousData(dataFile, fs);
    const urlKey = generateUrlKey(url);
    const previousProperties = previousData[urlKey] || [];
    
    // Find new properties
    const propertiesToNotify = findNewProperties(properties, previousProperties);
    
    logWithTimestamp(`Previous properties: ${previousProperties.length}`);
    logWithTimestamp(`New properties: ${propertiesToNotify.length}`);
    
    // Save current data for next run
    previousData[urlKey] = properties;
    await savePreviousData(dataFile, previousData, fs);
    
    return propertiesToNotify;
  }
};

/**
 * Main crawl function for 591.com.tw
 * @param {string} url - URL to crawl
 * @param {number|null} maxLatest - Max latest properties (null for new only mode)
 * @param {Object} dependencies - Injected dependencies
 * @returns {Promise<Array>} All found properties
 */
const crawl591 = async (url, maxLatest = null, dependencies = {}) => {
  const {
    axios = require('axios'),
    cheerio = require('cheerio'),
    fs = require('fs-extra'),
    noNotify = false,
    config = {
      maxRetries: 3,
      retryDelay: 2000,
      notificationDelay: 1000,
      timeout: 30000
    }
  } = dependencies;

  try {
    logWithTimestamp(`Starting crawl for URL: ${url}`);
    
    // Validate URL
    if (!isValid591Url(url)) {
      throw new Error('Please provide a valid 591.com.tw URL');
    }

    // Fetch HTML content
    const response = await fetchWithRetry(url, {
      headers: getDefaultHeaders()
    }, axios, config);

    // Parse properties from HTML
    const properties = parseProperties(response.data, cheerio);
    logWithTimestamp(`Found ${properties.length} properties`);
    
    // Get properties to notify
    const propertiesToNotify = await getPropertiesToNotify(properties, maxLatest, url, fs);
    
    if (propertiesToNotify.length > 0) {
      // Debug: Show sample properties
      const sampleCount = Math.min(3, propertiesToNotify.length);
      logWithTimestamp(`Sample properties (${sampleCount}): ${propertiesToNotify.slice(0, sampleCount).map(p => p.title).join(' | ')}`);
      
      // Send Discord notifications (unless disabled)
      if (!noNotify) {
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        await sendDiscordNotifications(propertiesToNotify, url, webhookUrl, axios, config);
      } else {
        logWithTimestamp('Notifications disabled (--no-notify)');
      }
    } else {
      logWithTimestamp('No new properties to notify');
    }
    
    return properties;
    
  } catch (error) {
    logWithTimestamp(`Crawl error: ${error.message}`, 'ERROR');
    
    // Send error notification to Discord
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    await sendErrorNotification(url, error.message, webhookUrl, axios || require('axios'));
    
    throw error;
  }
};

module.exports = {
  crawl591,
  findNewProperties,
  getPropertiesToNotify
};