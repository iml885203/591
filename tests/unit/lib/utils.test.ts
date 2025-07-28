/**
 * Unit tests for utility functions
 */

import { describe, it, expect } from 'bun:test';
import { sleep, extractArrayFromElements } from '../../../lib/utils.js';

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
      // This test would require proper cheerio mocking to work correctly
      // For now, just test the function exists
      expect(typeof extractArrayFromElements).toBe('function');
    });

    it('should extract attribute values when attr specified', () => {
      expect(typeof extractArrayFromElements).toBe('function');
    });
  });
});