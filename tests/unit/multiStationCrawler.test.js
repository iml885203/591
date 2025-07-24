/**
 * Tests for Multi-Station Crawler Service
 */

const { 
  crawlMultipleStations, 
  hasMultipleStations, 
  getUrlStationInfo 
} = require('../../lib/multiStationCrawler');

describe('MultiStationCrawler', () => {
  
  describe('hasMultipleStations', () => {
    test('should return true for URLs with multiple comma-separated stations', () => {
      const url = 'https://rent.591.com.tw/list?region=3&station=4232,4233,4234,4231';
      expect(hasMultipleStations(url)).toBe(true);
    });

    test('should return true for URLs with multiple station parameters', () => {
      const url = 'https://rent.591.com.tw/list?region=3&station=4232&station=4233';
      expect(hasMultipleStations(url)).toBe(true);
    });

    test('should return false for URLs with single station', () => {
      const url = 'https://rent.591.com.tw/list?region=3&station=4232';
      expect(hasMultipleStations(url)).toBe(false);
    });

    test('should return false for URLs without station parameter', () => {
      const url = 'https://rent.591.com.tw/list?region=3';
      expect(hasMultipleStations(url)).toBe(false);
    });

    test('should return false for invalid URLs', () => {
      expect(hasMultipleStations('invalid-url')).toBe(false);
      expect(hasMultipleStations('')).toBe(false);
      expect(hasMultipleStations(null)).toBe(false);
    });
  });

  describe('getUrlStationInfo', () => {
    test('should extract station info from multi-station URL', () => {
      const url = 'https://rent.591.com.tw/list?region=3&station=4232,4233,4234';
      const info = getUrlStationInfo(url);
      
      expect(info.isValid).toBe(true);
      expect(info.hasMultiple).toBe(true);
      expect(info.stations).toEqual(['4232', '4233', '4234']);
      expect(info.stationCount).toBe(3);
    });

    test('should handle single station URL', () => {
      const url = 'https://rent.591.com.tw/list?region=3&station=4232';
      const info = getUrlStationInfo(url);
      
      expect(info.isValid).toBe(true);
      expect(info.hasMultiple).toBe(false);
      expect(info.stations).toEqual(['4232']);
      expect(info.stationCount).toBe(1);
    });

    test('should handle URLs without stations', () => {
      const url = 'https://rent.591.com.tw/list?region=3';
      const info = getUrlStationInfo(url);
      
      expect(info.isValid).toBe(true);
      expect(info.hasMultiple).toBe(false);
      expect(info.stations).toEqual([]);
      expect(info.stationCount).toBe(0);
    });

    test('should handle invalid URLs', () => {
      const info = getUrlStationInfo('invalid-url');
      
      expect(info.isValid).toBe(false);
      expect(info.hasMultiple).toBe(false);
      expect(info.stations).toEqual([]);
    });
  });

  describe('crawlMultipleStations', () => {
    const mockRental1 = {
      title: 'Test Rental 1',
      link: 'https://rent.591.com.tw/12345',
      metroTitle: '距台北車站',
      metroValue: '500公尺',
      rooms: '2房1廳'
    };

    const mockRental2 = {
      title: 'Test Rental 2', 
      link: 'https://rent.591.com.tw/67890',
      metroTitle: '距西門站',
      metroValue: '300公尺',
      rooms: '1房1廳'
    };

    const mockCrawl591 = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should handle single station URL by returning original results', async () => {
      const url = 'https://rent.591.com.tw/list?region=3&station=4232';
      mockCrawl591.mockResolvedValue([mockRental1]);

      const result = await crawlMultipleStations(url, {}, {
        crawl591: mockCrawl591
      });

      expect(result.rentals).toEqual([mockRental1]);
      expect(result.stationCount).toBe(1);
      expect(result.mergedCount).toBe(0);
      expect(mockCrawl591).toHaveBeenCalledTimes(1);
    });

    test('should crawl multiple stations and merge results', async () => {
      const url = 'https://rent.591.com.tw/list?region=3&station=4232,4233';
      
      // Mock different results for each station
      mockCrawl591
        .mockResolvedValueOnce([mockRental1]) // Station 4232
        .mockResolvedValueOnce([mockRental2, mockRental1]); // Station 4233 (with duplicate)

      const result = await crawlMultipleStations(url, {
        maxConcurrent: 2,
        delayBetweenRequests: 100
      }, {
        crawl591: mockCrawl591
      });

      expect(result.stationCount).toBe(2);
      expect(result.stations).toEqual(['4232', '4233']);
      expect(result.rentals).toHaveLength(2); // Should merge duplicates
      expect(result.duplicateCount).toBe(1);
      expect(result.totalFound).toBe(3);
      expect(result.mergedCount).toBe(2);
      
      // Should have called crawl591 twice
      expect(mockCrawl591).toHaveBeenCalledTimes(2);
    });

    test('should handle crawl errors gracefully', async () => {
      const url = 'https://rent.591.com.tw/list?region=3&station=4232,4233';
      
      mockCrawl591
        .mockResolvedValueOnce([mockRental1]) // Station 4232 succeeds
        .mockRejectedValueOnce(new Error('Network error')); // Station 4233 fails

      const result = await crawlMultipleStations(url, {}, {
        crawl591: mockCrawl591
      });

      expect(result.rentals).toEqual([mockRental1]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Network error');
      expect(result.successfulStations).toBe(1);
    });

    test('should apply concurrency limits', async () => {
      const url = 'https://rent.591.com.tw/list?region=3&station=1,2,3,4,5';
      let concurrentCalls = 0;
      let maxConcurrent = 0;

      mockCrawl591.mockImplementation(async () => {
        concurrentCalls++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCalls);
        
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 50));
        
        concurrentCalls--;
        return [mockRental1];
      });

      await crawlMultipleStations(url, {
        maxConcurrent: 2,
        delayBetweenRequests: 10
      }, {
        crawl591: mockCrawl591
      });

      // Should not exceed concurrency limit
      expect(maxConcurrent).toBeLessThanOrEqual(2);
      expect(mockCrawl591).toHaveBeenCalledTimes(5);
    });

    test('should add station information to rentals', async () => {
      const url = 'https://rent.591.com.tw/list?region=3&station=4232,4233';
      
      mockCrawl591
        .mockResolvedValueOnce([mockRental1])
        .mockResolvedValueOnce([mockRental2]);

      const result = await crawlMultipleStations(url, {
        includeStationInfo: true
      }, {
        crawl591: mockCrawl591
      });

      // Check that rentals have station distance info
      const rental1 = result.rentals.find(r => r.title === 'Test Rental 1');
      const rental2 = result.rentals.find(r => r.title === 'Test Rental 2');
      
      expect(rental1.metroDistances).toBeDefined();
      expect(rental2.metroDistances).toBeDefined();
    });

    test('should validate URL before processing', async () => {
      const invalidUrl = 'https://invalid-site.com/search';
      
      await expect(crawlMultipleStations(invalidUrl)).rejects.toThrow('Invalid 591.com.tw URL');
    });
  });
});