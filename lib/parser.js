/**
 * HTML parsing functions for 591.com.tw
 */

const { extractArrayFromElements } = require('./utils');
const { debugLog, isDebugEnabled } = require('./debugLogger');

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
  
  // DEBUG LOG: Check parsing result for rentals with room parsing issues
  if (isDebugEnabled() && (Math.random() < 0.1 || rooms === '房型未明' || !rooms)) { // Log issues + random sample
    debugLog('PARSER', `Title: "${title}"`);
    debugLog('PARSER', `Raw houseType: "${houseType}" (type: ${typeof houseType})`);
    debugLog('PARSER', `Raw rooms: "${rooms}" (type: ${typeof rooms})`);
    
    // Additional debug for rooms parsing
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
  }
  
  // Handle empty or malformed data
  if (!houseType || houseType.length === 0) {
    houseType = '房屋類型未明';
  }
  
  // Simple fallback for empty or malformed rooms
  if (!rooms || rooms.length === 0 || rooms.includes('?')) {
    rooms = '房型未明';
  }
  
  // Get metro info
  const metroValue = $el.find('.item-info-txt:has(i.house-metro) strong').text().trim();
  const metroTitle = $el.find('.item-info-txt:has(i.house-metro) span').text().trim();
  
  const result = {
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
  
  // DEBUG LOG: Final parsing result for first few rentals
  if (isDebugEnabled() && Math.random() < 0.1) { // Log ~10% of rentals to avoid spam
    debugLog('PARSER', `Final result - houseType: "${result.houseType}", rooms: "${result.rooms}"`);
  }
  
  return result;
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