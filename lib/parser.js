/**
 * HTML parsing functions for 591.com.tw
 */

const { extractArrayFromElements } = require('./utils');

/**
 * Parse a single property element from 591.com.tw HTML
 * @param {Object} $el - Cheerio element representing a property
 * @param {Function} $ - Cheerio instance
 * @returns {Object|null} Parsed property object or null if invalid
 */
const parseProperty = ($el, $) => {
  const titleElement = $el.find('.item-info-title a');
  const title = titleElement.text().trim();
  
  // Skip if no title
  if (!title) return null;
  
  const link = titleElement.attr('href');
  const imgUrls = extractArrayFromElements($el, '.item-img .common-img', 'data-src', $);
  const tags = extractArrayFromElements($el, '.item-info-tag .tag', null, $);
  
  // Get room info
  const rooms = $el.find('.item-info-txt:has(i.house-home) span').text().trim();
  
  // Get metro info
  const metroValue = $el.find('.item-info-txt:has(i.house-metro) strong').text().trim();
  const metroTitle = $el.find('.item-info-txt:has(i.house-metro) span').text().trim();
  
  return {
    title,
    link: link ? (link.startsWith('http') ? link : `https://rent.591.com.tw${link}`) : null,
    imgUrls,
    tags,
    rooms,
    metroValue,
    metroTitle,
    timestamp: new Date().toISOString()
  };
};

/**
 * Parse all properties from 591.com.tw HTML
 * @param {string} html - HTML content from 591.com.tw
 * @param {Function} cheerio - Cheerio library
 * @returns {Array} Array of parsed property objects
 */
const parseProperties = (html, cheerio) => {
  const $ = cheerio.load(html);
  const properties = [];
  
  $('.item').each((index, element) => {
    const $el = $(element);
    const property = parseProperty($el, $);
    
    if (property) {
      properties.push(property);
    }
  });
  
  return properties;
};

module.exports = {
  parseProperty,
  parseProperties
};