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
    version: require('./lib/getVersion').getVersion(),
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
        // Only include rentals field (removed deprecated properties field)
        rentalsFound: result.rentals.length,
        newRentals: result.summary.newRentals,
        notificationsSent: result.summary.notificationsSent,
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
 * /query/{queryId}/clear:
 *   delete:
 *     summary: Clear historical data for a specific query
 *     description: |
 *       Removes all crawl sessions, rentals, and related data for a query ID.
 *       This operation is irreversible and requires explicit confirmation.
 *       
 *       **Warning:** This will permanently delete:
 *       - All crawl sessions for this query
 *       - All rental-query relationships
 *       - Orphaned rental records (rentals not linked to other queries)
 *       - Associated metro distance data
 *     tags: [Query]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: queryId
 *         required: true
 *         schema:
 *           type: string
 *         description: The query ID to clear
 *         example: "region1_kind0_stations4232-4233_price15000,30000"
 *       - in: query
 *         name: confirm
 *         required: true
 *         schema:
 *           type: boolean
 *         description: Must be true to confirm deletion
 *         example: true
 *     responses:
 *       200:
 *         description: Query data cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Successfully cleared data for query: 台北市大安區租屋"
 *                 queryId:
 *                   type: string
 *                   example: "region1_kind0_stations4232-4233"
 *                 cleared:
 *                   type: object
 *                   properties:
 *                     crawlSessions:
 *                       type: number
 *                       example: 15
 *                     queryRentals:
 *                       type: number
 *                       example: 234
 *                     metroDistances:
 *                       type: number
 *                       example: 45
 *       400:
 *         description: Bad request - confirmation required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Confirmation required"
 *                 message:
 *                   type: string
 *                   example: "Add ?confirm=true to confirm deletion"
 *       404:
 *         description: Query ID not found
 *       500:
 *         description: Internal server error
 */
app.delete('/query/:queryId/clear', authenticateApiKey, async (req, res) => {
  const { queryId } = req.params;
  const { confirm } = req.query;
  
  try {
    // Require explicit confirmation to prevent accidental deletion
    if (confirm !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required',
        message: 'Add ?confirm=true to confirm deletion'
      });
    }
    
    logWithTimestamp(`🗑️  Clearing data for query: ${queryId}`);
    
    // Initialize database storage
    const databaseStorage = new DatabaseStorage();
    await databaseStorage.initialize();
    
    // Check if query exists
    const query = await databaseStorage.prisma.query.findUnique({
      where: { id: queryId },
      include: {
        _count: {
          select: {
            crawlSessions: true,
            rentals: true
          }
        }
      }
    });
    
    if (!query) {
      return res.status(404).json({
        success: false,
        error: 'Query not found',
        message: `Query ID '${queryId}' does not exist`
      });
    }
    
    logWithTimestamp(`📊 Query found: ${query.description} (${query._count.crawlSessions} sessions, ${query._count.rentals} rentals)`);
    
    // Clear data in transaction
    const cleared = await databaseStorage.prisma.$transaction(async (tx) => {
      // Get rental IDs associated with this query for metro distance cleanup
      const queryRentals = await tx.queryRental.findMany({
        where: { queryId },
        select: { rentalId: true }
      });
      
      const rentalIds = queryRentals.map(qr => qr.rentalId);
      
      // Delete crawl session rentals first (foreign key constraint)
      const crawlSessionRentalsDeleted = await tx.crawlSessionRental.deleteMany({
        where: {
          session: {
            queryId: queryId
          }
        }
      });
      
      // Delete crawl sessions
      const crawlSessionsDeleted = await tx.crawlSession.deleteMany({
        where: { queryId }
      });
      
      // Delete query-rental relationships
      const queryRentalsDeleted = await tx.queryRental.deleteMany({
        where: { queryId }
      });
      
      // Delete metro distances for rentals that are no longer referenced
      let metroDistancesDeleted = { count: 0 };
      if (rentalIds.length > 0) {
        // Find rentals that are no longer referenced by any query
        const orphanedRentals = await tx.rental.findMany({
          where: {
            id: { in: rentalIds },
            queryRentals: {
              none: {}
            }
          },
          select: { id: true }
        });
        
        const orphanedRentalIds = orphanedRentals.map(r => r.id);
        
        if (orphanedRentalIds.length > 0) {
          // Delete metro distances for orphaned rentals
          metroDistancesDeleted = await tx.metroDistance.deleteMany({
            where: {
              rentalId: { in: orphanedRentalIds }
            }
          });
          
          // Delete orphaned rentals
          await tx.rental.deleteMany({
            where: {
              id: { in: orphanedRentalIds }
            }
          });
        }
      }
      
      return {
        crawlSessions: crawlSessionsDeleted.count,
        crawlSessionRentals: crawlSessionRentalsDeleted.count,
        queryRentals: queryRentalsDeleted.count,
        metroDistances: metroDistancesDeleted.count,
        orphanedRentals: rentalIds.length
      };
    });
    
    logWithTimestamp(`✅ Cleared data for query ${queryId}:`);
    logWithTimestamp(`   - Crawl sessions: ${cleared.crawlSessions}`);
    logWithTimestamp(`   - Query-rental links: ${cleared.queryRentals}`);
    logWithTimestamp(`   - Metro distances: ${cleared.metroDistances}`);
    
    res.json({
      success: true,
      message: `Successfully cleared data for query: ${query.description}`,
      queryId,
      cleared: {
        crawlSessions: cleared.crawlSessions,
        queryRentals: cleared.queryRentals,
        metroDistances: cleared.metroDistances
      }
    });
    
  } catch (error) {
    logWithTimestamp(`❌ Error clearing query data: ${error.message}`, 'ERROR');
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
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
 * /debug/html:
 *   get:
 *     summary: List saved debug HTML files
 *     description: |
 *       Returns a list of HTML files saved from production crawls for debugging purposes.
 *       Files are automatically saved when SAVE_DEBUG_HTML=true environment variable is set.
 *     tags: [Debug]
 *     responses:
 *       200:
 *         description: HTML files listed successfully
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
 *                     files:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           filename:
 *                             type: string
 *                           size:
 *                             type: number
 *                           created:
 *                             type: string
 *                             format: date-time
 *                     total:
 *                       type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Debug directory not found or access error
 *     security:
 *       - ApiKeyAuth: []
 */
app.get('/debug/html', authenticateApiKey, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const debugDir = '/tmp/debug-html';
    
    // Check if debug directory exists
    if (!fs.existsSync(debugDir)) {
      return res.json({
        success: true,
        data: {
          files: [],
          total: 0,
          message: 'No debug HTML files found. Set SAVE_DEBUG_HTML=true to start saving.'
        }
      });
    }
    
    // Read directory and get file stats
    const files = fs.readdirSync(debugDir)
      .filter(file => file.endsWith('.html'))
      .map(filename => {
        const filePath = path.join(debugDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          size: stats.size,
          created: stats.birthtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created)); // Most recent first
    
    res.json({
      success: true,
      data: {
        files,
        total: files.length
      }
    });
    
  } catch (error) {
    logWithTimestamp(`Debug HTML list error: ${error.message}`, 'ERROR');
    
    res.status(500).json({
      success: false,
      error: 'Failed to list debug files',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /debug/html/{filename}:
 *   get:
 *     summary: Download a specific debug HTML file
 *     description: |
 *       Downloads a saved HTML file from production crawls for local analysis.
 *       Use /debug/html endpoint to get list of available files first.
 *     tags: [Debug]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the HTML file to download
 *         example: "crawl-2025-07-26T10-30-00-000Z.html"
 *     responses:
 *       200:
 *         description: HTML file content
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "File not found"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *     security:
 *       - ApiKeyAuth: []
 */
app.get('/debug/html/:filename', authenticateApiKey, async (req, res) => {
  try {
    const { filename } = req.params;
    const fs = require('fs');
    const path = require('path');
    
    // Validate filename (security: prevent path traversal)
    if (!filename || filename.includes('..') || filename.includes('/') || !filename.endsWith('.html')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename',
        message: 'Filename must be a valid HTML file without path separators'
      });
    }
    
    const debugDir = '/tmp/debug-html';
    const filePath = path.join(debugDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: `HTML file '${filename}' not found`
      });
    }
    
    // Set headers for HTML download
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    logWithTimestamp(`📥 Debug HTML downloaded: ${filename}`);
    
  } catch (error) {
    logWithTimestamp(`Debug HTML download error: ${error.message}`, 'ERROR');
    
    res.status(500).json({
      success: false,
      error: 'Download failed',
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
      '/query/statistics',
      '/debug/html',
      '/debug/html/{filename}'
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
      logWithTimestamp(`  GET    http://localhost:${PORT}/health - Health check`);
      logWithTimestamp(`  POST   http://localhost:${PORT}/crawl - Execute crawler`);
      logWithTimestamp(`  POST   http://localhost:${PORT}/query/parse - Parse query URL`);
      logWithTimestamp(`  DELETE http://localhost:${PORT}/query/{id}/clear?confirm=true - Clear query data`);
      logWithTimestamp(`  GET    http://localhost:${PORT}/query/{id}/rentals - Get query rentals`);
      logWithTimestamp(`  GET    http://localhost:${PORT}/debug/html - List debug HTML files`);
      logWithTimestamp(`  GET    http://localhost:${PORT}/debug/html/{filename} - Download debug HTML`);
      logWithTimestamp(`  GET    http://localhost:${PORT}/swagger - Swagger API Documentation`);
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