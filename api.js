#!/usr/bin/env node

/**
 * API Server for 591 Crawler
 * Provides REST API endpoints to trigger crawler operations
 */

require('dotenv').config();
const express = require('express');
const { crawl591 } = require('./lib/crawler');
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
    const { url, maxLatest, noNotify } = req.body;

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

    logWithTimestamp(`API crawl request: url=${url}, maxLatest=${maxLatest}, noNotify=${noNotify}`);

    // Prepare crawler options
    const crawlerOptions = {
      noNotify: noNotify || false
    };

    // Execute crawler
    const result = await crawl591(url, maxLatest, crawlerOptions);

    // Return success response
    res.json({
      success: true,
      message: 'Crawl completed successfully',
      data: {
        url: url,
        maxLatest: maxLatest,
        noNotify: noNotify,
        propertiesFound: result ? result.length : 0,
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
      noNotify: {
        type: 'boolean',
        required: false,
        default: false,
        description: 'Disable Discord notifications'
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
      crawlWithLimitAndNoNotify: {
        method: 'POST',
        url: '/crawl',
        body: {
          url: 'https://rent.591.com.tw/list?region=1&kind=0',
          maxLatest: 5,
          noNotify: true
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

// Start server
app.listen(PORT, () => {
  logWithTimestamp(`591 Crawler API server started on port ${PORT}`);
  logWithTimestamp(`Available endpoints:`);
  logWithTimestamp(`  GET  http://localhost:${PORT}/health - Health check`);
  logWithTimestamp(`  GET  http://localhost:${PORT}/info - API information`);
  logWithTimestamp(`  POST http://localhost:${PORT}/crawl - Execute crawler`);
});

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