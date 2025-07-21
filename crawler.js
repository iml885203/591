#!/usr/bin/env node

/**
 * 591.com.tw Property Crawler - Main Entry Point
 * A web scraper that monitors rental properties and sends Discord notifications
 */

require('dotenv').config();
const { crawl591 } = require('./lib/crawler');
const { logWithTimestamp } = require('./lib/utils');

// Main execution
if (require.main === module) {
  const url = process.argv[2];
  const maxLatest = process.argv[3] ? parseInt(process.argv[3]) : null;
  
  if (!url) {
    console.error('Usage: node crawler.js <591_url> [max_latest]');
    console.error('Examples:');
    console.error('  node crawler.js "https://rent.591.com.tw/?kind=0&region=1" 5  # Send latest 5 properties');
    console.error('  node crawler.js "https://rent.591.com.tw/?kind=0&region=1"     # Send only new properties');
    process.exit(1);
  }

  if (maxLatest !== null && (isNaN(maxLatest) || maxLatest <= 0)) {
    console.error('max_latest must be a positive number');
    process.exit(1);
  }

  // Run crawler with default dependencies (production mode)
  crawl591(url, maxLatest)
    .then(() => logWithTimestamp('Crawl completed successfully'))
    .catch((error) => {
      logWithTimestamp(`Crawl failed: ${error.message}`, 'ERROR');
      process.exit(1);
    });
}

module.exports = { crawl591 };