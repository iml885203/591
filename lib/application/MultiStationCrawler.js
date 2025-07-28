/**
 * Multi-Station Crawler Service
 * Application Service - Handles parallel crawling of multiple URLs with different station parameters
 * 
 * Responsibilities:
 * - Coordinate multi-station crawling workflow
 * - Manage concurrency and rate limiting
 * - Merge results from multiple stations
 * - Handle station-specific errors gracefully
 */

const { crawl591 } = require('../core/crawler');
const SearchUrl = require('../domain/valueObjects/SearchUrl');
const PropertyId = require('../domain/valueObjects/PropertyId');
const Rental = require('../domain/entities/Rental');
const logger = require('../utils/logger');

/**
 * Crawl multiple station URLs in parallel
 * @param {string} originalUrl - Original URL with multiple stations
 * @param {Object} options - Crawling options
 * @param {Object} dependencies - Injected dependencies for testing
 * @returns {Promise<Object>} Results with merged rentals and metadata
 */
const crawlMultipleStations = async (originalUrl, options = {}, dependencies = {}) => {
  const {
    maxConcurrent = 3,
    delayBetweenRequests = 1000,
    mergeResults = true,
    includeStationInfo = true
  } = options;

  // Extract crawler function from dependencies with fallback
  const crawlerFunction = dependencies.crawl591 || crawl591;

  logger.info(`Starting multi-station crawl for: ${originalUrl}`);
  
  // Parse URL and split by stations
  const searchUrl = new SearchUrl(originalUrl);
  
  if (!searchUrl.isValid) {
    throw new Error(`Invalid 591.com.tw URL: ${originalUrl}`);
  }

  const stationUrls = searchUrl.splitByStations();
  const stations = searchUrl.getStationIds();
  
  logger.info(`Found ${stationUrls.length} station URLs to crawl`);
  
  if (stationUrls.length === 1) {
    // Single station, use normal crawling
    const rentals = await crawlerFunction(originalUrl, dependencies);
    return {
      rentals,
      stationCount: 1,
      stations: stations,
      mergedCount: 0,
      duplicateCount: 0,
      urlsCrawled: [originalUrl]
    };
  }

  // Parallel crawling with concurrency control
  const results = await crawlStationsWithConcurrency(
    stationUrls, 
    stations, 
    maxConcurrent, 
    delayBetweenRequests,
    crawlerFunction,
    dependencies
  );

  // Merge results if requested
  if (mergeResults) {
    const mergedResults = mergeStationResults(results, includeStationInfo);
    logger.info(`Crawling completed. Found ${mergedResults.rentals.length} unique rentals from ${stationUrls.length} stations`);
    
    return {
      ...mergedResults,
      stationCount: stationUrls.length,
      stations: stations,
      urlsCrawled: stationUrls.map(url => url.toString())
    };
  }

  // Return separate results for each station
  return {
    stationResults: results,
    stationCount: stationUrls.length,
    stations: stations,
    urlsCrawled: stationUrls.map(url => url.toString())
  };
};

/**
 * Crawl stations with concurrency control
 * @private
 */
const crawlStationsWithConcurrency = async (stationUrls, stations, maxConcurrent, delay, crawlerFunction, dependencies) => {
  const semaphore = createSemaphore(maxConcurrent);

  const crawlPromises = stationUrls.map((searchUrl, index) => 
    semaphore(() => crawlSingleStation(searchUrl, stations[index], index, delay, crawlerFunction, dependencies))
  );

  return await Promise.all(crawlPromises);
};

/**
 * Crawl a single station
 * @private
 */
const crawlSingleStation = async (searchUrl, stationId, index, delay, crawlerFunction, dependencies) => {
  const url = searchUrl.toString();
  
  try {
    logger.info(`Crawling station ${stationId}: ${url}`);
    
    if (index > 0) {
      await sleep(delay);
    }
    
    const rentals = await crawlerFunction(url, dependencies);
    logger.info(`Station ${stationId} completed: ${rentals.length} rentals found`);
    
    return createSuccessResult(stationId, url, rentals);
    
  } catch (error) {
    logger.error(`Station ${stationId} failed: ${error.message}`);
    return createErrorResult(stationId, url, error.message);
  }
};

/**
 * Create success result
 * @private
 */
const createSuccessResult = (stationId, url, rentals) => ({
  stationId,
  url,
  rentals: rentals.map(rental => addStationInfo(rental, stationId)),
  success: true,
  error: null
});

/**
 * Create error result
 * @private
 */
const createErrorResult = (stationId, url, errorMessage) => ({
  stationId,
  url,
  rentals: [],
  success: false,
  error: errorMessage
});

/**
 * Add station information to rental
 * @private
 */
const addStationInfo = (rental, stationId) => {
  const rentalObj = new Rental(rental);
  if (stationId) {
    rentalObj.addMetroDistance(stationId, rental.metroTitle, rental.metroValue);
  }
  return rentalObj;
};

/**
 * Sleep utility
 * @private
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Merge results from multiple stations
 * @private
 */
const mergeStationResults = (stationResults, includeStationInfo) => {
  const { rentals: mergedRentals, stats, errors } = processStationResults(stationResults);
  
  const rentals = formatRentals(mergedRentals, includeStationInfo);

  return {
    rentals,
    totalFound: stats.totalFound,
    mergedCount: mergedRentals.length,
    duplicateCount: stats.duplicateCount,
    errors,
    successfulStations: stats.successfulStations
  };
};

/**
 * Process station results into merged rentals and statistics
 * @private
 */
const processStationResults = (stationResults) => {
  const rentalMap = new Map();
  let totalFound = 0;
  let duplicateCount = 0;
  const errors = [];
  let successfulStations = 0;

  stationResults.forEach(result => {
    if (!result.success) {
      errors.push({ stationId: result.stationId, error: result.error });
      return;
    }

    successfulStations++;
    totalFound += result.rentals.length;

    result.rentals.forEach(rental => {
      const { propertyId, isDuplicate } = mergeRental(rentalMap, rental);
      if (isDuplicate) duplicateCount++;
    });
  });

  return {
    rentals: Array.from(rentalMap.values()),
    stats: { totalFound, duplicateCount, successfulStations },
    errors
  };
};

/**
 * Merge a single rental into the rental map
 * @private
 */
const mergeRental = (rentalMap, rental) => {
  const propertyId = PropertyId.fromProperty(rental);
  const key = propertyId.toString();

  if (rentalMap.has(key)) {
    const existingRental = rentalMap.get(key);
    existingRental.mergeMetroDistances(rental);
    return { propertyId, isDuplicate: true };
  }

  rentalMap.set(key, rental);
  return { propertyId, isDuplicate: false };
};

/**
 * Format rentals based on station info preference
 * @private
 */
const formatRentals = (mergedRentals, includeStationInfo) => {
  return mergedRentals.map(rental => {
    const data = rental.toJSON();
    if (!includeStationInfo) {
      delete data.metroDistances;
    }
    return data;
  });
};

/**
 * Create a semaphore for concurrency control
 * @private
 */
const createSemaphore = (maxConcurrent) => {
  let running = 0;
  const queue = [];

  return async (task) => {
    return new Promise((resolve, reject) => {
      queue.push({ task, resolve, reject });
      tryNext();
    });
  };

  function tryNext() {
    if (running >= maxConcurrent || queue.length === 0) {
      return;
    }

    running++;
    const { task, resolve, reject } = queue.shift();

    task()
      .then(result => {
        running--;
        resolve(result);
        tryNext();
      })
      .catch(error => {
        running--;
        reject(error);
        tryNext();
      });
  }
};

/**
 * Check if URL has multiple stations
 * @param {string} url - URL to check
 * @returns {boolean} True if URL has multiple stations
 */
const hasMultipleStations = (url) => {
  const searchUrl = new SearchUrl(url);
  return searchUrl.isValid && searchUrl.hasMultipleStations();
};

/**
 * Get station information from URL
 * @param {string} url - URL to analyze
 * @returns {Object} Station information
 */
const getUrlStationInfo = (url) => {
  const searchUrl = new SearchUrl(url);
  
  if (!searchUrl.isValid) {
    return { isValid: false, hasMultiple: false, stations: [] };
  }

  return {
    isValid: true,
    hasMultiple: searchUrl.hasMultipleStations(),
    stations: searchUrl.getStationIds(),
    stationCount: searchUrl.getStationIds().length
  };
};

module.exports = {
  crawlMultipleStations,
  hasMultipleStations,
  getUrlStationInfo
};