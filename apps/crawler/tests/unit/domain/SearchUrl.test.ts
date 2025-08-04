/**
 * Unit tests for SearchUrl domain model
 */

import { describe, test, expect } from '@jest/globals';
import SearchUrl from '../../../lib/domain/SearchUrl';

interface StationInfo {
  hasMultiple: boolean;
  stationIds: string[];
  urlCount: number;
}

describe('SearchUrl Domain Model', () => {
  describe('constructor and basic properties', () => {
    test('should correctly identify multi-station URLs', () => {
      const multiStationUrl = 'https://rent.591.com.tw/list?region=3&station=4232,4233,4234,4231';
      const searchUrl = new SearchUrl(multiStationUrl);
      
      expect(searchUrl.isValid).toBe(true);
      expect(searchUrl.hasMultipleStations()).toBe(true);
      expect(searchUrl.getStationIds()).toEqual(['4232', '4233', '4234', '4231']);
    });

    test('should correctly identify single-station URLs', () => {
      const singleStationUrl = 'https://rent.591.com.tw/list?region=3&station=4232';
      const searchUrl = new SearchUrl(singleStationUrl);
      
      expect(searchUrl.isValid).toBe(true);
      expect(searchUrl.hasMultipleStations()).toBe(false);
      expect(searchUrl.getStationIds()).toEqual(['4232']);
    });

    test('should handle URLs without station parameter', () => {
      const noStationUrl = 'https://rent.591.com.tw/list?region=3';
      const searchUrl = new SearchUrl(noStationUrl);
      
      expect(searchUrl.isValid).toBe(true);
      expect(searchUrl.hasMultipleStations()).toBe(false);
      expect(searchUrl.getStationIds()).toEqual([]);
    });
  });

  describe('URL manipulation', () => {
    test('should split multi-station URL into individual URLs', () => {
      const multiStationUrl = 'https://rent.591.com.tw/list?region=3&station=4232,4233';
      const searchUrl = new SearchUrl(multiStationUrl);
      const splitUrls = searchUrl.splitByStations();
      
      expect(splitUrls).toHaveLength(2);
      expect(splitUrls[0].toString()).toContain('station=4232');
      expect(splitUrls[0].toString()).not.toContain('station=4233');
      expect(splitUrls[1].toString()).toContain('station=4233');
      expect(splitUrls[1].toString()).not.toContain('station=4232');
    });

    test('should return single URL for single-station input', () => {
      const singleStationUrl = 'https://rent.591.com.tw/list?region=3&station=4232';
      const searchUrl = new SearchUrl(singleStationUrl);
      const splitUrls = searchUrl.splitByStations();
      
      expect(splitUrls).toHaveLength(1);
      expect(splitUrls[0].toString()).toBe(singleStationUrl);
    });
  });

  describe('URL parsing and station extraction workflow', () => {
    test('should properly handle URL parsing and station extraction', () => {
      const testUrl = 'https://rent.591.com.tw/list?region=1&station=4232,4233,4234&kind=0';
      const searchUrl = new SearchUrl(testUrl);
      
      expect(searchUrl.hasMultipleStations()).toBe(true);
      
      const stationInfo: StationInfo = {
        hasMultiple: searchUrl.hasMultipleStations(),
        stationIds: searchUrl.getStationIds(),
        urlCount: searchUrl.splitByStations().length
      };
      
      expect(stationInfo.hasMultiple).toBe(true);
      expect(stationInfo.stationIds).toEqual(['4232', '4233', '4234']);
      expect(stationInfo.urlCount).toBe(3);
    });
  });
});