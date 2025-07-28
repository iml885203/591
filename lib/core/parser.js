/**
 * HTML parsing functions for 591.com.tw
 */

const { extractArrayFromElements } = require('../utils/helpers');
const { debugLog, isDebugEnabled } = require('../utils/logger');

/**
 * Parse a single rental element from 591.com.tw HTML
 * @param {Object} $el - Cheerio element representing a rental
 * @param {Function} $ - Cheerio instance
 * @returns {Object|null} Parsed rental object or null if invalid
 */
const parseRental = ($el, $) => {
  const title = extractTitle($el);
  if (!title) return null;
  
  const basicInfo = extractBasicInfo($el, $);
  const houseInfo = extractHouseInfo($el, $, title);
  const metroInfo = extractMetroInfo($el);
  
  return {
    ...basicInfo,
    ...houseInfo,
    ...metroInfo,
    title,
    timestamp: new Date().toISOString()
  };
};

/**
 * Extract title from rental element
 * @private
 */
const extractTitle = ($el) => {
  return $el.find('.item-info-title a').text().trim();
};

/**
 * Extract basic info (link, images, tags)
 * @private
 */
const extractBasicInfo = ($el, $) => {
  const titleElement = $el.find('.item-info-title a');
  const link = titleElement.attr('href');
  
  return {
    link: normalizeLink(link),
    imgUrls: extractArrayFromElements($el, '.item-img .common-img', 'data-src', $),
    tags: extractArrayFromElements($el, '.item-info-tag .tag', null, $)
  };
};

/**
 * Extract house type and room information
 * @private
 */
const extractHouseInfo = ($el, $, title) => {
  const houseHomeSection = $el.find('.item-info-txt:has(i.house-home)');
  
  let houseType = houseHomeSection.find('span').first().text().trim();
  let rooms = houseHomeSection.find('span.line').first().text().trim();
  
  logDebugInfoIfNeeded(title, houseType, rooms, houseHomeSection);
  
  return {
    houseType: normalizeHouseType(houseType),
    rooms: normalizeRooms(rooms)
  };
};

/**
 * Extract metro information
 * @private
 */
const extractMetroInfo = ($el) => {
  return {
    metroValue: $el.find('.item-info-txt:has(i.house-metro) strong').text().trim(),
    metroTitle: $el.find('.item-info-txt:has(i.house-metro) span').text().trim()
  };
};

/**
 * Normalize house type with fallback
 * @private
 */
const normalizeHouseType = (houseType) => {
  return (!houseType || houseType.length === 0) ? '房屋類型未明' : houseType;
};

/**
 * Normalize rooms with fallback
 * @private
 */
const normalizeRooms = (rooms) => {
  return (!rooms || rooms.length === 0 || rooms.includes('?')) ? '房型未明' : rooms;
};

/**
 * Normalize link URL
 * @private
 */
const normalizeLink = (link) => {
  if (!link) return null;
  return link.startsWith('http') ? link : `https://rent.591.com.tw${link}`;
};

/**
 * Log debug information when needed
 * @private
 */
const logDebugInfoIfNeeded = (title, houseType, rooms, houseHomeSection) => {
  const shouldLog = isDebugEnabled() && (Math.random() < 0.1 || rooms === '房型未明' || !rooms);
  if (!shouldLog) return;
  
  debugLog('PARSER', `Title: "${title}"`);
  debugLog('PARSER', `Raw houseType: "${houseType}" (type: ${typeof houseType})`);
  debugLog('PARSER', `Raw rooms: "${rooms}" (type: ${typeof rooms})`);
  
  logSpanElements(houseHomeSection);
  
  if (isDebugEnabled() && Math.random() < 0.1) {
    debugLog('PARSER', `Final result - houseType: "${normalizeHouseType(houseType)}", rooms: "${normalizeRooms(rooms)}"`);
  }
};

/**
 * Log span elements for debugging
 * @private
 */
const logSpanElements = (houseHomeSection) => {
  debugLog('PARSER', `houseHomeSection found: ${houseHomeSection.length > 0}`);
  if (houseHomeSection.length > 0) {
    const allSpans = houseHomeSection.find('span');
    debugLog('PARSER', `Total spans in section: ${allSpans.length}`);
    allSpans.each((i, span) => {
      const $span = houseHomeSection.find(span);
      const className = $span.attr('class') || 'no-class';
      const text = $span.text().trim();
      debugLog('PARSER', `  span ${i}: class="${className}", text="${text}"`);
    });
  }
};

/**
 * Parse all rentals from 591.com.tw HTML
 * @param {string} html - HTML content from 591.com.tw
 * @param {Function} cheerio - Cheerio library
 * @returns {Array} Array of parsed rental objects
 */
const parseRentals = (html, cheerio) => {
  const $ = cheerio.load(html);
  const rentals = [];
  
  $('.item').each((index, element) => {
    const $el = $(element);
    const rental = parseRental($el, $);
    
    if (rental) {
      rentals.push(rental);
    }
  });
  
  return rentals;
};

module.exports = {
  parseRental,
  parseRentals
};