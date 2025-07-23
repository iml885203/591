/**
 * Unit tests for utility functions
 */

const {
  sleep,
  extractArrayFromElements,
  getPropertyId,
  isValid591Url,
  generateUrlKey,
  logWithTimestamp
} = require('../../lib/utils');

describe('utils', () => {
  describe('sleep', () => {
    it('should resolve after specified time', async () => {
      const startTime = Date.now();
      await sleep(10);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(8);
    });
  });

  describe('extractArrayFromElements', () => {
    let mockCheerio, mockElement;

    beforeEach(() => {
      mockCheerio = jest.fn();
      mockElement = {
        find: jest.fn().mockReturnValue({
          each: jest.fn()
        })
      };
    });

    it('should extract text values when no attr specified', () => {
      const mockElements = [
        { text: () => 'Item 1  ' },
        { text: () => '  Item 2' },
        { text: () => '' }
      ];
      
      mockElement.find().each.mockImplementation((callback) => {
        mockElements.forEach((el, i) => callback(i, el));
      });
      
      mockCheerio.mockImplementation((element) => ({
        text: () => element.text().trim(),
        attr: () => null
      }));

      const result = extractArrayFromElements(mockElement, '.test', null, mockCheerio);
      
      expect(result).toEqual(['Item 1', 'Item 2']);
      expect(mockElement.find).toHaveBeenCalledWith('.test');
    });

    it('should extract attribute values when attr specified', () => {
      const mockElements = [
        { attr: () => 'attr1' },
        { attr: () => 'attr2' },
        { attr: () => null }
      ];
      
      mockElement.find().each.mockImplementation((callback) => {
        mockElements.forEach((el, i) => callback(i, el));
      });
      
      mockCheerio.mockImplementation((element) => ({
        text: () => null,
        attr: (attrName) => element.attr()
      }));

      const result = extractArrayFromElements(mockElement, '.test', 'data-src', mockCheerio);
      
      expect(result).toEqual(['attr1', 'attr2']);
    });
  });

  describe('getPropertyId', () => {
    it('should extract ID from link when available', () => {
      const rental = {
        title: 'Test Rental',
        link: 'https://rent.591.com.tw/19284954',
        metroValue: '500公尺'
      };

      const result = getPropertyId(rental);
      expect(result).toBe('19284954');
    });

    it('should create ID from title and metro when link has no ID', () => {
      const rental = {
        title: 'Test Rental',
        link: 'https://rent.591.com.tw/invalid',
        metroValue: '500公尺'
      };

      const result = getPropertyId(rental);
      expect(result).toBe('Test-Rental-500公尺');
    });

    it('should handle spaces in title and metro', () => {
      const rental = {
        title: 'Test Rental With Spaces',
        metroValue: '500 公尺 距離'
      };

      const result = getPropertyId(rental);
      expect(result).toBe('Test-Rental-With-Spaces-500-公尺-距離');
    });
  });

  describe('isValid591Url', () => {
    it('should return true for valid 591.com.tw URLs', () => {
      expect(isValid591Url('https://rent.591.com.tw/list')).toBe(true);
      expect(isValid591Url('https://sale.591.com.tw/list')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValid591Url('https://google.com')).toBe(false);
      expect(isValid591Url('')).toBe(false);
      expect(isValid591Url(null)).toBe(false);
      expect(isValid591Url(undefined)).toBe(false);
      expect(isValid591Url(123)).toBe(false);
    });
  });

  describe('generateUrlKey', () => {
    it('should generate consistent base64 key from URL', () => {
      const url = 'https://rent.591.com.tw/list?region=1';
      const result = generateUrlKey(url);
      
      expect(result).toBe('aHR0cHM6Ly9yZW50LjU5');
      expect(result.length).toBe(20);
    });

    it('should generate different keys for different URLs', () => {
      const url1 = 'https://rent.591.com.tw/list?region=1';
      const url2 = 'https://sale.591.com.tw/list?region=1'; // More different URL
      
      const key1 = generateUrlKey(url1);
      const key2 = generateUrlKey(url2);
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('logWithTimestamp', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log message with timestamp and default INFO level', () => {
      logWithTimestamp('test message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] test message/)
      );
    });

    it('should log message with custom level', () => {
      logWithTimestamp('error message', 'ERROR');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\] error message/)
      );
    });
  });
});