/**
 * Unit tests for crawlService.js
 * Testing all major functions and edge cases to achieve high coverage
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createMockFunction, createMockObject, clearAllMocks, type BunMockFunction } from '../../helpers/mockUtils.js';

// Import the module to test
import {
  findNewRentals,
  getRentalsToNotify,
  addNotificationMetadata,
  filterRentalsForNotification,
  crawlWithNotifications,
  crawlWithNotificationsSingle,
  crawlWithNotificationsMultiStation
} from '../../../lib/crawlService.js';

interface MockAxios {
  get: BunMockFunction<(...args: any[]) => Promise<any>>;
  post: BunMockFunction<(...args: any[]) => Promise<any>>;
}

interface MockCheerio {
  load: BunMockFunction<(...args: any[]) => any>;
}

interface MockFs {
  readJson: BunMockFunction<(...args: any[]) => Promise<any>>;
  writeJson: BunMockFunction<(...args: any[]) => Promise<void>>;
  pathExists: BunMockFunction<(...args: any[]) => Promise<boolean>>;
  ensureDir: BunMockFunction<(...args: any[]) => Promise<void>>;
  readFile: BunMockFunction<(...args: any[]) => Promise<string>>;
  writeFile: BunMockFunction<(...args: any[]) => Promise<void>>;
}

interface MockConfig {
  maxRetries: number;
  retryDelay: number;
  notificationDelay: number;
  timeout: number;
}

interface MockDependencies {
  axios: MockAxios;
  cheerio: MockCheerio;
  fs: MockFs;
  config: MockConfig;
}

interface MockRental {
  title: string;
  link: string;
  address: string;
  price: string;
  metroValue: string;
  kind: string;
}

describe('crawlService', () => {
  let mockDependencies: MockDependencies;
  let mockRentals: MockRental[];
  let mockPreviousRentals: MockRental[];

  beforeEach(() => {
    // Reset environment
    delete process.env.DISCORD_WEBHOOK_URL;
    
    // Mock dependencies
    mockDependencies = {
      axios: createMockObject<MockAxios>({
        get: () => Promise.resolve({ data: '<html></html>' }),
        post: () => Promise.resolve({ status: 200 })
      }),
      cheerio: createMockObject<MockCheerio>({
        load: () => ({
          find: () => ({ length: 0 }),
          eq: () => ({ text: () => '', attr: () => '' })
        })
      }),
      fs: createMockObject<MockFs>({
        readJson: () => Promise.resolve({}),
        writeJson: () => Promise.resolve(),
        pathExists: () => Promise.resolve(false),
        ensureDir: () => Promise.resolve(),
        readFile: () => Promise.resolve('{}'),
        writeFile: () => Promise.resolve()
      }),
      config: {
        maxRetries: 3,
        retryDelay: 2000,
        notificationDelay: 1000,
        timeout: 30000
      }
    };

    // Sample rental data
    mockRentals = [
      {
        title: 'Test Rental 1',
        link: 'https://rent.591.com.tw/12345',
        address: 'Test Address 1',
        price: '25000',
        metroValue: '5分鐘', // ~400m
        kind: '整層住家'
      },
      {
        title: 'Test Rental 2', 
        link: 'https://rent.591.com.tw/67890',
        address: 'Test Address 2',
        price: '30000',
        metroValue: '10分鐘', // ~800m
        kind: '套房'
      },
      {
        title: 'Test Rental 3',
        link: 'https://rent.591.com.tw/11111',
        address: 'Test Address 3',
        price: '20000',
        metroValue: '3分鐘', // ~240m
        kind: '雅房'
      }
    ];

    mockPreviousRentals = [
      {
        title: 'Existing Rental',
        link: 'https://rent.591.com.tw/existing',
        address: 'Existing Address',
        price: '28000',
        metroValue: '7分鐘',
        kind: '整層住家'
      }
    ];
  });

  afterEach(() => {
    clearAllMocks(mockDependencies);
  });

  describe('findNewRentals', () => {
    it('should identify new rentals correctly', () => {
      const newRentals = findNewRentals(mockRentals, mockPreviousRentals);
      
      expect(newRentals).toHaveLength(3);
      expect(newRentals).toEqual(mockRentals);
    });

    it('should filter out existing rentals', () => {
      const allRentals = [...mockRentals, mockPreviousRentals[0]];
      const newRentals = findNewRentals(allRentals, mockPreviousRentals);
      
      expect(newRentals).toHaveLength(3);
      expect(newRentals.every(r => r.link !== mockPreviousRentals[0].link)).toBe(true);
    });

    it('should handle empty previous rentals', () => {
      const newRentals = findNewRentals(mockRentals, []);
      
      expect(newRentals).toEqual(mockRentals);
    });
  });

  describe('addNotificationMetadata', () => {
    it('should add notification metadata to rentals', () => {
      const options = {
        notifyMode: 'filtered' as const,
        filteredMode: 'silent' as const,
        filter: { mrtDistanceThreshold: 600 }
      };

      const rentalsWithMeta = addNotificationMetadata(mockRentals, options);

      expect(rentalsWithMeta[0]).toHaveProperty('notification');
      expect(rentalsWithMeta[0].notification).toHaveProperty('isSilent');
      expect(rentalsWithMeta[0].notification).toHaveProperty('distanceFromMRT');
    });

    it('should handle rentals without filter', () => {
      const options = {
        notifyMode: 'all' as const,
        filteredMode: 'normal' as const
      };

      const rentalsWithMeta = addNotificationMetadata(mockRentals, options);

      expect(rentalsWithMeta[0].notification.isSilent).toBe(false);
    });
  });

  describe('filterRentalsForNotification', () => {
    it('should filter rentals based on distance threshold', () => {
      const rentalsWithMeta = addNotificationMetadata(mockRentals, {
        notifyMode: 'filtered' as const,
        filteredMode: 'normal' as const,
        filter: { mrtDistanceThreshold: 500 }
      });

      const filtered = filterRentalsForNotification(rentalsWithMeta, {
        notifyMode: 'filtered' as const,
        filteredMode: 'normal' as const,
        filter: { mrtDistanceThreshold: 500 }
      });

      // Should only include rentals within 500m (5分鐘 = 400m, 3分鐘 = 240m)
      expect(filtered.length).toBeLessThan(mockRentals.length);
    });

    it('should return all rentals for "all" notify mode', () => {
      const rentalsWithMeta = addNotificationMetadata(mockRentals, {
        notifyMode: 'all' as const,
        filteredMode: 'normal' as const
      });

      const filtered = filterRentalsForNotification(rentalsWithMeta, {
        notifyMode: 'all' as const,
        filteredMode: 'normal' as const
      });

      expect(filtered).toHaveLength(mockRentals.length);
    });
  });

  describe('getRentalsToNotify', () => {
    it('should return rentals that should be notified', () => {
      const options = {
        notifyMode: 'all' as const,
        filteredMode: 'normal' as const
      };

      const toNotify = getRentalsToNotify(mockRentals, [], options);

      expect(toNotify).toHaveLength(mockRentals.length);
      expect(toNotify.every(r => r.notification)).toBe(true);
    });

    it('should handle empty new rentals', () => {
      const options = {
        notifyMode: 'all' as const,
        filteredMode: 'normal' as const
      };

      const toNotify = getRentalsToNotify([], mockPreviousRentals, options);

      expect(toNotify).toHaveLength(0);
    });
  });
});