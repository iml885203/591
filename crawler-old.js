#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'previous_data.json');

// Configuration
const CONFIG = {
  maxRetries: 3,
  retryDelay: 2000,
  notificationDelay: 1000,
  timeout: 30000
};

function logWithTimestamp(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

async function loadPreviousData() {
  try {
    if (await fs.pathExists(DATA_FILE)) {
      return await fs.readJson(DATA_FILE);
    }
  } catch (error) {
    logWithTimestamp('No previous data found or error reading file', 'WARN');
  }
  return {};
}

async function savePreviousData(data) {
  try {
    await fs.writeJson(DATA_FILE, data, { spaces: 2 });
  } catch (error) {
    logWithTimestamp(`Error saving data: ${error.message}`, 'ERROR');
  }
}

function getPropertyId(property) {
  // Use link as unique identifier, or create one from title + metro
  if (property.link) {
    const match = property.link.match(/\/(\d+)/);
    if (match) return match[1];
  }
  return `${property.title}-${property.metroValue}`.replace(/\s+/g, '-');
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const extractArrayFromElements = ($el, selector, attr = null, $ = null) => {
  const items = [];
  $el.find(selector).each((i, element) => {
    const value = attr ? $(element).attr(attr) : $(element).text().trim();
    if (value) items.push(value);
  });
  return items;
};

const sendToDiscord = async (embed) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    logWithTimestamp('Discord webhook URL not configured, skipping notification', 'WARN');
    return false;
  }
  
  try {
    await axios.post(webhookUrl, { embeds: [embed] });
    return true;
  } catch (error) {
    logWithTimestamp(`Discord notification failed: ${error.message}`, 'ERROR');
    return false;
  }
};

async function fetchWithRetry(url, options = {}, retries = CONFIG.maxRetries) {
  for (let i = 0; i <= retries; i++) {
    try {
      if (i > 0) logWithTimestamp(`Retry attempt ${i}/${retries}`);
      
      return await axios.get(url, { ...options, timeout: CONFIG.timeout });
      
    } catch (error) {
      if (i === retries) {
        throw new Error(`Failed after ${retries + 1} attempts: ${error.message}`);
      }
      
      const delay = error.response?.status === 429 ? CONFIG.retryDelay * 2 : CONFIG.retryDelay;
      logWithTimestamp(`Request failed (${i + 1}/${retries + 1}), retrying in ${delay}ms...`, 'WARN');
      
      await sleep(delay);
    }
  }
}

async function crawl591(url, maxLatest = null) {
  try {
    logWithTimestamp(`Starting crawl for URL: ${url}`);
    
    // Validate URL
    if (!url || (!url.includes('591.com.tw') && !url.includes('sale.591.com.tw'))) {
      throw new Error('Please provide a valid 591.com.tw URL');
    }

    // Set user agent to avoid blocking
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Extract basic property information
    const properties = [];
    
    // Extract property information using specific CSS selectors
    $('.item').each((index, element) => {
      const $el = $(element);
      
      const titleElement = $el.find('.item-info-title a');
      const title = titleElement.text().trim();
      const link = titleElement.attr('href');
      
      const imgUrls = extractArrayFromElements($el, '.item-img .common-img', 'data-src', $);
      const tags = extractArrayFromElements($el, '.item-info-tag .tag', null, $);
      
      // Get room info
      const rooms = $el.find('.item-info-txt:has(i.house-home) span').text().trim();
      
      // Get metro info
      const metroValue = $el.find('.item-info-txt:has(i.house-metro) strong').text().trim();
      const metroTitle = $el.find('.item-info-txt:has(i.house-metro) span').text().trim();
      
      const property = {
        title,
        link: link ? (link.startsWith('http') ? link : `https://rent.591.com.tw${link}`) : null,
        imgUrls,
        tags,
        rooms,
        metroValue,
        metroTitle,
        timestamp: new Date().toISOString()
      };
      
      if (property.title) {
        properties.push(property);
      }
    });

    logWithTimestamp(`Found ${properties.length} properties`);
    
    let propertiesToNotify = properties;
    
    if (maxLatest) {
      // If maxLatest is specified, just take the latest N properties
      propertiesToNotify = properties.slice(0, maxLatest);
      logWithTimestamp(`Will notify latest ${propertiesToNotify.length} properties`);
    } else {
      // Load previous data and compare
      const previousData = await loadPreviousData();
      const urlKey = Buffer.from(url).toString('base64').slice(0, 20);
      const previousProperties = previousData[urlKey] || [];
      const previousIds = new Set(previousProperties.map(p => getPropertyId(p)));
      
      // Find new properties
      propertiesToNotify = properties.filter(prop => !previousIds.has(getPropertyId(prop)));
      
      logWithTimestamp(`Previous properties: ${previousProperties.length}`);
      logWithTimestamp(`New properties: ${propertiesToNotify.length}`);
      
      // Save current data for next run
      previousData[urlKey] = properties;
      await savePreviousData(previousData);
    }
    
    if (propertiesToNotify.length > 0) {
      // Debug: Show sample properties
      const sampleCount = Math.min(3, propertiesToNotify.length);
      logWithTimestamp(`Sample properties (${sampleCount}): ${propertiesToNotify.slice(0, sampleCount).map(p => p.title).join(' | ')}`);
      
      await sendDiscordNotifications(propertiesToNotify, url);
    } else {
      logWithTimestamp('No new properties to notify');
    }
    
    return properties;
    
  } catch (error) {
    logWithTimestamp(`Crawl error: ${error.message}`, 'ERROR');
    
    // Send error notification to Discord
    await sendErrorNotification(url, error.message);
    
    throw error;
  }
}

async function sendDiscordNotifications(properties, originalUrl) {
  if (properties.length === 0) return;

  logWithTimestamp(`Sending ${properties.length} Discord notifications...`);
  
  for (let i = 0; i < properties.length; i++) {
    await sendSingleDiscordNotification(properties[i], originalUrl, i + 1, properties.length);
    if (i < properties.length - 1) await sleep(CONFIG.notificationDelay);
  }
}

async function sendSingleDiscordNotification(property, originalUrl, index, total) {
  const embed = {
    title: property.title || '無標題',
    url: property.link,
    color: 0x00ff00,
    fields: [
      { name: '🏠 房型', value: property.rooms || 'N/A', inline: true },
      { name: '🚇 捷運距離', value: `${property.metroTitle || ''} ${property.metroValue || 'N/A'}`.trim(), inline: true },
      { name: '🏷️ 標籤', value: property.tags.join(', ') || 'N/A', inline: false }
    ],
    footer: { text: `${index}/${total} - 591房源通知` },
    timestamp: new Date().toISOString()
  };

  if (property.imgUrls.length > 0) {
    embed.image = { url: property.imgUrls[0] };
  }

  const sent = await sendToDiscord(embed);
  if (sent) {
    logWithTimestamp(`✓ Sent notification ${index}/${total}: ${property.title}`);
  }
}

async function sendErrorNotification(originalUrl, error) {
  const embed = {
    title: '591 爬蟲執行錯誤',
    color: 0xff0000,
    fields: [
      { name: '錯誤訊息', value: error, inline: false },
      { name: '目標URL', value: originalUrl, inline: false }
    ],
    timestamp: new Date().toISOString()
  };

  if (await sendToDiscord(embed)) {
    logWithTimestamp('Discord error notification sent successfully');
  }
}

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

  crawl591(url, maxLatest)
    .then(() => logWithTimestamp('Crawl completed successfully'))
    .catch((error) => {
      logWithTimestamp(`Crawl failed: ${error.message}`, 'ERROR');
      process.exit(1);
    });
}

module.exports = { crawl591 };