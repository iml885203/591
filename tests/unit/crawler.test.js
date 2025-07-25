/**
 * Unit tests for crawler.js - Pure crawling functionality
 */

const { crawl591 } = require('../../lib/crawler');

// Mock all dependencies
jest.mock('../../lib/utils', () => ({
  logWithTimestamp: jest.fn()
}));

jest.mock('../../lib/parser', () => ({
  parseRentals: jest.fn()
}));

jest.mock('../../lib/fetcher', () => ({
  fetchWithRetry: jest.fn(),
  getDefaultHeaders: jest.fn()
}));

jest.mock('../../lib/domain/SearchUrl', () => ({
  isValid: jest.fn()
}));

const { logWithTimestamp } = require('../../lib/utils');
const SearchUrl = require('../../lib/domain/SearchUrl');
const { parseRentals } = require('../../lib/parser');
const { fetchWithRetry, getDefaultHeaders } = require('../../lib/fetcher');

describe('crawler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('crawl591', () => {
    it('should successfully crawl and return rentals', async () => {
      const mockRentals = [
        { title: 'Rental 1', link: 'https://rent.591.com.tw/house/1' },
        { title: 'Rental 2', link: 'https://rent.591.com.tw/house/2' }
      ];

      SearchUrl.isValid.mockReturnValue(true);
      getDefaultHeaders.mockReturnValue({ 'User-Agent': 'test-agent' });
      fetchWithRetry.mockResolvedValue({ data: '<html>mock</html>' });
      parseRentals.mockReturnValue(mockRentals);

      const mockAxios = jest.fn();
      const mockCheerio = jest.fn();

      const result = await crawl591('https://rent.591.com.tw/list?region=1', {
        axios: mockAxios,
        cheerio: mockCheerio
      });

      expect(SearchUrl.isValid).toHaveBeenCalledWith('https://rent.591.com.tw/list?region=1');
      expect(fetchWithRetry).toHaveBeenCalledWith(
        'https://rent.591.com.tw/list?region=1',
        { headers: { 'User-Agent': 'test-agent' } },
        mockAxios,
        expect.any(Object)
      );
      expect(parseRentals).toHaveBeenCalledWith('<html>mock</html>', mockCheerio);
      expect(result).toEqual(mockRentals);
      expect(logWithTimestamp).toHaveBeenCalledWith('Found 2 rentals');
    });

    it('should handle invalid URL error', async () => {
      SearchUrl.isValid.mockReturnValue(false);

      await expect(crawl591('https://invalid.com')).rejects.toThrow('Please provide a valid 591.com.tw URL');
      expect(logWithTimestamp).toHaveBeenCalledWith('Crawl error: Please provide a valid 591.com.tw URL', 'ERROR');
    });

    it('should handle fetch error', async () => {
      const error = new Error('Network error');
      
      SearchUrl.isValid.mockReturnValue(true);
      getDefaultHeaders.mockReturnValue({ 'User-Agent': 'test-agent' });
      fetchWithRetry.mockRejectedValue(error);

      await expect(crawl591('https://rent.591.com.tw/list')).rejects.toThrow('Network error');
      expect(logWithTimestamp).toHaveBeenCalledWith('Crawl error: Network error', 'ERROR');
    });

    it('should use default dependencies when not provided', async () => {
      const mockRentals = [];
      
      SearchUrl.isValid.mockReturnValue(true);
      getDefaultHeaders.mockReturnValue({ 'User-Agent': 'test-agent' });
      fetchWithRetry.mockResolvedValue({ data: '<html>empty</html>' });
      parseRentals.mockReturnValue(mockRentals);

      const result = await crawl591('https://rent.591.com.tw/list');

      expect(result).toEqual(mockRentals);
      expect(logWithTimestamp).toHaveBeenCalledWith('Found 0 rentals');
    });
  });
});