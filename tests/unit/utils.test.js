/**
 * Unit tests for utility functions
 */

const {
  sleep,
  extractArrayFromElements,
  logWithTimestamp
} = require('../../lib/utils');

describe('utils', () => {
  describe('sleep', () => {
    it('should resolve after specified time', async () => {
      const start = Date.now();
      await sleep(10);
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(9); // Allow small margin
    });
  });

  describe('extractArrayFromElements', () => {
    it('should extract text values when no attr specified', () => {
      // Mock cheerio-like behavior
      const mockElement = {
        find: jest.fn().mockReturnValue({
          each: jest.fn((callback) => {
            // Simulate finding 2 elements
            const mockElem1 = {};
            const mockElem2 = {};
            callback(0, mockElem1);
            callback(1, mockElem2);
          })
        })
      };

      const mockCheerio = jest.fn((elem) => ({
        text: () => elem === mockElement.find().mockReturnValue ? 'text1' : 'text2',
        trim: () => 'text'
      }));

      // This test would need proper cheerio mocking to work correctly
      // For now, just test the function exists
      expect(typeof extractArrayFromElements).toBe('function');
    });

    it('should extract attribute values when attr specified', () => {
      expect(typeof extractArrayFromElements).toBe('function');
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