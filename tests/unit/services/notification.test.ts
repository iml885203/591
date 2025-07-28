/**
 * Tests for notification module
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { createMockFunction, createMockObject, type BunMockFunction } from '../../helpers/mockUtils.js';

// Import functions to test
import {
  sendToDiscord,
  createRentalEmbed, 
  sendDiscordNotifications,
  sendErrorNotification
} from '../../../lib/notification.js';

interface MockAxios {
  post: BunMockFunction<(...args: any[]) => Promise<any>>;
}

interface MockRental {
  title: string;
  link: string;
  address: string;
  price: string;
  metroValue: string;
  houseType: string;
  rooms: string;
  tags: string[];
  imgUrls: string[];
  metroTitle: string;
  notification: {
    isSilent: boolean;
    distanceFromMRT: number;
    distanceThreshold: number;
    isFarFromMRT: boolean;
  };
}

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  [key: string]: any;
}

describe('notification', () => {
  let mockAxios: MockAxios;
  let mockRental: MockRental;
  
  beforeEach(() => {
    // Mock axios
    mockAxios = createMockObject<MockAxios>({
      post: () => Promise.resolve({ status: 200, data: { id: '123' } })
    });

    // Mock rental data
    mockRental = {
      title: 'Test Rental 1',
      link: 'https://rent.591.com.tw/rent-detail-12345.html',
      address: 'Test Address 1',
      price: '25000',
      metroValue: '5分鐘',
      houseType: '整層住家',
      rooms: '2房1廳1衛',
      tags: ['有陽台', '可養寵物'],
      imgUrls: ['https://example.com/image1.jpg'],
      metroTitle: '信義安和站',
      notification: {
        isSilent: false,
        distanceFromMRT: 400,
        distanceThreshold: 600,
        isFarFromMRT: false
      }
    };
  });

  describe('sendToDiscord', () => {
    it('should send embed to Discord webhook', async () => {
      const embed: DiscordEmbed = {
        title: 'Test Embed',
        description: 'Test description',
        color: 0x00ff00
      };
      const webhookUrl = 'https://discord.com/api/webhooks/123/test';

      const result = await sendToDiscord(embed, webhookUrl, mockAxios);

      expect(result).toBe(true);
      expect(mockAxios.post).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          embeds: [embed],
          avatar_url: expect.any(String)
        })
      );
    });

    it('should handle silent notifications', async () => {
      const embed: DiscordEmbed = { title: 'Silent Test', color: 0x00ff00 };
      const webhookUrl = 'https://discord.com/api/webhooks/123/test';

      const result = await sendToDiscord(embed, webhookUrl, mockAxios, true);

      expect(result).toBe(true);
      expect(mockAxios.post).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          flags: 4096 // SUPPRESS_NOTIFICATIONS flag
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const errorAxios = createMockObject<MockAxios>({
        post: () => Promise.reject(new Error('Discord API error'))
      });

      const embed: DiscordEmbed = { title: 'Test', color: 0x00ff00 };
      const webhookUrl = 'https://discord.com/api/webhooks/123/test';

      const result = await sendToDiscord(embed, webhookUrl, errorAxios);

      expect(result).toBe(false);
    });
  });

  describe('createRentalEmbed', () => {
    it('should create proper Discord embed for rental', async () => {
      const embed = await createRentalEmbed(mockRental);

      expect(embed).toHaveProperty('title');
      expect(embed).toHaveProperty('url', mockRental.link);
      expect(embed).toHaveProperty('color');
      expect(embed).toHaveProperty('fields');
      expect(embed).toHaveProperty('image');
      expect(embed.fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: '房型', value: mockRental.houseType }),
          expect.objectContaining({ name: '格局', value: mockRental.rooms }),
          expect.objectContaining({ name: '捷運', value: expect.stringContaining(mockRental.metroTitle) })
        ])
      );
    });

    it('should handle rentals without images', async () => {
      const rentalWithoutImage = { ...mockRental, imgUrls: [] };
      
      const embed = await createRentalEmbed(rentalWithoutImage);

      expect(embed).toHaveProperty('title');
      expect(embed.image).toBeUndefined();
    });
  });

  describe('sendDiscordNotifications', () => {
    it('should send notifications for multiple rentals', async () => {
      const rentals = [mockRental, { ...mockRental, title: 'Test Rental 2' }];
      const webhookUrl = 'https://discord.com/api/webhooks/123/test';
      const options = { notifyMode: 'all', filteredMode: 'normal', notificationDelay: 100 };

      const result = await sendDiscordNotifications(rentals, webhookUrl, options, mockAxios);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should respect notification delay', async () => {
      const rentals = [mockRental, { ...mockRental, title: 'Test Rental 2' }];
      const webhookUrl = 'https://discord.com/api/webhooks/123/test';
      const options = { notifyMode: 'all', filteredMode: 'normal', notificationDelay: 50 };

      const start = Date.now();
      await sendDiscordNotifications(rentals, webhookUrl, options, mockAxios);
      const duration = Date.now() - start;

      // Should take at least the delay time between notifications
      expect(duration).toBeGreaterThanOrEqual(45); // Allow small margin
    });
  });

  describe('sendErrorNotification', () => {
    it('should send error notification to Discord', async () => {
      const error = new Error('Test error');
      const webhookUrl = 'https://discord.com/api/webhooks/123/test';

      const result = await sendErrorNotification(error, webhookUrl, mockAxios);

      expect(result).toBe(true);
      expect(mockAxios.post).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              title: '🚨 Crawler Error',
              color: 0xff0000
            })
          ])
        })
      );
    });
  });
});