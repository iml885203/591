/**
 * Integration tests for Multi-Station Crawler
 * Tests actual functionality with real URLs but using mock data
 */

const { hasMultipleStations, getUrlStationInfo } = require('../../lib/multiStationCrawler');
const SearchUrl = require('../../lib/domain/SearchUrl');
const Distance = require('../../lib/domain/Distance');
const PropertyId = require('../../lib/domain/PropertyId');

describe('Multi-Station Integration Tests', () => {
  
  describe('SearchUrl domain model', () => {
    test('should correctly identify multi-station URLs', () => {
      const multiStationUrl = 'https://rent.591.com.tw/list?region=3&station=4232,4233,4234,4231';
      const searchUrl = new SearchUrl(multiStationUrl);
      
      expect(searchUrl.isValid).toBe(true);
      expect(searchUrl.hasMultipleStations()).toBe(true);
      expect(searchUrl.getStationIds()).toEqual(['4232', '4233', '4234', '4231']);
    });

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
  });

  describe('Distance domain model', () => {
    test('should correctly parse metro distances', () => {
      const metersDistance = Distance.fromMetroValue('500公尺');
      const minutesDistance = Distance.fromMetroValue('8分鐘');
      
      expect(metersDistance.toMeters()).toBe(500);
      expect(minutesDistance.toMeters()).toBe(640); // 8 * 80
      
      expect(metersDistance.toString()).toBe('500m');
      expect(minutesDistance.toString()).toBe('640m');
    });

    test('should find minimum distance from multiple distances', () => {
      const distances = [
        Distance.fromMeters(800),
        Distance.fromMeters(300),
        Distance.fromMeters(1200)
      ];
      
      const minDistance = Distance.getMinimum(distances);
      expect(minDistance.toMeters()).toBe(300);
    });
  });

  describe('PropertyId domain model', () => {
    test('should generate consistent IDs for duplicate rentals', () => {
      const rental1 = {
        title: 'Test Rental',
        link: 'https://rent.591.com.tw/12345',
        metroValue: '500公尺'
      };
      
      const rental2 = {
        title: 'Test Rental',
        link: 'https://rent.591.com.tw/12345',
        metroValue: '300公尺' // Different metro value
      };
      
      const id1 = PropertyId.fromProperty(rental1);
      const id2 = PropertyId.fromProperty(rental2);
      
      expect(id1.toString()).toBe(id2.toString()); // Same ID despite different metro values
      expect(id1.toString()).toBe('12345'); // URL-based ID
    });

    test('should create ID sets for duplicate detection', () => {
      const rentals = [
        { title: 'Rental 1', link: 'https://rent.591.com.tw/111' },
        { title: 'Rental 2', link: 'https://rent.591.com.tw/222' },
        { title: 'Rental 1', link: 'https://rent.591.com.tw/111' } // Duplicate
      ];
      
      const idSet = PropertyId.createIdSet(rentals);
      expect(idSet.size).toBe(2); // Only unique IDs
      expect(idSet.has('111')).toBe(true);
      expect(idSet.has('222')).toBe(true);
    });
  });

  describe('URL utility functions', () => {
    test('hasMultipleStations should work correctly', () => {
      expect(hasMultipleStations('https://rent.591.com.tw/list?station=1,2,3')).toBe(true);
      expect(hasMultipleStations('https://rent.591.com.tw/list?station=1')).toBe(false);
      expect(hasMultipleStations('https://rent.591.com.tw/list?region=1')).toBe(false);
      expect(hasMultipleStations('invalid-url')).toBe(false);
    });

    test('getUrlStationInfo should extract correct information', () => {
      const info = getUrlStationInfo('https://rent.591.com.tw/list?region=3&station=4232,4233,4234');
      
      expect(info.isValid).toBe(true);
      expect(info.hasMultiple).toBe(true);
      expect(info.stations).toEqual(['4232', '4233', '4234']);
      expect(info.stationCount).toBe(3);
    });
  });
  
  describe('Multi-station workflow', () => {
    test('should properly handle URL parsing and station extraction', () => {
      const originalUrl = 'https://rent.591.com.tw/list?region=3&metro=162&sort=posttime_desc&station=4232,4233,4234,4231&acreage=20$_50$&option=cold&notice=not_cover&price=25000$_40000$';
      
      // Test URL info extraction
      const urlInfo = getUrlStationInfo(originalUrl);
      expect(urlInfo.hasMultiple).toBe(true);
      expect(urlInfo.stations).toEqual(['4232', '4233', '4234', '4231']);
      
      // Test URL splitting
      const searchUrl = new SearchUrl(originalUrl);
      const splitUrls = searchUrl.splitByStations();
      
      expect(splitUrls).toHaveLength(4);
      
      // Verify each split URL has only one station
      splitUrls.forEach((url, index) => {
        const expectedStation = urlInfo.stations[index];
        expect(url.toString()).toContain(`station=${expectedStation}`);
        
        // Ensure it doesn't contain other stations
        const otherStations = urlInfo.stations.filter(s => s !== expectedStation);
        otherStations.forEach(otherStation => {
          expect(url.toString()).not.toContain(`station=${otherStation}`);
        });
        
        // Verify other parameters are preserved (URL encoded)
        expect(url.toString()).toContain('region=3');
        expect(url.toString()).toContain('metro=162');
        expect(url.toString()).toMatch(/price=25000.*40000/);
      });
    });
  });
});