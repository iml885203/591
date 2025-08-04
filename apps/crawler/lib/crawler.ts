/**
 * Core crawler logic for 591.com.tw - Pure data fetching and parsing
 */

import { logger } from './logger';
import { SearchUrl } from './domain/SearchUrl';
import * as fs from 'fs';
import * as path from 'path';

// Dynamic imports for dependencies
import type { AxiosInstance, AxiosResponse } from 'axios';
import type { CheerioAPI } from 'cheerio';

interface CrawlConfig {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

interface CrawlDependencies {
  axios?: AxiosInstance;
  cheerio?: any;
  config?: CrawlConfig;
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
  [key: string]: any;
}

interface HttpResponse {
  data: string;
}

/**
 * Main crawl function for 591.com.tw - Only handles data fetching and parsing
 * @param url - URL to crawl
 * @param dependencies - Injected dependencies
 * @returns All found rentals
 */
export const crawl591 = async (url: string, dependencies: CrawlDependencies = {}): Promise<RentalData[]> => {
  const {
    axios = require('axios') as AxiosInstance,
    cheerio = require('cheerio'),
    config = {
      maxRetries: 3,
      retryDelay: 2000,
      timeout: 30000
    }
  } = dependencies;

  try {
    logger.info(`Starting crawl for URL: ${url}`);
    
    // Validate URL
    if (!SearchUrl.isValid(url)) {
      throw new Error('Please provide a valid 591.com.tw URL');
    }

    // Import helper functions
    const { parseRentals } = require('./parser');
    const { fetchWithRetry, getDefaultHeaders } = require('./fetcher');

    // Fetch HTML content
    const response: HttpResponse = await fetchWithRetry(url, {
      headers: getDefaultHeaders()
    }, axios, config);

    // Save HTML in production for debugging (optional)
    if (process.env.NODE_ENV === 'production' && process.env.SAVE_DEBUG_HTML === 'true') {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const debugDir = '/app/debug-html';
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir, { recursive: true });
        }
        const filename = `crawl-${timestamp}.html`;
        fs.writeFileSync(path.join(debugDir, filename), response.data);
        logger.info(`💾 Debug HTML saved: ${filename}`);
      } catch (saveError) {
        const errorMessage = saveError instanceof Error ? saveError.message : String(saveError);
        logger.warn(`⚠️  Failed to save debug HTML: ${errorMessage}`);
      }
    }

    // Parse rentals from HTML
    const rentals: RentalData[] = parseRentals(response.data, cheerio);
    logger.info(`Found ${rentals.length} rentals`);
    
    return rentals;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Crawl error: ${errorMessage}`);
    throw error;
  }
};