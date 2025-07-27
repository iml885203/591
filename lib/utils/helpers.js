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

module.exports = {
  sleep,
  extractArrayFromElements
};