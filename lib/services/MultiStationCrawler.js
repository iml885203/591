/**
 * Multi-Station Crawler Service
 * Handles parallel crawling of multiple URLs with different station parameters
 */

const { crawl591 } = require('../core/crawler');
const SearchUrl = require('../domain/SearchUrl');
const PropertyId = require('../domain/PropertyId');
const Rental = require('../domain/Rental');
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
  const results = [];
  const semaphore = createSemaphore(maxConcurrent);

  const crawlPromises = stationUrls.map(async (searchUrl, index) => {
    return semaphore(async () => {
      const stationId = stations[index] || null;
      const url = searchUrl.toString();
      
      try {
        logger.info(`Crawling station ${stationId}: ${url}`);
        
        // Add delay between requests to be respectful
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const rentals = await crawlerFunction(url, dependencies);
        
        logger.info(`Station ${stationId} completed: ${rentals.length} rentals found`);
        
        return {
          stationId,
          url,
          rentals: rentals.map(rental => {
            // Add station information to each rental
            const rentalObj = new Rental(rental);
            if (stationId) {
              rentalObj.addMetroDistance(stationId, rental.metroTitle, rental.metroValue);
            }
            return rentalObj;
          }),
          success: true,
          error: null
        };
        
      } catch (error) {
        logger.error(`Station ${stationId} failed: ${error.message}`);
        return {
          stationId,
          url,
          rentals: [],
          success: false,
          error: error.message
        };
      }
    });
  });

  const stationResults = await Promise.all(crawlPromises);
  return stationResults;
};

/**
 * Merge results from multiple stations
 * @private
 */
const mergeStationResults = (stationResults, includeStationInfo) => {
  const rentalMap = new Map(); // PropertyId -> Rental
  let totalFound = 0;
  let duplicateCount = 0;
  const errors = [];

  stationResults.forEach(result => {
    if (!result.success) {
      errors.push({ stationId: result.stationId, error: result.error });
      return;
    }

    totalFound += result.rentals.length;

    result.rentals.forEach(rental => {
      const propertyId = PropertyId.fromProperty(rental);
      const key = propertyId.toString();

      if (rentalMap.has(key)) {
        // Merge metro distance information
        const existingRental = rentalMap.get(key);
        existingRental.mergeMetroDistances(rental);
        duplicateCount++;
      } else {
        // New rental
        rentalMap.set(key, rental);
      }
    });
  });

  const mergedRentals = Array.from(rentalMap.values());
  
  // Convert back to plain objects if needed
  const rentals = includeStationInfo ? 
    mergedRentals.map(rental => rental.toJSON()) :
    mergedRentals.map(rental => {
      // Remove station-specific info for backward compatibility
      const data = rental.toJSON();
      delete data.metroDistances;
      return data;
    });

  return {
    rentals,
    totalFound,
    mergedCount: mergedRentals.length,
    duplicateCount,
    errors,
    successfulStations: stationResults.filter(r => r.success).length
  };
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