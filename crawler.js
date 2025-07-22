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
  const args = process.argv.slice(2);
  const url = args[0];
  let maxLatest = null;
  let noNotify = false;
  
  // Parse arguments
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--no-notify') {
      noNotify = true;
    } else if (!isNaN(parseInt(args[i]))) {
      maxLatest = parseInt(args[i]);
    }
  }
  
  if (!url) {
    console.error('Usage: node crawler.js <591_url> [max_latest] [--no-notify]');
    console.error('Examples:');
    console.error('  node crawler.js "https://rent.591.com.tw/?kind=0&region=1" 5  # Send latest 5 properties');
    console.error('  node crawler.js "https://rent.591.com.tw/?kind=0&region=1"     # Send only new properties');
    console.error('  node crawler.js "https://rent.591.com.tw/?kind=0&region=1" --no-notify  # No notifications');
    process.exit(1);
  }

  if (maxLatest !== null && (isNaN(maxLatest) || maxLatest <= 0)) {
    console.error('max_latest must be a positive number');
    process.exit(1);
  }

  // Run crawler with default dependencies (production mode)
  crawl591(url, maxLatest, { noNotify })
    .then(() => logWithTimestamp('Crawl completed successfully'))
    .catch((error) => {
      logWithTimestamp(`Crawl failed: ${error.message}`, 'ERROR');
      process.exit(1);
    });
}

module.exports = { crawl591 };