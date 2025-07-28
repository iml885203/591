/**
 * Unit tests for Multi-Station workflow utilities
 */

import { describe, test, expect } from '@jest/globals';
import { hasMultipleStations, getUrlStationInfo } from '../../../lib/multiStationCrawler';

interface StationInfo {
  isValid: boolean;
  hasMultiple: boolean;
  stationCount: number;
  stations: string[];
}

describe('Multi-Station Utilities', () => {
  describe('hasMultipleStations', () => {
    test('should return true for multi-station URLs', () => {
      const multiStationUrl = 'https://rent.591.com.tw/list?region=3&station=4232,4233';
      expect(hasMultipleStations(multiStationUrl)).toBe(true);
    });

    test('should return false for single station URLs', () => {
      const singleStationUrl = 'https://rent.591.com.tw/list?region=3&station=4232';
      expect(hasMultipleStations(singleStationUrl)).toBe(false);
    });

    test('should return false for URLs without station parameter', () => {
      const noStationUrl = 'https://rent.591.com.tw/list?region=3';
      expect(hasMultipleStations(noStationUrl)).toBe(false);
    });
  });

  describe('getUrlStationInfo', () => {
    test('should extract correct information from multi-station URL', () => {
      const url = 'https://rent.591.com.tw/list?region=3&station=4232,4233,4234';
      const info: StationInfo = getUrlStationInfo(url);
      
      expect(info).toEqual({
        isValid: true,
        hasMultiple: true,
        stationCount: 3,
        stations: ['4232', '4233', '4234']
      });
    });

    test('should extract correct information from single-station URL', () => {
      const url = 'https://rent.591.com.tw/list?region=3&station=4232';
      const info: StationInfo = getUrlStationInfo(url);
      
      expect(info).toEqual({
        isValid: true,
        hasMultiple: false,
        stationCount: 1,
        stations: ['4232']
      });
    });

    test('should handle URLs without station parameter', () => {
      const url = 'https://rent.591.com.tw/list?region=3';
      const info: StationInfo = getUrlStationInfo(url);
      
      expect(info).toEqual({
        isValid: true,
        hasMultiple: false,
        stationCount: 0,
        stations: []
      });
    });
  });
});