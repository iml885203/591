/**
 * Unit tests for Rental.js - Domain model for rental properties
 */

import { describe, it, expect } from '@jest/globals';
import Rental from '../../../lib/Rental';

interface MockNotificationData {
  shouldNotify?: boolean;
  isSilent?: boolean;
  [key: string]: any;
}

interface MockRentalData {
  title: string;
  link: string | null;
  houseType?: string;
  rooms?: string;
  metroTitle?: string;
  metroValue?: string;
  tags?: string[];
  imgUrls?: string[];
  notification?: MockNotificationData;
  metroDistances?: any[];
}

describe('Rental', () => {
  const mockRentalData: MockRentalData = {
    title: 'Test Rental Property',
    link: 'https://rent.591.com.tw/house/12345',
    rooms: '套房',
    metroTitle: '中山站',
    metroValue: '5分鐘',
    tags: ['近捷運', '可開伙'],
    imgUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    notification: {
      shouldNotify: true,
      isSilent: false
    }
  };

  describe('constructor', () => {
    it('should create rental instance with all properties', () => {
      const rental = new Rental(mockRentalData);
      
      expect(rental.title).toBe(mockRentalData.title);
      expect(rental.link).toBe(mockRentalData.link);
      expect(rental.rooms).toBe(mockRentalData.rooms);
      expect(rental.metroTitle).toBe(mockRentalData.metroTitle);
      expect(rental.metroValue).toBe(mockRentalData.metroValue);
      expect(rental.tags).toEqual(mockRentalData.tags);
      expect(rental.imgUrls).toEqual(mockRentalData.imgUrls);
      expect(rental.notification).toEqual(mockRentalData.notification);
    });

    it('should handle missing optional properties', () => {
      const minimalData: MockRentalData = {
        title: 'Test Property',
        link: 'https://rent.591.com.tw/house/123',
        rooms: '套房',
        metroTitle: '站名',
        metroValue: '10分鐘'
      };

      const rental = new Rental(minimalData);
      
      expect(rental.tags).toEqual([]);
      expect(rental.imgUrls).toEqual([]);
      expect(rental.notification).toEqual({});
    });
  });

  describe('getDistanceToMRT', () => {
    it('should return distance in meters for minutes format', () => {
      const rental = new Rental({ ...mockRentalData, metroValue: '5分鐘' });
      expect(rental.getDistanceToMRT()).toBe(400); // 5 * 80 = 400
    });

    it('should return distance in meters for meters format', () => {
      const rental = new Rental({ ...mockRentalData, metroValue: '300公尺' });
      expect(rental.getDistanceToMRT()).toBe(300);
    });

    it('should return null when no metro value', () => {
      const rental = new Rental({ ...mockRentalData, metroValue: undefined });
      expect(rental.getDistanceToMRT()).toBe(null);
    });
  });

  describe('isFarFromMRT', () => {
    it('should return false when distance threshold is not set', () => {
      const rental = new Rental({ ...mockRentalData, metroValue: '10分鐘' });
      expect(rental.isFarFromMRT(null)).toBe(false);
      expect(rental.isFarFromMRT(null)).toBe(false);
    });

    it('should return true when distance exceeds threshold', () => {
      const rental = new Rental({ ...mockRentalData, metroValue: '10分鐘' }); // 800m
      expect(rental.isFarFromMRT(600)).toBe(true);
    });

    it('should return false when distance is within threshold', () => {
      const rental = new Rental({ ...mockRentalData, metroValue: '5分鐘' }); // 400m
      expect(rental.isFarFromMRT(600)).toBe(false);
    });

    it('should return false when distance is null', () => {
      const rental = new Rental({ ...mockRentalData, metroValue: 'unknown' });
      expect(rental.isFarFromMRT(600)).toBeFalsy();
    });
  });

  describe('getId', () => {
    it('should return property ID from utils.getPropertyId', () => {
      const rental = new Rental(mockRentalData);
      const id = rental.getId();
      
      // Should be a string (either extracted from URL or generated from title+metro)
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('shouldBeSilentNotification', () => {
    it('should return true for filtered mode with silent setting when far from MRT', () => {
      const rental = new Rental({ ...mockRentalData, metroValue: '15分鐘' }); // 1200m
      expect(rental.shouldBeSilentNotification('filtered', 'silent', 800)).toBe(true);
    });

    it('should return false for filtered mode with silent setting when close to MRT', () => {
      const rental = new Rental({ ...mockRentalData, metroValue: '5分鐘' }); // 400m
      expect(rental.shouldBeSilentNotification('filtered', 'silent', 800)).toBe(false);
    });

    it('should return false for non-filtered mode', () => {
      const rental = new Rental({ ...mockRentalData, metroValue: '15分鐘' });
      expect(rental.shouldBeSilentNotification('all', 'silent', 800)).toBe(false);
    });

    it('should return false for filtered mode with non-silent setting', () => {
      const rental = new Rental({ ...mockRentalData, metroValue: '15分鐘' });
      expect(rental.shouldBeSilentNotification('filtered', 'normal', 800)).toBe(false);
    });
  });

  describe('getNotificationColor', () => {
    it('should return orange color for rentals far from MRT', () => {
      const rental = new Rental({ ...mockRentalData, metroValue: '15分鐘' }); // 1200m
      expect(rental.getNotificationColor(800)).toBe(0xffa500);
    });

    it('should return green color for rentals close to MRT', () => {
      const rental = new Rental({ ...mockRentalData, metroValue: '5分鐘' }); // 400m
      expect(rental.getNotificationColor(800)).toBe(0x00ff00);
    });
  });

  describe('toJSON', () => {
    it('should return plain object representation', () => {
      const rental = new Rental(mockRentalData);
      const json = rental.toJSON();
      
      expect(json).toEqual({
        title: mockRentalData.title,
        link: mockRentalData.link,
        rooms: mockRentalData.rooms,
        houseType: mockRentalData.houseType || "",
        metroTitle: mockRentalData.metroTitle,
        metroValue: mockRentalData.metroValue,
        metroDistances: [],
        tags: mockRentalData.tags,
        imgUrls: mockRentalData.imgUrls,
        notification: mockRentalData.notification
      });
    });

    it('should be serializable to JSON', () => {
      const rental = new Rental(mockRentalData);
      const jsonString = JSON.stringify(rental);
      const parsed = JSON.parse(jsonString);
      
      expect(parsed.title).toBe(mockRentalData.title);
      expect(parsed.link).toBe(mockRentalData.link);
    });
  });

  describe('fromJSON', () => {
    it('should create Rental instance from plain object', () => {
      const rental = Rental.fromJSON(mockRentalData);
      
      expect(rental).toBeInstanceOf(Rental);
      expect(rental.title).toBe(mockRentalData.title);
      expect(rental.link).toBe(mockRentalData.link);
      expect(rental.rooms).toBe(mockRentalData.rooms);
    });

    it('should work with JSON roundtrip', () => {
      const original = new Rental(mockRentalData);
      const json = original.toJSON();
      const restored = Rental.fromJSON(json);
      
      expect(restored.title).toBe(original.title);
      expect(restored.getDistanceToMRT()).toBe(original.getDistanceToMRT());
      expect(restored.isFarFromMRT(800)).toBe(original.isFarFromMRT(800));
    });
  });
});