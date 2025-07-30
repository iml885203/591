/**
 * Crawl Service - Orchestrates crawling, rental comparison, and notifications
 */

import { crawl591 } from './crawler';
import { crawlMultipleStations, hasMultipleStations } from './multiStationCrawler';
import logger from './logger';
import { SearchUrl } from './domain/SearchUrl';
import { PropertyId } from './domain/PropertyId';
import { Distance } from './domain/Distance';
import { sendDiscordNotifications, sendErrorNotification } from './notification';
import Rental from './Rental';
import { DatabaseStorage } from './storage/DatabaseStorage';

// Type imports
import type { AxiosInstance } from 'axios';

interface CrawlConfig {
  maxRetries?: number;
  retryDelay?: number;
  notificationDelay?: number;
  timeout?: number;
}

interface CrawlDependencies {
  axios?: AxiosInstance;
  cheerio?: any;
  fs?: any;
  config?: CrawlConfig;
}

interface NotificationOptions {
  notifyMode?: string;
  filteredMode?: string;
  filter?: {
    mrtDistanceThreshold?: number;
    [key: string]: any;
  };
}

interface MultiStationOptions {
  maxConcurrent?: number;
  delayBetweenRequests?: number;
  mergeResults?: boolean;
  includeStationInfo?: boolean;
}

interface CrawlOptions extends NotificationOptions {
  multiStationOptions?: MultiStationOptions;
}

interface RentalData {
  title: string;
  link: string;
  houseType?: string;
  rooms?: string;
  metroTitle?: string;
  metroValue?: string;
  tags?: string[];
  imgUrls?: string[];
  metroDistances?: any[];
  notification?: {
    shouldNotify?: boolean;
    isSilent?: boolean;
    distanceFromMRT?: number | null;
    distanceThreshold?: number;
    isFarFromMRT?: boolean;
    willNotify?: boolean;
    sent?: boolean;
    mode?: string;
    silent?: boolean;
  };
  [key: string]: any;
}

interface CrawlResult {
  rentals: RentalData[];
  summary: {
    totalRentals: number;
    newRentals: number;
    notificationsSent: boolean;
    notifyMode: string;
    filteredMode: string;
    multiStation: boolean;
    stationCount?: number;
    stations?: string[];
    crawlErrors?: any[];
  };
}

interface MultiStationCrawlResult extends CrawlResult {
  summary: CrawlResult['summary'] & {
    multiStation: true;
    stationCount: number;
    stations: string[];
    crawlErrors: any[];
  };
}

/**
 * Filter rentals to find new ones compared to previous crawl
 * @param currentRentals - Current rentals
 * @param existingPropertyIds - Set of existing property IDs from database
 * @returns New rentals
 */
const findNewRentals = (currentRentals: RentalData[], existingPropertyIds: Set<string>): RentalData[] => {
  return currentRentals.filter(rental => {
    const propertyId = PropertyId.fromProperty(rental);
    return !existingPropertyIds.has(propertyId.toString());
  });
};

/**
 * Get rentals to notify based on mode (latest N or new only)
 * @param rentals - All rentals
 * @param maxLatest - Max latest rentals to get (null for new only mode)
 * @param url - Original URL for key generation
 * @param databaseStorage - Database storage instance
 * @returns Rentals to notify
 */
const getRentalsToNotify = async (
  rentals: RentalData[], 
  maxLatest: number | null, 
  url: string, 
  databaseStorage: DatabaseStorage
): Promise<RentalData[]> => {
  if (maxLatest) {
    // If maxLatest is specified, just take the latest N rentals
    const rentalsToNotify = rentals.slice(0, maxLatest);
    logger.info(`Will notify latest ${rentalsToNotify.length} rentals`);
    return rentalsToNotify;
  } else {
    // Get existing property IDs from database
    const searchUrl = new SearchUrl(url);
    const queryId = searchUrl.getQueryId();
    
    if (!queryId || queryId === 'unknown') {
      logger.warn('Cannot determine new rentals: invalid query ID');
      return [];
    }
    
    let existingPropertyIds: Set<string>;
    try {
      existingPropertyIds = await databaseStorage.getExistingPropertyIds(queryId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error getting existing rentals from DB: ${errorMessage}`);
      // On error, treat all as new to avoid missing notifications
      existingPropertyIds = new Set();
    }
    
    // Find new rentals
    const rentalsToNotify = findNewRentals(rentals, existingPropertyIds);
    
    logger.info(`Existing rentals in DB: ${existingPropertyIds.size}`);
    logger.info(`New rentals: ${rentalsToNotify.length}`);
    
    return rentalsToNotify;
  }
};

/**
 * Filter rentals for notification based on notification mode
 * @param rentals - Rentals to filter
 * @param notifyMode - Notification mode: 'all', 'filtered', 'none'
 * @param filteredMode - Filtered sub-mode: 'normal', 'silent', 'none'
 * @param filter - Filter options (e.g., mrtDistanceThreshold)
 * @returns Filtered rentals with notification metadata
 */
const filterRentalsForNotification = (
  rentals: RentalData[], 
  notifyMode: string, 
  filteredMode: string, 
  filter: { mrtDistanceThreshold?: number } = {}
): RentalData[] => {
  const distanceThreshold = filter.mrtDistanceThreshold;
  
  return rentals.map(rentalData => {
    const rental = new Rental({
      title: rentalData.title || '',
      link: rentalData.link,
      houseType: rentalData.houseType || '',
      rooms: rentalData.rooms || '',
      metroTitle: rentalData.metroTitle || '',
      metroValue: rentalData.metroValue || '',
      tags: rentalData.tags,
      imgUrls: rentalData.imgUrls
    });
    const distanceInMeters = rental.getDistanceToMRT();
    
    let shouldNotify = true;
    let isSilent = false;
    
    // Determine notification behavior based on mode
    if (notifyMode === 'none') {
      shouldNotify = false;
    } else if (notifyMode === 'all') {
      shouldNotify = true;
      isSilent = false;
    } else if (notifyMode === 'filtered') {
      if (rental.isFarFromMRT(distanceThreshold ?? null)) {
        if (filteredMode === 'none') {
          shouldNotify = false;
        } else if (filteredMode === 'silent') {
          shouldNotify = true;
          isSilent = true;
        } else if (filteredMode === 'normal') {
          shouldNotify = false; // Exclude far rentals in normal mode
          isSilent = false;
        }
      } else {
        shouldNotify = true;
        isSilent = false;
      }
    }
    
    return {
      ...rentalData,
      notification: {
        shouldNotify,
        isSilent,
        distanceFromMRT: distanceInMeters,
        distanceThreshold,
        isFarFromMRT: rental.isFarFromMRT(distanceThreshold ?? null)
      }
    };
  }).filter(rentalData => rentalData.notification?.shouldNotify);
};

/**
 * Add notification metadata to rentals
 * @param allRentals - All rentals
 * @param rentalsToNotify - Rentals that will be notified
 * @param notificationOptions - Notification configuration
 * @returns Rentals with notification metadata
 */
const addNotificationMetadata = (
  allRentals: RentalData[], 
  rentalsToNotify: RentalData[], 
  notificationOptions: NotificationOptions
): RentalData[] => {
  const { notifyMode = 'filtered', filteredMode = 'silent', filter = {} } = notificationOptions;
  const distanceThreshold = filter.mrtDistanceThreshold;
  const notifyIds = PropertyId.createIdSet(rentalsToNotify);
  
  return allRentals.map(rentalData => {
    const propertyId = PropertyId.fromProperty(rentalData);
    const willNotify = notifyIds.has(propertyId.toString());
    const rental = new Rental({
      title: rentalData.title || '',
      link: rentalData.link,
      houseType: rentalData.houseType || '',
      rooms: rentalData.rooms || '',
      metroTitle: rentalData.metroTitle || '',
      metroValue: rentalData.metroValue || '',
      tags: rentalData.tags,
      imgUrls: rentalData.imgUrls
    });
    const distanceInMeters = rental.getDistanceToMRT();
    
    // For metadata purposes, determine what would have happened
    let isSilent = false;
    if (willNotify && rental.shouldBeSilentNotification(notifyMode, filteredMode, distanceThreshold ?? null)) {
      isSilent = true;
    }
    
    return {
      ...rentalData,
      notification: {
        willNotify,
        isSilent,
        distanceFromMRT: distanceInMeters,
        distanceThreshold,
        isFarFromMRT: rental.isFarFromMRT(distanceThreshold ?? null)
      }
    };
  });
};

/**
 * Complete crawl service with notifications and metadata
 * @param url - URL to crawl
 * @param maxLatest - Max latest rentals (null for new only mode)
 * @param options - Service options
 * @param dependencies - Injected dependencies
 * @returns Crawl result with notification metadata
 */
export const crawlWithNotifications = async (
  url: string, 
  maxLatest: number | null = null, 
  options: CrawlOptions = {}, 
  dependencies: CrawlDependencies = {}
): Promise<CrawlResult> => {
  // Check if URL has multiple stations
  const isMultiStation = hasMultipleStations(url);
  
  if (isMultiStation) {
    logger.info('Multi-station URL detected, using batch crawler');
    return await crawlWithNotificationsMultiStation(url, maxLatest, options, dependencies);
  } else {
    return await crawlWithNotificationsSingle(url, maxLatest, options, dependencies);
  }
};

/**
 * Multi-station crawl service with notifications
 */
export const crawlWithNotificationsMultiStation = async (
  url: string, 
  maxLatest: number | null = null, 
  options: CrawlOptions = {}, 
  dependencies: CrawlDependencies = {}
): Promise<MultiStationCrawlResult> => {
  const { notifyMode = 'filtered', filteredMode = 'silent', filter, multiStationOptions = {} } = options;
  const {
    axios = require('axios'),
    cheerio = require('cheerio'),
    fs = require('fs-extra'),
    config = {
      maxRetries: 3,
      retryDelay: 2000,
      notificationDelay: 1000,
      timeout: 30000
    }
  } = dependencies;

  const {
    maxConcurrent = 3,
    delayBetweenRequests = 1000,
    mergeResults = true,
    includeStationInfo = true
  } = multiStationOptions;

  let databaseStorage: DatabaseStorage | null = null;
  try {
    // Initialize database storage early for checking existing rentals
    databaseStorage = new DatabaseStorage();
    await databaseStorage.initialize();
    // Crawl all stations
    const crawlResult = await crawlMultipleStations(url, {
      maxConcurrent,
      delayBetweenRequests,
      mergeResults,
      includeStationInfo
    }, { axios, cheerio, config });

    const { rentals: allRentals = [], stationCount, stations, errors } = crawlResult;
    
    logger.info(`Multi-station crawl completed: ${allRentals.length} rentals from ${stationCount} stations`);
    
    if (errors && errors.length > 0) {
      logger.warn(`Errors occurred in ${errors.length} stations`);
    }

    // Get rentals to notify based on new/latest logic
    const candidateRentals = await getRentalsToNotify(allRentals, maxLatest, url, databaseStorage);
    
    // Filter rentals based on notification mode
    const rentalsToNotify = notifyMode === 'none' ? [] : 
      filterRentalsForNotification(candidateRentals, notifyMode, filteredMode, filter);
    
    // Add notification metadata to all rentals for response
    const rentalsWithMetadata = addNotificationMetadata(allRentals, rentalsToNotify, { notifyMode, filteredMode, filter });
    
    // Log notification info
    logNotificationInfo(candidateRentals, rentalsToNotify, notifyMode, filteredMode);
    
    // Send notifications if needed
    if (rentalsToNotify.length > 0) {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (webhookUrl) {
        await sendDiscordNotifications(rentalsToNotify, url, webhookUrl, axios, config, filter);
      }
    }
    

    // Save to query storage for historical tracking
    try {
      await databaseStorage.saveCrawlResults(url, allRentals, {
        maxLatest,
        notifyMode,
        filteredMode,
        filter,
        multiStationOptions,
        newRentals: rentalsToNotify.length,
        notificationsSent: rentalsToNotify.length > 0,
        multiStation: true,
        stationCount,
        stations,
        crawlErrors: errors || []
      });
    } catch (queryError) {
      const errorMessage = queryError instanceof Error ? queryError.message : String(queryError);
      logger.warn(`Query storage error: ${errorMessage}`);
    }
    
    return {
      rentals: rentalsWithMetadata,
      summary: {
        totalRentals: allRentals.length,
        newRentals: rentalsToNotify.length,
        notificationsSent: rentalsToNotify.length > 0,
        notifyMode,
        filteredMode,
        multiStation: true,
        stationCount,
        stations,
        crawlErrors: errors || []
      }
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Multi-station crawl service error: ${errorMessage}`);
    
    // Send error notification to Discord
    if (notifyMode !== 'none') {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (webhookUrl) {
        await sendErrorNotification(url, errorMessage, webhookUrl, axios || require('axios'));
      }
    }
    
    throw error;
  } finally {
    // Always close database connection
    if (databaseStorage) {
      await databaseStorage.close();
    }
  }
};

/**
 * Single station crawl service with notifications (original logic)
 */
export const crawlWithNotificationsSingle = async (
  url: string, 
  maxLatest: number | null = null, 
  options: CrawlOptions = {}, 
  dependencies: CrawlDependencies = {}
): Promise<CrawlResult> => {
  const { notifyMode = 'filtered', filteredMode = 'silent', filter } = options;
  const {
    axios = require('axios'),
    cheerio = require('cheerio'),
    fs = require('fs-extra'),
    config = {
      maxRetries: 3,
      retryDelay: 2000,
      notificationDelay: 1000,
      timeout: 30000
    }
  } = dependencies;

  let databaseStorage: DatabaseStorage | null = null;
  try {
    // Initialize database storage early for checking existing rentals
    databaseStorage = new DatabaseStorage();
    await databaseStorage.initialize();
    
    // Crawl rentals
    const allRentals = await crawl591(url, { axios, cheerio, config });
    
    // Get rentals to notify based on new/latest logic
    const candidateRentals = await getRentalsToNotify(allRentals, maxLatest, url, databaseStorage);
    
    // Filter rentals based on notification mode
    const rentalsToNotify = notifyMode === 'none' ? [] : 
      filterRentalsForNotification(candidateRentals, notifyMode, filteredMode, filter);
    
    // Add notification metadata to all rentals for response
    const rentalsWithMetadata = addNotificationMetadata(allRentals, rentalsToNotify, { notifyMode, filteredMode, filter });
    
    // Log notification info
    logNotificationInfo(candidateRentals, rentalsToNotify, notifyMode, filteredMode);
    
    // Send notifications if needed
    if (rentalsToNotify.length > 0) {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (webhookUrl) {
        await sendDiscordNotifications(rentalsToNotify, url, webhookUrl, axios, config, filter);
      }
    }
    
    // DEBUG LOG: Check crawled rentals before saving
    if (allRentals && allRentals.length > 0) {
      const sampleRentals = allRentals.slice(0, 3);
      console.log(`[CRAWL SERVICE DEBUG] About to save ${allRentals.length} crawled rentals`);
      sampleRentals.forEach((rental, index) => {
        console.log(`[CRAWL SERVICE DEBUG] Crawled Rental ${index + 1}:`);
        console.log(`[CRAWL SERVICE DEBUG]   Title: "${rental.title}"`);
        console.log(`[CRAWL SERVICE DEBUG]   houseType: "${rental.houseType}" (type: ${typeof rental.houseType})`);
        console.log(`[CRAWL SERVICE DEBUG]   rooms: "${rental.rooms}" (type: ${typeof rental.rooms})`);
      });
    }

    // Save to query storage for historical tracking (reuse existing connection)
    try {
      await databaseStorage.saveCrawlResults(url, allRentals, {
        maxLatest,
        notifyMode,
        filteredMode,
        filter,
        newRentals: rentalsToNotify.length,
        notificationsSent: rentalsToNotify.length > 0
      });
    } catch (queryError) {
      const errorMessage = queryError instanceof Error ? queryError.message : String(queryError);
      logger.warn(`Query storage error: ${errorMessage}`);
    }
    
    return {
      rentals: rentalsWithMetadata,
      summary: {
        totalRentals: allRentals.length,
        newRentals: rentalsToNotify.length,
        notificationsSent: rentalsToNotify.length > 0,
        notifyMode,
        filteredMode,
        multiStation: false
      }
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Crawl service error: ${errorMessage}`);
    
    // Send error notification to Discord
    if (notifyMode !== 'none') {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (webhookUrl) {
        await sendErrorNotification(url, errorMessage, webhookUrl, axios || require('axios'));
      }
    }
    
    throw error;
  } finally {
    // Always close database connection
    if (databaseStorage) {
      await databaseStorage.close();
    }
  }
};

/**
 * Log notification information
 */
const logNotificationInfo = (
  candidateRentals: RentalData[], 
  rentalsToNotify: RentalData[], 
  notifyMode: string, 
  filteredMode: string
): void => {
  if (candidateRentals.length > 0) {
    const skippedCount = candidateRentals.length - rentalsToNotify.length;
    
    logger.info(`Notification mode: ${notifyMode}${notifyMode === 'filtered' ? `/${filteredMode}` : ''}`);
    logger.info(`Candidates: ${candidateRentals.length}, Will notify: ${rentalsToNotify.length}${skippedCount > 0 ? `, Filtered out: ${skippedCount}` : ''}`);
    
    // Show sample of rentals that will be notified
    if (rentalsToNotify.length > 0) {
      const notifySampleCount = Math.min(3, rentalsToNotify.length);
      logger.info(`Sample rentals to notify (${notifySampleCount}): ${rentalsToNotify.slice(0, notifySampleCount).map(p => p.title).join(' | ')}`);
    }
    
    // Show filtered out rentals with detailed info
    if (skippedCount > 0) {
      const filteredRentals = candidateRentals.filter(rental => 
        !rentalsToNotify.some(notifyRental => notifyRental.link === rental.link)
      );
      
      logger.info(`Filtered out rentals (${filteredRentals.length}):`);
      filteredRentals.forEach((rental, index) => {
        const distance = Distance.fromMetroValue(rental.metroValue);
        const distanceInMeters = distance ? distance.toMeters() : null;
        const distanceInfo = distanceInMeters ? ` (${distanceInMeters}m from MRT)` : '';
        logger.info(`✗ Filtered ${index + 1}/${filteredRentals.length}${distanceInfo}: ${rental.title}`);
      });
    }
  } else {
    logger.info('No new rentals to notify');
  }
};

// Export utility functions for testing
export { findNewRentals, getRentalsToNotify, addNotificationMetadata, filterRentalsForNotification };