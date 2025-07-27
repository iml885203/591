/**
 * Tests for notification module
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { createMockFunction, createMockObject } from '../../helpers/mockUtils.js';

// Import functions to test
import {
  sendToDiscord,
  createRentalEmbed, 
  sendDiscordNotifications,
  sendErrorNotification
} from '../../../lib/services/NotificationService.js';

describe('notification', () => {
  let mockAxios;
  let mockRental;
  
  beforeEach(() => {
    // Mock axios
    mockAxios = createMockObject({
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
      const embed = {
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
      const embed = { title: 'Silent Test' };
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

    it('should return false when webhook URL is not configured', async () => {
      const embed = { title: 'Test' };
      
      const result = await sendToDiscord(embed, null, mockAxios);

      expect(result).toBe(false);
      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it('should handle axios errors gracefully', async () => {
      mockAxios.post.mockImplementationOnce(() => 
        Promise.reject(new Error('Network error'))
      );
      
      const embed = { title: 'Test' };
      const webhookUrl = 'https://discord.com/api/webhooks/123/test';

      const result = await sendToDiscord(embed, webhookUrl, mockAxios);

      expect(result).toBe(false);
    });
  });

  describe('createRentalEmbed', () => {
    it('should create rental embed with all fields', () => {
      const embed = createRentalEmbed(mockRental, 1, 1, false, 600);

      expect(embed).toMatchObject({
        title: 'Test Rental 1',
        url: 'https://rent.591.com.tw/rent-detail-12345.html',
        color: 0x00ff00, // Green for close to MRT
        fields: expect.arrayContaining([
          expect.objectContaining({ name: '🏠 房型', value: '整層住家 2房1廳1衛' }),
          expect.objectContaining({ name: '🚇 捷運距離', value: expect.stringContaining('信義安和站') }),
          expect.objectContaining({ name: '🏷️ 標籤', value: '有陽台, 可養寵物' })
        ]),
        image: { url: 'https://example.com/image1.jpg' }
      });
    });

    it('should use orange color for far rentals', () => {
      const farRental = {
        ...mockRental,
        metroValue: '15分鐘',
        notification: {
          ...mockRental.notification,
          distanceFromMRT: 1200,
          isFarFromMRT: true
        }
      };

      const embed = createRentalEmbed(farRental, 1, 1, false, 600);

      expect(embed.color).toBe(0xffa500); // Orange for far from MRT
    });
  });

  describe('sendErrorNotification', () => {
    it('should send error notification', async () => {
      const webhookUrl = 'https://discord.com/api/webhooks/123/test';
      const originalUrl = 'https://rent.591.com.tw/list?region=1';
      const error = 'Network timeout';

      await sendErrorNotification(originalUrl, error, webhookUrl, mockAxios);

      expect(mockAxios.post).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          embeds: expect.any(Array)
        })
      );
    });

    it('should handle webhook errors gracefully', async () => {
      mockAxios.post.mockImplementationOnce(() => 
        Promise.reject(new Error('Webhook error'))
      );

      const webhookUrl = 'https://discord.com/api/webhooks/123/test';
      
      // Should not throw
      await expect(sendErrorNotification('test', 'error', webhookUrl, mockAxios)).resolves.toBeUndefined();
    });
  });
});