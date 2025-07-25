/**
 * Tests for multiStationCrawler module
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { createMockFunction, createMockObject } from '../helpers/mockUtils.js';

// Import functions to test
import {
  crawlMultipleStations,
  hasMultipleStations,
  getUrlStationInfo
} from '../../lib/multiStationCrawler.js';

describe('multiStationCrawler', () => {
  let mockCrawl591;
  let mockRentals1, mockRentals2;
  
  beforeEach(() => {
    // Mock rentals data for different stations
    mockRentals1 = [
      {
        title: 'Station 1 Rental 1',
        link: 'https://rent.591.com.tw/rent-detail-111.html',
        address: 'Address near Station 1',
        price: '25000',
        metroValue: '3分鐘',
        kind: '整層住家'
      },
      {
        title: 'Station 1 Rental 2', 
        link: 'https://rent.591.com.tw/rent-detail-222.html',
        address: 'Another address near Station 1',
        price: '28000',
        metroValue: '5分鐘',
        kind: '套房'
      }
    ];

    mockRentals2 = [
      {
        title: 'Station 2 Rental 1',
        link: 'https://rent.591.com.tw/rent-detail-333.html',
        address: 'Address near Station 2',
        price: '30000',
        metroValue: '2分鐘',
        kind: '整層住家'
      },
      // Duplicate rental (same link as mockRentals1[0] but different station)
      {
        title: 'Station 1 Rental 1',
        link: 'https://rent.591.com.tw/rent-detail-111.html',
        address: 'Address near Station 1',
        price: '25000',
        metroValue: '3分鐘',
        kind: '整層住家'
      }
    ];

    // Mock crawl591 function
    mockCrawl591 = createMockFunction()
      .mockImplementationOnce(() => Promise.resolve(mockRentals1))
      .mockImplementationOnce(() => Promise.resolve(mockRentals2));
  });

  describe('hasMultipleStations', () => {
    it('should return true for URLs with multiple station IDs', () => {
      const url = 'https://rent.591.com.tw/list?region=1&station=4232,4233,4234&kind=0';
      expect(hasMultipleStations(url)).toBe(true);
    });

    it('should return false for URLs with single station ID', () => {
      const url = 'https://rent.591.com.tw/list?region=1&station=4232&kind=0';
      expect(hasMultipleStations(url)).toBe(false);
    });

    it('should return false for URLs without station parameter', () => {
      const url = 'https://rent.591.com.tw/list?region=1&kind=0';
      expect(hasMultipleStations(url)).toBe(false);
    });

    it('should handle malformed URLs gracefully', () => {
      const url = 'invalid-url';
      expect(hasMultipleStations(url)).toBe(false);
    });
  });

  describe('getUrlStationInfo', () => {
    it('should extract station information from multi-station URL', () => {
      const url = 'https://rent.591.com.tw/list?region=1&station=4232,4233,4234&kind=0';
      const result = getUrlStationInfo(url);

      expect(result).toMatchObject({
        isValid: true,
        hasMultiple: true,
        stationCount: 3,
        stations: expect.arrayContaining([
          expect.stringMatching(/^\d+$/)
        ])
      });
    });

    it('should handle URLs without station info', () => {
      const url = 'https://rent.591.com.tw/list?region=1&kind=0';
      const result = getUrlStationInfo(url);

      expect(result).toMatchObject({
        isValid: true,
        hasMultiple: false,
        stationCount: 0,
        stations: []
      });
    });
  });

  describe('crawlMultipleStations', () => {
    it('should crawl multiple stations and merge results', async () => {
      const url = 'https://rent.591.com.tw/list?region=1&station=4232,4233&kind=0';
      const options = {
        maxConcurrent: 2,
        delayBetweenRequests: 100,
        mergeResults: true,
        includeStationInfo: true
      };
      const dependencies = {
        crawl591: mockCrawl591
      };

      const result = await crawlMultipleStations(url, options, dependencies);

      expect(result.rentals).toBeDefined();
      expect(result.rentals.length).toBeGreaterThan(0);
      expect(result.stationCount).toBe(2);
      expect(result.stations).toHaveLength(2);
      expect(mockCrawl591).toHaveBeenCalledTimes(2);
    });

    it('should handle crawling errors gracefully', async () => {
      const errorCrawl591 = createMockFunction()
        .mockImplementationOnce(() => Promise.resolve(mockRentals1))
        .mockImplementationOnce(() => Promise.reject(new Error('Station 2 failed')));

      const url = 'https://rent.591.com.tw/list?region=1&station=4232,4233&kind=0';
      const dependencies = { crawl591: errorCrawl591 };

      const result = await crawlMultipleStations(url, {}, dependencies);

      // Should still succeed with partial results (merging enabled by default)
      expect(result.rentals).toBeDefined();
      expect(result.rentals.length).toBeGreaterThan(0); // Should have rentals from successful station
      expect(result.stationCount).toBe(2); // Attempted to crawl 2 stations
    });

    it('should respect maxConcurrent limit', async () => {
      // Create URL with 4 stations but limit to 2 concurrent
      const url = 'https://rent.591.com.tw/list?region=1&station=4232,4233,4234,4235&kind=0';
      const options = { maxConcurrent: 2 };
      
      let activeRequests = 0;
      let maxActive = 0;
      const trackingCrawl591 = createMockFunction().mockImplementation(async () => {
        activeRequests++;
        maxActive = Math.max(maxActive, activeRequests);
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate delay
        activeRequests--;
        return [];
      });

      const dependencies = { crawl591: trackingCrawl591 };

      await crawlMultipleStations(url, options, dependencies);

      // Should never exceed maxConcurrent
      expect(maxActive).toBeLessThanOrEqual(2);
      expect(trackingCrawl591).toHaveBeenCalledTimes(4);
    });
  });
});