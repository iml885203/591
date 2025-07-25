#!/usr/bin/env bun

/**
 * API Server for 591 Crawler
 * Provides REST API endpoints to trigger crawler operations
 */

require('dotenv').config({ silent: true });
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { specs } = require('./lib/swagger');
const { crawlWithNotifications } = require('./lib/crawlService');
const { hasMultipleStations, getUrlStationInfo } = require('./lib/multiStationCrawler');
const { logWithTimestamp } = require('./lib/utils');
const DatabaseStorage = require('./lib/storage/DatabaseStorage');
const QueryId = require('./lib/domain/QueryId');
const SearchUrl = require('./lib/domain/SearchUrl');
const UrlNormalizer = require('./lib/domain/UrlNormalizer');

const app = express();
const PORT = process.env.PORT || process.env.API_PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Key authentication middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const expectedApiKey = process.env.API_KEY;
  
  // Skip authentication if no API_KEY is configured (for backward compatibility)
  if (!expectedApiKey) {
    logWithTimestamp('Warning: API_KEY not configured, skipping authentication', 'WARN');
    return next();
  }
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'API key required. Provide via x-api-key header or apiKey query parameter'
    });
  }
  
  if (apiKey !== expectedApiKey) {
    logWithTimestamp(`Authentication failed: invalid API key from ${req.ip}`, 'WARN');
    return res.status(401).json({
      success: false,
      error: 'Unauthorized', 
      message: 'Invalid API key'
    });
  }
  
  next();
};

// CORS headers for cross-origin requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Swagger UI setup
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: '591 Crawler API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
}));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the current health status of the API server
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy and operational
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               status: "ok"
 *               timestamp: "2025-07-23T12:00:00.000Z"
 *               service: "591-crawler-api"
 */
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: '591-crawler-api',
    version: process.env.npm_package_version || 'unknown',
    uptime: process.uptime()
  });
});

/**
 * @swagger
 * /crawl:
 *   post:
 *     summary: Execute rental property crawler
 *     description: |
 *       Crawls 591.com.tw rental listings and sends Discord notifications based on specified parameters.
 *       
 *       **Notification Modes:**
 *       - `all`: Send normal notifications for all rentals
 *       - `filtered`: Apply distance-based filtering (default)
 *       - `none`: No notifications sent
 *       
 *       **Filtered Sub-modes** (when notifyMode=filtered):
 *       - `normal`: Normal notifications for all rentals
 *       - `silent`: Silent notifications for rentals beyond distance threshold (default)
 *       - `none`: Skip far rentals entirely
 *       
 *       **Distance Filtering:**
 *       Use `filter.mrtDistanceThreshold` to set MRT distance threshold in meters.
 *       Rentals beyond this distance will be handled according to `filteredMode`.
 *     tags: [Crawler]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrawlRequest'
 *           examples:
 *             basicCrawl:
 *               summary: Basic crawl with default settings
 *               value:
 *                 url: "https://rent.591.com.tw/list?region=1&kind=0"
 *             allNotifications:
 *               summary: All rentals with normal notifications
 *               value:
 *                 url: "https://rent.591.com.tw/list?region=1&kind=0"
 *                 notifyMode: "all"
 *             filteredSilent:
 *               summary: Distance filtering with silent notifications
 *               value:
 *                 url: "https://rent.591.com.tw/list?region=1&kind=0"
 *                 notifyMode: "filtered"
 *                 filteredMode: "silent"
 *                 filter:
 *                   mrtDistanceThreshold: 600
 *             skipFarRentals:
 *               summary: Skip rentals far from MRT entirely
 *               value:
 *                 url: "https://rent.591.com.tw/list?region=1&kind=0"
 *                 notifyMode: "filtered"
 *                 filteredMode: "none"
 *                 filter:
 *                   mrtDistanceThreshold: 800
 *             noNotifications:
 *               summary: Crawl without sending notifications
 *               value:
 *                 url: "https://rent.591.com.tw/list?region=1&kind=0"
 *                 notifyMode: "none"
 *             limitedResults:
 *               summary: Process only latest 5 rentals
 *               value:
 *                 url: "https://rent.591.com.tw/list?region=1&kind=0"
 *                 maxLatest: 5
 *     responses:
 *       200:
 *         description: Crawl completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CrawlResponse'
 *             example:
 *               success: true
 *               message: "Crawl completed successfully"
 *               data:
 *                 url: "https://rent.591.com.tw/list?region=1&kind=0"
 *                 maxLatest: null
 *                 notifyMode: "filtered"
 *                 filteredMode: "silent"
 *                 rentalsFound: 25
 *                 newRentals: 3
 *                 notificationsSent: true
 *                 rentals: []
 *                 timestamp: "2025-07-23T12:00:00.000Z"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *     security:
 *       - ApiKeyAuth: []
 */
// Main crawler endpoint
app.post('/crawl', authenticateApiKey, async (req, res) => {
  try {
    const { 
      url, 
      maxLatest, 
      notifyMode = 'filtered', 
      filteredMode = 'silent', 
      filter,
      multiStationOptions = {}
    } = req.body;

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

    // Check if URL has multiple stations
    const urlStationInfo = getUrlStationInfo(url);
    const filterInfo = filter ? JSON.stringify(filter) : 'none';
    const multiStationInfo = urlStationInfo.hasMultiple ? 
      ` stations=${urlStationInfo.stations.join(',')}, multiStationOptions=${JSON.stringify(multiStationOptions)}` : '';
    
    logWithTimestamp(`API crawl request: url=${url}, maxLatest=${maxLatest}, notifyMode=${notifyMode}, filteredMode=${filteredMode}, filter=${filterInfo}${multiStationInfo}`);

    // Execute crawler with notifications service
    const result = await crawlWithNotifications(url, maxLatest, { 
      notifyMode, 
      filteredMode, 
      filter,
      multiStationOptions
    });

    // Return success response with detailed property data and notification status
    res.json({
      success: true,
      message: 'Crawl completed successfully',
      data: {
        url: url,
        maxLatest: maxLatest,
        notifyMode: notifyMode,
        filteredMode: filteredMode,
        // Backward compatibility: include both old and new field names
        propertiesFound: result.rentals.length,  // deprecated, use rentalsFound
        newProperties: result.summary.newRentals,  // deprecated, use newRentals
        rentalsFound: result.rentals.length,
        newRentals: result.summary.newRentals,
        notificationsSent: result.summary.notificationsSent,
        properties: result.rentals,  // deprecated, use rentals
        rentals: result.rentals,
        timestamp: new Date().toISOString(),
        // Multi-station specific fields
        multiStation: result.summary.multiStation || false,
        stationCount: result.summary.stationCount || 1,
        stations: result.summary.stations || [],
        crawlErrors: result.summary.crawlErrors || []
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

/**
 * @swagger
 * /query/parse:
 *   post:
 *     summary: Parse URL to generate query ID and description
 *     description: |
 *       Analyzes a 591.com.tw URL to generate a deterministic query ID and human-readable description.
 *       This endpoint helps identify and group search queries that represent the same criteria.
 *     tags: [Query]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: 591.com.tw search URL to parse
 *                 example: "https://rent.591.com.tw/list?region=1&kind=0&station=4232,4233&rentprice=15000,30000"
 *             required:
 *               - url
 *     responses:
 *       200:
 *         description: URL parsed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     queryId:
 *                       type: string
 *                       example: "region1_kind0_stations4232-4233_price15000,30000"
 *                     description:
 *                       type: string
 *                       example: "台北市 近2個捷運站 15,000-30,000元"
 *                     normalizedUrl:
 *                       type: string
 *                     equivalentUrls:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *     security:
 *       - ApiKeyAuth: []
 */
app.post('/query/parse', authenticateApiKey, async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
        message: 'Please provide a 591.com.tw search URL'
      });
    }

    const searchUrl = new SearchUrl(url);
    
    if (!searchUrl.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL',
        message: 'URL must be a valid 591.com.tw search URL'
      });
    }

    const queryId = searchUrl.getQueryId();
    const description = searchUrl.getQueryDescription();
    const normalized = UrlNormalizer.normalize(url);
    const equivalentUrls = UrlNormalizer.getEquivalentVariations(url);

    res.json({
      success: true,
      data: {
        queryId,
        description,
        originalUrl: url,
        normalizedUrl: normalized.originalUrl,
        equivalentUrls,
        searchCriteria: {
          region: searchUrl.getRegion(),
          stations: searchUrl.getStationIds(),
          metro: searchUrl.getMetro(),
          hasMultipleStations: searchUrl.hasMultipleStations(),
          params: searchUrl.getParams()
        }
      }
    });

  } catch (error) {
    logWithTimestamp(`Query parse error: ${error.message}`, 'ERROR');
    
    res.status(500).json({
      success: false,
      error: 'Parse failed',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /query/{queryId}/rentals:
 *   get:
 *     summary: Get historical rentals for a specific query
 *     description: |
 *       Retrieves all historical rental data found for a specific search query.
 *       Results include rental properties discovered across multiple crawl sessions.
 *     tags: [Query]
 *     parameters:
 *       - in: path
 *         name: queryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Query ID to retrieve rentals for
 *         example: "region1_kind0_stations4232-4233_price15000,30000"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of rentals to return
 *       - in: query
 *         name: sinceDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Only include crawls since this date
 *     responses:
 *       200:
 *         description: Rentals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     queryId:
 *                       type: string
 *                     description:
 *                       type: string
 *                     totalCrawls:
 *                       type: integer
 *                     totalRentals:
 *                       type: integer
 *                     uniqueRentals:
 *                       type: integer
 *                     firstCrawl:
 *                       type: string
 *                       format: date-time
 *                     lastCrawl:
 *                       type: string
 *                       format: date-time
 *                     rentals:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Query not found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *     security:
 *       - ApiKeyAuth: []
 */
app.get('/query/:queryId/rentals', authenticateApiKey, async (req, res) => {
  try {
    const { queryId } = req.params;
    const { limit, sinceDate } = req.query;

    const databaseStorage = new DatabaseStorage();
    await databaseStorage.initialize();
    const queryData = await databaseStorage.getRentalsForQuery(queryId, {
      limit: limit ? parseInt(limit) : undefined,
      sinceDate
    });

    if (!queryData) {
      return res.status(404).json({
        success: false,
        error: 'Query not found',
        message: `No data found for query ID: ${queryId}`
      });
    }

    res.json({
      success: true,
      data: queryData
    });

  } catch (error) {
    logWithTimestamp(`Query rentals error: ${error.message}`, 'ERROR');
    
    res.status(500).json({
      success: false,
      error: 'Query failed',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /queries:
 *   get:
 *     summary: List all stored queries
 *     description: |
 *       Returns a list of all stored search queries with summary information.
 *       Supports filtering by region, date range, and other criteria.
 *     tags: [Query]
 *     parameters:
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *         description: Filter by region ID
 *       - in: query
 *         name: sinceDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Only include queries crawled since this date
 *       - in: query
 *         name: hasRentals
 *         schema:
 *           type: boolean
 *         description: Only include queries that have found rentals
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of queries to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of queries to skip for pagination
 *     responses:
 *       200:
 *         description: Queries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     queries:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           queryId:
 *                             type: string
 *                           description:
 *                             type: string
 *                           region:
 *                             type: string
 *                           stations:
 *                             type: array
 *                             items:
 *                               type: string
 *                           totalCrawls:
 *                             type: integer
 *                           totalRentals:
 *                             type: integer
 *                           uniqueRentals:
 *                             type: integer
 *                           firstCrawl:
 *                             type: string
 *                             format: date-time
 *                           lastCrawl:
 *                             type: string
 *                             format: date-time
 *                     total:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *     security:
 *       - ApiKeyAuth: []
 */
app.get('/queries', authenticateApiKey, async (req, res) => {
  try {
    const { region, sinceDate, hasRentals, limit, offset } = req.query;
    
    const databaseStorage = new DatabaseStorage();
    await databaseStorage.initialize();
    const result = await databaseStorage.listQueries({
      region,
      sinceDate,
      hasRentals: hasRentals === 'true',
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logWithTimestamp(`Queries list error: ${error.message}`, 'ERROR');
    
    res.status(500).json({
      success: false,
      error: 'Query failed',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /query/{queryId}/similar:
 *   get:
 *     summary: Find similar queries
 *     description: |
 *       Finds queries with similar search criteria to the specified query.
 *       Useful for discovering related searches and grouping similar queries.
 *     tags: [Query]
 *     parameters:
 *       - in: path
 *         name: queryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Query ID to find similar queries for
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of similar queries to return
 *     responses:
 *       200:
 *         description: Similar queries found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       queryId:
 *                         type: string
 *                       description:
 *                         type: string
 *                       similarity:
 *                         type: number
 *                         description: Similarity score (0-100)
 *                       totalRentals:
 *                         type: integer
 *                       lastCrawl:
 *                         type: string
 *                         format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *     security:
 *       - ApiKeyAuth: []
 */
app.get('/query/:queryId/similar', authenticateApiKey, async (req, res) => {
  try {
    const { queryId } = req.params;
    const { limit } = req.query;

    const databaseStorage = new DatabaseStorage();
    await databaseStorage.initialize();
    const similarQueries = await databaseStorage.findSimilarQueries(queryId, {
      limit: limit ? parseInt(limit) : undefined
    });

    res.json({
      success: true,
      data: similarQueries
    });

  } catch (error) {
    logWithTimestamp(`Similar queries error: ${error.message}`, 'ERROR');
    
    res.status(500).json({
      success: false,
      error: 'Query failed',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /query/statistics:
 *   get:
 *     summary: Get query storage statistics
 *     description: |
 *       Returns overall statistics about stored queries, including totals,
 *       regional breakdown, and crawl frequency metrics.
 *     tags: [Query]
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalQueries:
 *                       type: integer
 *                     totalCrawls:
 *                       type: integer
 *                     totalRentals:
 *                       type: integer
 *                     lastUpdate:
 *                       type: string
 *                       format: date-time
 *                     regionBreakdown:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                     crawlFrequency:
 *                       type: object
 *                       properties:
 *                         today:
 *                           type: integer
 *                         thisWeek:
 *                           type: integer
 *                         thisMonth:
 *                           type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *     security:
 *       - ApiKeyAuth: []
 */
app.get('/query/statistics', authenticateApiKey, async (req, res) => {
  try {
    const databaseStorage = new DatabaseStorage();
    await databaseStorage.initialize();
    const statistics = await databaseStorage.getStorageStatistics();

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    logWithTimestamp(`Query statistics error: ${error.message}`, 'ERROR');
    
    res.status(500).json({
      success: false,
      error: 'Query failed',
      message: error.message
    });
  }
});


/**
 * @swagger
 * /*:
 *   get:
 *     summary: Handle undefined routes (404)
 *     description: Returns a 404 error for any undefined API endpoints
 *     tags: [Info]
 *     responses:
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   post:
 *     summary: Handle undefined routes (404)
 *     description: Returns a 404 error for any undefined API endpoints
 *     tags: [Info]
 *     responses:
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   put:
 *     summary: Handle undefined routes (404)
 *     description: Returns a 404 error for any undefined API endpoints
 *     tags: [Info]
 *     responses:
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     summary: Handle undefined routes (404)
 *     description: Returns a 404 error for any undefined API endpoints
 *     tags: [Info]
 *     responses:
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
// Handle 404 for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: [
      '/health', 
      '/crawl', 
      '/swagger',
      '/query/parse',
      '/queries',
      '/query/{queryId}/rentals',
      '/query/{queryId}/similar',
      '/query/statistics'
    ]
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
  // Check database configuration on startup
  const checkDatabaseOnStartup = async () => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      logWithTimestamp('Checking database configuration...');
      logWithTimestamp(`DATABASE_PROVIDER: ${process.env.DATABASE_PROVIDER || 'not set'}`);
      logWithTimestamp(`DATABASE_URL: ${process.env.DATABASE_URL ? 'configured' : 'not set'}`);
      logWithTimestamp(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
      
      // Test database connection
      await prisma.$connect();
      logWithTimestamp('✅ Database connection successful');
      
      // Check if tables exist
      const queryCount = await prisma.query.count();
      const rentalCount = await prisma.rental.count();
      logWithTimestamp(`📊 Database stats: ${queryCount} queries, ${rentalCount} rentals`);
      
      await prisma.$disconnect();
    } catch (error) {
      logWithTimestamp(`❌ Database connection failed: ${error.message}`, 'ERROR');
      logWithTimestamp('Please check your DATABASE_URL and ensure the database is accessible', 'ERROR');
      // Don't exit - let the API start anyway
    }
  };
  
  checkDatabaseOnStartup().then(() => {
    const server = app.listen(PORT, () => {
      logWithTimestamp(`591 Crawler API server started on port ${PORT}`);
      logWithTimestamp(`Available endpoints:`);
      logWithTimestamp(`  GET  http://localhost:${PORT}/health - Health check`);
      logWithTimestamp(`  POST http://localhost:${PORT}/crawl - Execute crawler`);
      logWithTimestamp(`  GET  http://localhost:${PORT}/swagger - Swagger API Documentation`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logWithTimestamp(`Port ${PORT} is already in use. Please try a different port or stop the existing service.`);
      } else {
        logWithTimestamp(`Failed to start server: ${err.message}`);
      }
      process.exit(1);
    });
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