/**
 * Utility functions for the 591 crawler
 */

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the specified time
 */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Extract an array of values from DOM elements using CSS selector
 * @param {Object} $el - Cheerio element
 * @param {string} selector - CSS selector
 * @param {string|null} attr - Attribute name to extract, null for text content
 * @param {Function} $ - Cheerio instance
 * @returns {Array} Array of extracted values
 */
const extractArrayFromElements = ($el, selector, attr = null, $ = null) => {
  const items = [];
  $el.find(selector).each((i, element) => {
    const value = attr ? $(element).attr(attr) : $(element).text().trim();
    if (value) items.push(value);
  });
  return items;
};

/**
 * Generate a unique identifier for a property
 * @param {Object} property - Property object
 * @returns {string} Unique identifier
 */
const getPropertyId = (property) => {
  // Use link as unique identifier, or create one from title + metro
  if (property.link) {
    const match = property.link.match(/\/(\d+)/);
    if (match) return match[1];
  }
  return `${property.title}-${property.metroValue}`.replace(/\s+/g, '-');
};

/**
 * Validate if URL is a valid 591.com.tw URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid 591.com.tw URL
 */
const isValid591Url = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('591.com.tw') || url.includes('sale.591.com.tw');
};

/**
 * Generate URL key for data storage
 * @param {string} url - Original URL
 * @returns {string} Base64 encoded URL key (first 20 chars)
 */
const generateUrlKey = (url) => {
  return Buffer.from(url).toString('base64').slice(0, 20);
};


/**
 * Extract distance in meters from metro value string
 * @param {string} metroValue - Metro distance value from 591.com.tw
 * @returns {number|null} Distance in meters or null if not parseable
 */
const extractDistanceInMeters = (metroValue) => {
  if (!metroValue) return null;
  
  const meterMatch = metroValue.match(/(\d+)\s*公尺/);
  if (meterMatch) {
    return parseInt(meterMatch[1]);
  }
  
  // Convert minutes to approximate meters (assuming 80m/min walking speed)
  const minuteMatch = metroValue.match(/(\d+)\s*分鐘/);
  if (minuteMatch) {
    return parseInt(minuteMatch[1]) * 80;
  }
  
  return null;
};

/**
 * Log message with timestamp
 * @param {string} message - Message to log
 * @param {string} level - Log level (INFO, WARN, ERROR)
 */
const logWithTimestamp = (message, level = 'INFO') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
};

module.exports = {
  sleep,
  extractArrayFromElements,
  getPropertyId,
  isValid591Url,
  generateUrlKey,
  extractDistanceInMeters,
  logWithTimestamp
};