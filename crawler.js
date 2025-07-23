#!/usr/bin/env node

/**
 * 591.com.tw Rental Crawler - Main Entry Point
 * A web scraper that monitors rental properties and sends Discord notifications
 */

require('dotenv').config();
const { crawlWithNotifications } = require('./lib/crawlService');
const { logWithTimestamp } = require('./lib/utils');

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const url = args[0];
  let maxLatest = null;
  let notifyMode = 'filtered'; // all, filtered, none
  let filteredMode = 'silent'; // normal, silent, none (only applies when notifyMode is 'filtered')
  
  // Parse arguments
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--notify-mode=')) {
      notifyMode = args[i].split('=')[1];
    } else if (args[i].startsWith('--filtered-mode=')) {
      filteredMode = args[i].split('=')[1];
    } else if (!isNaN(parseInt(args[i]))) {
      maxLatest = parseInt(args[i]);
    }
  }
  
  if (!url) {
    console.error('Usage: node crawler.js <591_url> [max_latest] [--notify-mode=MODE] [--filtered-mode=FILTERED_MODE]');
    console.error('');
    console.error('Notification modes:');
    console.error('  --notify-mode=all       # Notify all rentals');
    console.error('  --notify-mode=filtered  # Notify with filtering (default)');
    console.error('  --notify-mode=none      # No notifications');
    console.error('');
    console.error('Filtered sub-modes (when --notify-mode=filtered):');
    console.error('  --filtered-mode=normal  # Normal notifications for all');
    console.error('  --filtered-mode=silent  # Silent notifications for far rentals (default)');
    console.error('  --filtered-mode=none    # Skip far rentals');
    console.error('');
    console.error('Examples:');
    console.error('  node crawler.js "URL" 5                              # Latest 5, filtered+silent');
    console.error('  node crawler.js "URL" --notify-mode=all              # All rentals, normal notifications');
    console.error('  node crawler.js "URL" --filtered-mode=none           # Skip far rentals');
    console.error('  node crawler.js "URL" --notify-mode=filtered --filtered-mode=normal  # All rentals, normal notifications');
    process.exit(1);
  }

  if (maxLatest !== null && (isNaN(maxLatest) || maxLatest <= 0)) {
    console.error('max_latest must be a positive number');
    process.exit(1);
  }

  // Validate modes
  if (!['all', 'filtered', 'none'].includes(notifyMode)) {
    console.error('Invalid notify-mode. Must be: all, filtered, none');
    process.exit(1);
  }
  
  if (!['normal', 'silent', 'none'].includes(filteredMode)) {
    console.error('Invalid filtered-mode. Must be: normal, silent, none');
    process.exit(1);
  }

  // Run crawler with default dependencies (production mode)
  crawlWithNotifications(url, maxLatest, { notifyMode, filteredMode })
    .then((result) => {
      logWithTimestamp('Crawl completed successfully');
      logWithTimestamp(`Total rentals: ${result.summary.totalRentals}, New: ${result.summary.newRentals}`);
    })
    .catch((error) => {
      logWithTimestamp(`Crawl failed: ${error.message}`, 'ERROR');
      process.exit(1);
    });
}

module.exports = { crawlWithNotifications };