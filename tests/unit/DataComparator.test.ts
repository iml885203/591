/**
 * Tests for DataComparator utility
 */

import { test, expect, describe } from 'bun:test';
import DataComparator from '../../lib/utils/DataComparator.js';

interface TestRentalData {
  title: string;
  houseType?: string;
  rooms?: string;
  metroTitle?: string;
  metroValue?: string;
  tags?: string[] | string;
  imgUrls?: string[] | string;
}

interface TestExistingData {
  title: string;
  houseType?: string;
  rooms?: string;
  metroTitle?: string;
  metroValue?: string;
  tags?: string;
  imgUrls?: string;
}

interface MetroDistance {
  stationName: string;
  distance: number | null;
}

describe('DataComparator', () => {
  describe('compareRentalData', () => {
    test('should detect new record', () => {
      const newData: TestRentalData = {
        title: '台北市大安區整層住家',
        houseType: '整層住家',
        rooms: '3房2廳',
        metroTitle: '距大安站',
        metroValue: '5分鐘'
      };

      const result = DataComparator.compareRentalData(newData, null);
      
      expect(result.hasChanged).toBe(true);
      expect(result.changedFields).toContain('new_record');
      expect(result.hash).toBeDefined();
    });

    test('should detect no changes in identical data', () => {
      const data: TestRentalData = {
        title: '台北市大安區整層住家',
        houseType: '整層住家',
        rooms: '3房2廳',
        metroTitle: '距大安站',
        metroValue: '5分鐘',
        tags: ['電梯', '冷氣'],
        imgUrls: ['img1.jpg', 'img2.jpg']
      };

      const existingData: TestExistingData = {
        title: '台北市大安區整層住家',
        houseType: '整層住家',
        rooms: '3房2廳',
        metroTitle: '距大安站',
        metroValue: '5分鐘',
        tags: '電梯,冷氣',
        imgUrls: 'img1.jpg,img2.jpg'
      };

      const result = DataComparator.compareRentalData(data, existingData);
      
      expect(result.hasChanged).toBe(false);
      expect(result.changedFields).toHaveLength(0);
    });

    test('should detect significant title changes', () => {
      const newData: TestRentalData = {
        title: '新北市板橋區套房',
        houseType: '整層住家',
        rooms: '3房2廳'
      };

      const existingData: TestExistingData = {
        title: '台北市大安區整層住家',
        houseType: '整層住家',
        rooms: '3房2廳'
      };

      const result = DataComparator.compareRentalData(newData, existingData);
      
      expect(result.hasChanged).toBe(true);
      expect(result.changedFields).toContain('title');
    });

    test('should ignore minor title changes', () => {
      const newData: TestRentalData = {
        title: '台北市大安區整層住家 3房2廳 近捷運',
        houseType: '整層住家',
        rooms: '3房2廳'
      };

      const existingData: TestExistingData = {
        title: '台北市大安區整層住家 3房2廳',
        houseType: '整層住家',
        rooms: '3房2廳'
      };

      const result = DataComparator.compareRentalData(newData, existingData);
      
      expect(result.hasChanged).toBe(false);
      expect(result.changedFields).not.toContain('title');
    });

    test('should detect array changes in tags', () => {
      const newData: TestRentalData = {
        title: '測試物件',
        tags: ['電梯', '冷氣', '洗衣機']
      };

      const existingData: TestExistingData = {
        title: '測試物件',
        tags: '電梯,冷氣'
      };

      const result = DataComparator.compareRentalData(newData, existingData);
      
      expect(result.hasChanged).toBe(true);
      expect(result.changedFields).toContain('tags');
    });
  });

  describe('generateDataHash', () => {
    test('should generate consistent hash for same data', () => {
      const data: Record<string, any> = {
        title: '測試物件',
        houseType: '整層住家',
        rooms: '3房2廳'
      };

      const hash1 = DataComparator.generateDataHash(data);
      const hash2 = DataComparator.generateDataHash(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(32); // MD5 hash length
    });

    test('should generate different hash for different data', () => {
      const data1: Record<string, any> = { title: '物件A' };
      const data2: Record<string, any> = { title: '物件B' };

      const hash1 = DataComparator.generateDataHash(data1);
      const hash2 = DataComparator.generateDataHash(data2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('normalizeValue', () => {
    test('should handle null and undefined values', () => {
      expect(DataComparator.normalizeValue(null)).toBe('');
      expect(DataComparator.normalizeValue(undefined)).toBe('');
      expect(DataComparator.normalizeValue('')).toBe('');
    });

    test('should trim string values', () => {
      expect(DataComparator.normalizeValue('  test  ')).toBe('test');
      expect(DataComparator.normalizeValue('normal')).toBe('normal');
    });
  });

  describe('metroDistancesChanged', () => {
    test('should detect no changes in empty arrays', () => {
      expect(DataComparator.metroDistancesChanged([], [])).toBe(false);
      expect(DataComparator.metroDistancesChanged(null, null)).toBe(false);
    });

    test('should detect new distances added', () => {
      const newDistances: MetroDistance[] = [{ stationName: '大安站', distance: 300 }];
      expect(DataComparator.metroDistancesChanged(newDistances, [])).toBe(true);
    });

    test('should detect changes in distance values', () => {
      const distances1: MetroDistance[] = [{ stationName: '大安站', distance: 300 }];
      const distances2: MetroDistance[] = [{ stationName: '大安站', distance: 400 }];
      
      expect(DataComparator.metroDistancesChanged(distances1, distances2)).toBe(true);
    });
  });

  describe('getChangesSummary', () => {
    test('should provide readable summary', () => {
      expect(DataComparator.getChangesSummary([])).toBe('No changes');
      expect(DataComparator.getChangesSummary(['new_record'])).toBe('New record');
      expect(DataComparator.getChangesSummary(['title', 'rooms'])).toBe('Changed: title, rooms');
    });
  });
});