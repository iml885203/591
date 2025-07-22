/**
 * Crawl Service - Orchestrates crawling, property comparison, and notifications
 */

const { crawl591 } = require('./crawler');
const { 
  generateUrlKey, 
  logWithTimestamp, 
  getPropertyId 
} = require('./utils');
const { loadPreviousData, savePreviousData, getDataFilePath } = require('./storage');
const { sendDiscordNotifications, sendErrorNotification, extractDistanceInMeters } = require('./notification');

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
 * Add notification metadata to properties
 * @param {Array} allProperties - All properties
 * @param {Array} propertiesToNotify - Properties that will be notified
 * @param {boolean} noNotify - Whether notifications are disabled
 * @returns {Array} Properties with notification metadata
 */
const addNotificationMetadata = (allProperties, propertiesToNotify, noNotify) => {
  const distanceThreshold = parseInt(process.env.MRT_DISTANCE_THRESHOLD) || 800;
  const notifyIds = new Set(propertiesToNotify.map(p => getPropertyId(p)));
  
  return allProperties.map(property => {
    const willNotify = !noNotify && notifyIds.has(getPropertyId(property));
    const distanceInMeters = extractDistanceInMeters(property.metroValue);
    const isFarFromMRT = distanceInMeters && distanceInMeters > distanceThreshold;
    const isSilent = willNotify && isFarFromMRT;
    
    return {
      ...property,
      notification: {
        willNotify,
        isSilent,
        distanceFromMRT: distanceInMeters,
        distanceThreshold
      }
    };
  });
};

/**
 * Complete crawl service with notifications and metadata
 * @param {string} url - URL to crawl
 * @param {number|null} maxLatest - Max latest properties (null for new only mode)
 * @param {Object} options - Service options
 * @param {Object} dependencies - Injected dependencies
 * @returns {Promise<Object>} Crawl result with notification metadata
 */
const crawlWithNotifications = async (url, maxLatest = null, options = {}, dependencies = {}) => {
  const { noNotify = false } = options;
  const {
    axios = require('axios'),
    cheerio = require('cheerio'),
    fs = require('fs-extra'),
    config = {
      maxRetries: 3,
      retryDelay: 2000,
      notificationDelay: 1000,
      timeout: 30000
    }
  } = dependencies;

  try {
    // Crawl properties
    const allProperties = await crawl591(url, { axios, cheerio, config });
    
    // Get properties to notify
    const propertiesToNotify = await getPropertiesToNotify(allProperties, maxLatest, url, fs);
    
    // Add notification metadata to all properties
    const propertiesWithMetadata = addNotificationMetadata(allProperties, propertiesToNotify, noNotify);
    
    // Send notifications if needed
    if (propertiesToNotify.length > 0 && !noNotify) {
      const sampleCount = Math.min(3, propertiesToNotify.length);
      logWithTimestamp(`Sample properties (${sampleCount}): ${propertiesToNotify.slice(0, sampleCount).map(p => p.title).join(' | ')}`);
      
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      await sendDiscordNotifications(propertiesToNotify, url, webhookUrl, axios, config);
    } else if (propertiesToNotify.length > 0) {
      logWithTimestamp('Notifications disabled (--no-notify)');
    } else {
      logWithTimestamp('No new properties to notify');
    }
    
    return {
      properties: propertiesWithMetadata,
      summary: {
        totalProperties: allProperties.length,
        newProperties: propertiesToNotify.length,
        notificationsSent: !noNotify && propertiesToNotify.length > 0,
        notificationsDisabled: noNotify
      }
    };
    
  } catch (error) {
    logWithTimestamp(`Crawl service error: ${error.message}`, 'ERROR');
    
    // Send error notification to Discord
    if (!noNotify) {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      await sendErrorNotification(url, error.message, webhookUrl, axios || require('axios'));
    }
    
    throw error;
  }
};

module.exports = {
  crawlWithNotifications,
  findNewProperties,
  getPropertiesToNotify,
  addNotificationMetadata
};