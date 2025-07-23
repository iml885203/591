#!/usr/bin/env node

/**
 * API Server for 591 Crawler
 * Provides REST API endpoints to trigger crawler operations
 */

require('dotenv').config({ silent: true });
const express = require('express');
const { crawlWithNotifications } = require('./lib/crawlService');
const { logWithTimestamp } = require('./lib/utils');

const app = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers for cross-origin requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: '591-crawler-api'
  });
});

// Main crawler endpoint
app.post('/crawl', async (req, res) => {
  try {
    const { url, maxLatest, notifyMode = 'filtered', filteredMode = 'silent', filter } = req.body;

    // Validate required parameters
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
        message: 'Please provide a 591.com.tw search URL'
      });
    }

    // Validate URL format
    if (!url.includes('591.com.tw')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL',
        message: 'URL must be from 591.com.tw'
      });
    }

    const filterInfo = filter ? JSON.stringify(filter) : 'none';
    logWithTimestamp(`API crawl request: url=${url}, maxLatest=${maxLatest}, notifyMode=${notifyMode}, filteredMode=${filteredMode}, filter=${filterInfo}`);

    // Execute crawler with notifications service
    const result = await crawlWithNotifications(url, maxLatest, { notifyMode, filteredMode, filter });

    // Return success response with detailed property data and notification status
    res.json({
      success: true,
      message: 'Crawl completed successfully',
      data: {
        url: url,
        maxLatest: maxLatest,
        notifyMode: notifyMode,
        filteredMode: filteredMode,
        propertiesFound: result.properties.length,
        newProperties: result.summary.newProperties,
        notificationsSent: result.summary.notificationsSent,
        properties: result.properties,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logWithTimestamp(`API crawl error: ${error.message}`, 'ERROR');
    
    res.status(500).json({
      success: false,
      error: 'Crawl failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get API usage information
app.get('/info', (req, res) => {
  res.json({
    name: '591 Crawler API',
    version: '1.0.0',
    description: 'REST API for 591.com.tw property crawler',
    endpoints: {
      'GET /health': 'Health check',
      'GET /info': 'API information',
      'POST /crawl': 'Execute crawler'
    },
    crawlParameters: {
      url: {
        type: 'string',
        required: true,
        description: '591.com.tw search URL'
      },
      maxLatest: {
        type: 'number',
        required: false,
        description: 'Maximum number of latest properties to process'
      },
      notifyMode: {
        type: 'string',
        required: false,
        default: 'filtered',
        description: 'Notification mode: all, filtered, none',
        enum: ['all', 'filtered', 'none']
      },
      filteredMode: {
        type: 'string',
        required: false,
        default: 'silent',
        description: 'Filtered sub-mode for far properties: normal, silent, none',
        enum: ['normal', 'silent', 'none']
      },
      filter: {
        type: 'object',
        required: false,
        description: 'Filter options for property screening',
        properties: {
          mrtDistanceThreshold: {
            type: 'number',
            description: 'Distance threshold in meters for MRT filtering'
          }
        }
      }
    },
    examples: {
      basicCrawl: {
        method: 'POST',
        url: '/crawl',
        body: {
          url: 'https://rent.591.com.tw/list?region=1&kind=0'
        }
      },
      allNotifications: {
        method: 'POST',
        url: '/crawl',
        body: {
          url: 'https://rent.591.com.tw/list?region=1&kind=0',
          notifyMode: 'all'
        }
      },
      filteredSilent: {
        method: 'POST',
        url: '/crawl',
        body: {
          url: 'https://rent.591.com.tw/list?region=1&kind=0',
          notifyMode: 'filtered',
          filteredMode: 'silent'
        }
      },
      skipFarProperties: {
        method: 'POST',
        url: '/crawl',
        body: {
          url: 'https://rent.591.com.tw/list?region=1&kind=0',
          notifyMode: 'filtered',
          filteredMode: 'none'
        }
      },
      noNotifications: {
        method: 'POST',
        url: '/crawl',
        body: {
          url: 'https://rent.591.com.tw/list?region=1&kind=0',
          notifyMode: 'none'
        }
      },
      customDistanceFilter: {
        method: 'POST',
        url: '/crawl',
        body: {
          url: 'https://rent.591.com.tw/list?region=1&kind=0',
          notifyMode: 'filtered',
          filteredMode: 'silent',
          filter: {
            mrtDistanceThreshold: 600
          }
        }
      }
    }
  });
});

// Handle 404 for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: ['/health', '/info', '/crawl']
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logWithTimestamp(`Unhandled API error: ${error.message}`, 'ERROR');
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Start server only if this file is run directly (not imported)
if (require.main === module) {
  app.listen(PORT, () => {
    logWithTimestamp(`591 Crawler API server started on port ${PORT}`);
    logWithTimestamp(`Available endpoints:`);
    logWithTimestamp(`  GET  http://localhost:${PORT}/health - Health check`);
    logWithTimestamp(`  GET  http://localhost:${PORT}/info - API information`);
    logWithTimestamp(`  POST http://localhost:${PORT}/crawl - Execute crawler`);
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  logWithTimestamp('Shutting down API server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logWithTimestamp('Shutting down API server...');
  process.exit(0);
});

module.exports = app;