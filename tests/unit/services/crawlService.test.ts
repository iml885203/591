/**
 * Unit tests for crawlService.js
 * Testing all major functions and edge cases to achieve high coverage
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Import the module to test
import {
  findNewRentals,
  getRentalsToNotify,
  addNotificationMetadata,
  filterRentalsForNotification,
  crawlWithNotifications,
  crawlWithNotificationsSingle,
  crawlWithNotificationsMultiStation
} from '../../../lib/crawlService';

interface MockAxios {
  get: any;
  post: any;
}

interface MockCheerio {
  load: any;
}

interface MockFs {
  readJson: any;
  writeJson: any;
  pathExists: any;
  ensureDir: any;
  readFile: any;
  writeFile: any;
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
  databaseStorage: any;
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
    const mockAxios: any = {
      get: jest.fn(),
      post: jest.fn()
    };
    mockAxios.get.mockResolvedValue({ data: '<html></html>' });
    mockAxios.post.mockResolvedValue({ status: 200 });
    
    const mockCheerio: any = {
      load: jest.fn()
    };
    mockCheerio.load.mockReturnValue({
      find: () => ({ length: 0 }),
      eq: () => ({ text: () => '', attr: () => '' })
    });
    
    const mockFs: any = {
      readJson: jest.fn(),
      writeJson: jest.fn(),
      pathExists: jest.fn(),
      ensureDir: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn()
    };
    mockFs.readJson.mockResolvedValue({});
    mockFs.writeJson.mockResolvedValue(undefined);
    mockFs.pathExists.mockResolvedValue(false);
    mockFs.ensureDir.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('{}');
    mockFs.writeFile.mockResolvedValue(undefined);

    const mockDbStorage: any = {
      readJson: jest.fn(),
      writeJson: jest.fn()
    };
    mockDbStorage.readJson.mockResolvedValue({});
    mockDbStorage.writeJson.mockResolvedValue(undefined);

    mockDependencies = {
      axios: mockAxios,
      cheerio: mockCheerio,
      fs: mockFs,
      databaseStorage: mockDbStorage,
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
    jest.clearAllMocks();
  });

  describe('findNewRentals', () => {
    it('should identify new rentals correctly', () => {
      const existingIds = new Set<string>();
      const newRentals = findNewRentals(mockRentals, existingIds);
      
      expect(newRentals).toHaveLength(3);
      expect(newRentals).toEqual(mockRentals);
    });

    it('should filter out existing rentals', () => {
      const allRentals = [...mockRentals, mockPreviousRentals[0]];
      // Create property ID based on title-metroValue format since URL doesn't have numeric ID
      const propertyIdToExclude = `${mockPreviousRentals[0].title}-${mockPreviousRentals[0].metroValue}`.replace(/\s+/g, '-');
      const existingIds = new Set([propertyIdToExclude]);
      const newRentals = findNewRentals(allRentals, existingIds);
      
      expect(newRentals).toHaveLength(3);
      expect(newRentals.every(r => r.link !== mockPreviousRentals[0].link)).toBe(true);
    });

    it('should handle empty previous rentals', () => {
      const existingIds = new Set<string>();
      const newRentals = findNewRentals(mockRentals, existingIds);
      
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

      const rentalsWithMeta = addNotificationMetadata(mockRentals, mockRentals, options);

      expect(rentalsWithMeta[0]).toHaveProperty('notification');
      expect(rentalsWithMeta[0].notification).toHaveProperty('isSilent');
      expect(rentalsWithMeta[0].notification).toHaveProperty('distanceFromMRT');
    });

    it('should handle rentals without filter', () => {
      const options = {
        notifyMode: 'all' as const,
        filteredMode: 'normal' as const
      };

      const rentalsWithMeta = addNotificationMetadata(mockRentals, mockRentals, options);

      expect(rentalsWithMeta[0].notification?.isSilent).toBe(false);
    });
  });

  describe('filterRentalsForNotification', () => {
    it('should filter rentals based on distance threshold', () => {
      const rentalsWithMeta = addNotificationMetadata(mockRentals, mockRentals, {
        notifyMode: 'filtered' as const,
        filteredMode: 'normal' as const,
        filter: { mrtDistanceThreshold: 500 }
      });

      const filtered = filterRentalsForNotification(rentalsWithMeta, 'filtered', 'normal', { mrtDistanceThreshold: 500 });

      // Should only include rentals within 500m (5分鐘 = 400m, 3分鐘 = 240m)
      expect(filtered.length).toBeLessThan(mockRentals.length);
    });

    it('should return all rentals for "all" notify mode', () => {
      const rentalsWithMeta = addNotificationMetadata(mockRentals, mockRentals, {
        notifyMode: 'all' as const,
        filteredMode: 'normal' as const
      });

      const filtered = filterRentalsForNotification(rentalsWithMeta, 'all', 'normal');

      expect(filtered).toHaveLength(mockRentals.length);
    });
  });

  describe('getRentalsToNotify', () => {
    it('should return rentals that should be notified (maxLatest mode)', async () => {
      const toNotify = await getRentalsToNotify(mockRentals, 2, 'test-url', mockDependencies.databaseStorage);

      expect(toNotify).toHaveLength(2);
      expect(toNotify).toEqual(mockRentals.slice(0, 2));
    });

    it('should handle empty rentals', async () => {
      const toNotify = await getRentalsToNotify([], null, 'test-url', mockDependencies.databaseStorage);

      expect(toNotify).toHaveLength(0);
    });
  });
});