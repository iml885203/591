/**
 * Utility functions for the 591 crawler
 */

import * as cheerio from 'cheerio';
type CheerioAPI = cheerio.CheerioAPI;
type Element = any;

/**
 * Sleep for a specified number of milliseconds
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Extract an array of values from DOM elements using CSS selector
 */
const extractArrayFromElements = (
  $el: cheerio.Cheerio<Element>, 
  selector: string, 
  attr: string | null = null, 
  $: CheerioAPI
): string[] => {
  const items: string[] = [];
  $el.find(selector).each((i, element) => {
    const value = attr ? $(element).attr(attr) : $(element).text().trim();
    if (value) items.push(value);
  });
  return items;
};

export {
  sleep,
  extractArrayFromElements
};