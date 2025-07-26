/**
 * HTML parsing functions for 591.com.tw
 */

const { extractArrayFromElements } = require('./utils');

/**
 * Parse a single rental element from 591.com.tw HTML
 * @param {Object} $el - Cheerio element representing a rental
 * @param {Function} $ - Cheerio instance
 * @returns {Object|null} Parsed rental object or null if invalid
 */
const parseRental = ($el, $) => {
  const titleElement = $el.find('.item-info-title a');
  const title = titleElement.text().trim();
  
  // Skip if no title
  if (!title) return null;
  
  const link = titleElement.attr('href');
  const imgUrls = extractArrayFromElements($el, '.item-img .common-img', 'data-src', $);
  const tags = extractArrayFromElements($el, '.item-info-tag .tag', null, $);
  
  // Get house type and room info with improved parsing
  const houseHomeSection = $el.find('.item-info-txt:has(i.house-home)');
  
  // Extract house type (first span without class)
  let houseType = houseHomeSection.find('span').first().text().trim();
  
  // Extract room info (first span with class="line")
  let rooms = houseHomeSection.find('span.line').first().text().trim();
  
  // Handle empty or malformed data
  if (!houseType || houseType.length === 0) {
    houseType = '房屋類型未明';
  }
  
  if (!rooms || rooms.length === 0) {
    // Try to find room info from title
    const titleRoomMatch = title.match(/(\d+房\d*廳?\d*衛?|套房|雅房|分租套房)/);
    if (titleRoomMatch) {
      rooms = titleRoomMatch[1];
    } else {
      rooms = '房型未明';
    }
  } else if (rooms.includes('?')) {
    // Handle malformed room data with ? characters (original issue: ?房?廳)
    const titleRoomMatch = title.match(/(\d+房\d*廳?\d*衛?|套房|雅房|分租套房)/);
    if (titleRoomMatch) {
      rooms = titleRoomMatch[1];
    } else {
      rooms = '房型未明';
    }
  }
  
  // Get metro info
  const metroValue = $el.find('.item-info-txt:has(i.house-metro) strong').text().trim();
  const metroTitle = $el.find('.item-info-txt:has(i.house-metro) span').text().trim();
  
  return {
    title,
    link: link ? (link.startsWith('http') ? link : `https://rent.591.com.tw${link}`) : null,
    imgUrls,
    tags,
    houseType,
    rooms,
    metroValue,
    metroTitle,
    timestamp: new Date().toISOString()
  };
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