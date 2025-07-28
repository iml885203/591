/**
 * HTML parsing functions for 591.com.tw
 */

import { CheerioAPI, Cheerio, Element } from 'cheerio';
import { extractArrayFromElements } from './utils';
import { debugLog, isDebugEnabled } from './logger';

interface RentalData {
  title: string;
  link: string | null;
  imgUrls: string[];
  tags: string[];
  houseType: string;
  rooms: string;
  metroValue: string;
  metroTitle: string;
  timestamp: string;
}

/**
 * Parse a single rental element from 591.com.tw HTML
 */
const parseRental = ($el: Cheerio<Element>, $: CheerioAPI): RentalData | null => {
  const titleElement = $el.find('.item-info-title a');
  const title = titleElement.text().trim();
  
  // Skip if no title
  if (!title) return null;
  
  const link = titleElement.attr('href') || null;
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
  
  const result: RentalData = {
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
 */
const parseRentals = (html: string, cheerio: any): RentalData[] => {
  const $ = cheerio.load(html);
  const rentals: RentalData[] = [];
  
  $('.item').each((index, element) => {
    const $el = $(element);
    const rental = parseRental($el, $);
    
    if (rental) {
      rentals.push(rental);
    }
  });
  
  return rentals;
};

export {
  parseRental,
  parseRentals,
  type RentalData
};