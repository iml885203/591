/**
 * Unit tests for notification.js
 */

const {
  sendToDiscord,
  createRentalEmbed,
  createErrorEmbed,
  sendDiscordNotifications,
  sendErrorNotification
} = require('../../lib/notification');

// Mock the utils module
jest.mock('../../lib/utils', () => ({
  logWithTimestamp: jest.fn(),
  sleep: jest.fn(() => Promise.resolve()),
  extractDistanceInMeters: jest.fn((metroValue) => {
    if (!metroValue) return null;
    const meterMatch = metroValue.match(/(\d+)\s*公尺/);
    if (meterMatch) return parseInt(meterMatch[1]);
    const minuteMatch = metroValue.match(/(\d+)\s*分鐘/);
    if (minuteMatch) return parseInt(minuteMatch[1]) * 80;
    return null;
  })
}));

const { logWithTimestamp, sleep } = require('../../lib/utils');

describe('notification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendToDiscord', () => {
    it('should send embed successfully and return true', async () => {
      const mockAxios = {
        post: jest.fn().mockResolvedValue({ data: 'success' })
      };
      const embed = { title: 'Test Rental' };
      const webhookUrl = 'https://discord.com/api/webhooks/test';

      const result = await sendToDiscord(embed, webhookUrl, mockAxios);

      expect(mockAxios.post).toHaveBeenCalledWith(webhookUrl, { 
        embeds: [embed],
        avatar_url: "https://i.imgur.com/izKG7gm.jpeg"
      });
      expect(result).toBe(true);
      expect(logWithTimestamp).not.toHaveBeenCalled();
    });

    it('should return false and log warning when webhook URL is not provided', async () => {
      const mockAxios = { post: jest.fn() };
      const embed = { title: 'Test Rental' };

      const result = await sendToDiscord(embed, null, mockAxios);

      expect(mockAxios.post).not.toHaveBeenCalled();
      expect(result).toBe(false);
      expect(logWithTimestamp).toHaveBeenCalledWith('Discord webhook URL not configured, skipping notification', 'WARN');
    });

    it('should return false and log error when Discord API call fails', async () => {
      const mockAxios = {
        post: jest.fn().mockRejectedValue(new Error('Network error'))
      };
      const embed = { title: 'Test Rental' };
      const webhookUrl = 'https://discord.com/api/webhooks/test';

      const result = await sendToDiscord(embed, webhookUrl, mockAxios);

      expect(mockAxios.post).toHaveBeenCalledWith(webhookUrl, { 
        embeds: [embed],
        avatar_url: "https://i.imgur.com/izKG7gm.jpeg"
      });
      expect(result).toBe(false);
      expect(logWithTimestamp).toHaveBeenCalledWith('Discord notification failed: Network error', 'ERROR');
    });
  });

  describe('createRentalEmbed', () => {
    it('should create a properly formatted rental embed', () => {
      const rental = {
        title: 'Beautiful Apartment',
        link: 'https://rent.591.com.tw/12345',
        rooms: '1房1廳1衛',
        metroTitle: '文湖線 大直站',
        metroValue: '3分鐘',
        tags: ['電梯大樓', '可養寵物', '近捷運'],
        imgUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
      };

      const testUrl = 'https://rent.591.com.tw/list?region=1&kind=0';
      const embed = createRentalEmbed(rental, 1, 3, false, 800, testUrl);

      expect(embed).toMatchObject({
        title: 'Beautiful Apartment',
        url: 'https://rent.591.com.tw/12345',
        color: 0x00ff00,
        fields: [
          { name: '🏠 房型', value: '1房1廳1衛', inline: true },
          { name: '🚇 捷運距離', value: '文湖線 大直站 3分鐘', inline: true },
          { name: '🏷️ 標籤', value: '電梯大樓, 可養寵物, 近捷運', inline: false },
          { name: '🔍 搜尋條件', value: `[查看完整搜尋條件](${testUrl})`, inline: false }
        ],
        footer: { text: '1/3 - 591房源通知' },
        image: { url: 'https://example.com/image1.jpg' }
      });
      expect(embed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle missing rental fields gracefully', () => {
      const rental = {
        title: null,
        link: 'https://rent.591.com.tw/12345',
        rooms: null,
        metroTitle: null,
        metroValue: null,
        tags: [],
        imgUrls: []
      };

      const embed = createRentalEmbed(rental, 2, 5);

      expect(embed.title).toBe('無標題');
      expect(embed.fields[0].value).toBe('N/A'); // rooms
      expect(embed.fields[1].value).toBe('N/A'); // metro
      expect(embed.fields[2].value).toBe('N/A'); // tags
      expect(embed.footer.text).toBe('2/5 - 591房源通知');
      expect(embed.fields.length).toBe(3); // 沒有搜尋網址 field
      expect(embed.image).toBeUndefined();
    });

    it('should include URL in footer when provided', () => {
      const rental = {
        title: 'Test Rental',
        link: 'https://rent.591.com.tw/12345',
        rooms: '1房1廳',
        metroTitle: 'Test Station',
        metroValue: '5分鐘',
        tags: ['test'],
        imgUrls: []
      };
      const testUrl = 'https://rent.591.com.tw/list?region=1&kind=0';

      const embed = createRentalEmbed(rental, 1, 1, false, 800, testUrl);

      expect(embed.footer.text).toBe('1/1 - 591房源通知');
      expect(embed.fields[3]).toEqual({ name: '🔍 搜尋條件', value: `[查看完整搜尋條件](${testUrl})`, inline: false });
    });

    it('should handle partial metro information', () => {
      const rental = {
        title: 'Test Rental',
        rooms: '1房',
        metroTitle: '信義線',
        metroValue: null,
        tags: ['test'],
        imgUrls: []
      };

      const embed = createRentalEmbed(rental, 1, 1);

      expect(embed.fields[1].value).toBe('信義線 N/A');
    });
  });

  describe('createErrorEmbed', () => {
    it('should create a properly formatted error embed', () => {
      const originalUrl = 'https://rent.591.com.tw/list/1';
      const error = 'Failed to fetch data: Network timeout';

      const embed = createErrorEmbed(originalUrl, error);

      expect(embed).toMatchObject({
        title: '591 爬蟲執行錯誤',
        color: 0xff0000,
        fields: [
          { name: '錯誤訊息', value: 'Failed to fetch data: Network timeout', inline: false },
          { name: '目標URL', value: 'https://rent.591.com.tw/list/1', inline: false }
        ]
      });
      expect(embed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('sendDiscordNotifications', () => {
    it('should send notifications for all rentals with delays', async () => {
      const mockAxios = {
        post: jest.fn().mockResolvedValue({ data: 'success' })
      };
      const rentals = [
        { title: 'Rental 1', tags: [], imgUrls: [], notification: { isSilent: false } },
        { title: 'Rental 2', tags: [], imgUrls: [], notification: { isSilent: false } },
        { title: 'Rental 3', tags: [], imgUrls: [], notification: { isSilent: false } }
      ];
      const webhookUrl = 'https://discord.com/api/webhooks/test';
      const config = { notificationDelay: 500 };

      await sendDiscordNotifications(rentals, 'https://test.com', webhookUrl, mockAxios, config);

      expect(mockAxios.post).toHaveBeenCalledTimes(3);
      expect(sleep).toHaveBeenCalledTimes(2); // n-1 delays
      expect(sleep).toHaveBeenCalledWith(500);
      expect(logWithTimestamp).toHaveBeenCalledWith('Sending 3 Discord notifications...');
      expect(logWithTimestamp).toHaveBeenCalledWith('✓ Sent notification 1/3 🔔 (normal): Rental 1');
      expect(logWithTimestamp).toHaveBeenCalledWith('✓ Sent notification 2/3 🔔 (normal): Rental 2');
      expect(logWithTimestamp).toHaveBeenCalledWith('✓ Sent notification 3/3 🔔 (normal): Rental 3');
    });

    it('should return early when no rentals provided', async () => {
      const mockAxios = { post: jest.fn() };
      const rentals = [];
      const webhookUrl = 'https://discord.com/api/webhooks/test';

      await sendDiscordNotifications(rentals, 'https://test.com', webhookUrl, mockAxios);

      expect(mockAxios.post).not.toHaveBeenCalled();
      expect(sleep).not.toHaveBeenCalled();
      expect(logWithTimestamp).not.toHaveBeenCalled();
    });

    it('should use default delay when config not provided', async () => {
      const mockAxios = {
        post: jest.fn().mockResolvedValue({ data: 'success' })
      };
      const rentals = [
        { title: 'Rental 1', tags: [], imgUrls: [], notification: { isSilent: false } },
        { title: 'Rental 2', tags: [], imgUrls: [], notification: { isSilent: false } }
      ];
      const webhookUrl = 'https://discord.com/api/webhooks/test';

      await sendDiscordNotifications(rentals, 'https://test.com', webhookUrl, mockAxios);

      expect(sleep).toHaveBeenCalledWith(1000); // Default delay
    });

    it('should continue sending even if some notifications fail', async () => {
      const mockAxios = {
        post: jest.fn()
          .mockResolvedValueOnce({ data: 'success' })
          .mockRejectedValueOnce(new Error('Failed'))
          .mockResolvedValueOnce({ data: 'success' })
      };
      const rentals = [
        { title: 'Property 1', tags: [], imgUrls: [], notification: { isSilent: false } },
        { title: 'Property 2', tags: [], imgUrls: [], notification: { isSilent: false } },
        { title: 'Property 3', tags: [], imgUrls: [], notification: { isSilent: false } }
      ];
      const webhookUrl = 'https://discord.com/api/webhooks/test';

      await sendDiscordNotifications(rentals, 'https://test.com', webhookUrl, mockAxios);

      expect(mockAxios.post).toHaveBeenCalledTimes(3);
      // Should log success for property 1 and 3, but not for property 2 (failed)
      expect(logWithTimestamp).toHaveBeenCalledWith('✓ Sent notification 1/3 🔔 (normal): Property 1');
      expect(logWithTimestamp).toHaveBeenCalledWith('✓ Sent notification 3/3 🔔 (normal): Property 3');
    });
  });

  describe('sendErrorNotification', () => {
    it('should send error notification successfully', async () => {
      const mockAxios = {
        post: jest.fn().mockResolvedValue({ data: 'success' })
      };
      const originalUrl = 'https://test.com';
      const error = 'Test error';
      const webhookUrl = 'https://discord.com/api/webhooks/test';

      await sendErrorNotification(originalUrl, error, webhookUrl, mockAxios);

      expect(mockAxios.post).toHaveBeenCalledTimes(1);
      expect(logWithTimestamp).toHaveBeenCalledWith('Discord error notification sent successfully');
    });

    it('should not log success message when notification fails', async () => {
      const mockAxios = {
        post: jest.fn().mockRejectedValue(new Error('Network error'))
      };
      const originalUrl = 'https://test.com';
      const error = 'Test error';
      const webhookUrl = 'https://discord.com/api/webhooks/test';

      await sendErrorNotification(originalUrl, error, webhookUrl, mockAxios);

      expect(mockAxios.post).toHaveBeenCalledTimes(1);
      expect(logWithTimestamp).not.toHaveBeenCalledWith('Discord error notification sent successfully');
      expect(logWithTimestamp).toHaveBeenCalledWith('Discord notification failed: Network error', 'ERROR');
    });
  });
});