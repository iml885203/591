/**
 * Integration tests for API endpoints
 */

const request = require('supertest');
const express = require('express');
const app = require('../../api');

// Mock the crawlService to avoid actual web scraping in tests
jest.mock('../../lib/crawlService', () => ({
  crawlWithNotifications: jest.fn()
}));

const { crawlWithNotifications } = require('../../lib/crawlService');

describe('API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        service: '591-crawler-api'
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /info', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/info')
        .expect(200);

      expect(response.body).toMatchObject({
        name: '591 Crawler API',
        version: '2025.07.2',
        endpoints: {
          'GET /health': 'Health check',
          'GET /info': 'API information',
          'POST /crawl': 'Execute crawler'
        }
      });

      expect(response.body.crawlParameters).toBeDefined();
      expect(response.body.examples).toBeDefined();
    });

    it('should include new notification parameters in documentation', async () => {
      const response = await request(app)
        .get('/info')
        .expect(200);

      expect(response.body.crawlParameters.notifyMode).toMatchObject({
        type: 'string',
        default: 'filtered',
        enum: ['all', 'filtered', 'none']
      });

      expect(response.body.crawlParameters.filteredMode).toMatchObject({
        type: 'string',
        default: 'silent',
        enum: ['normal', 'silent', 'none']
      });
    });
  });

  describe('POST /crawl', () => {
    const mockSuccessResponse = {
      rentals: [
        {
          title: 'Test Rental',
          link: 'https://rent.591.com.tw/test',
          notification: { willNotify: false, isSilent: false }
        }
      ],
      summary: {
        totalRentals: 1,
        newRentals: 0,
        notificationsSent: false,
        notifyMode: 'none',
        filteredMode: 'silent'
      }
    };

    it('should require URL parameter', async () => {
      const response = await request(app)
        .post('/crawl')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'URL is required'
      });
    });

    it('should validate 591.com.tw URL', async () => {
      const response = await request(app)
        .post('/crawl')
        .send({ url: 'https://invalid-site.com' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid URL',
        message: 'URL must be from 591.com.tw'
      });
    });

    it('should successfully crawl with default parameters', async () => {
      crawlWithNotifications.mockResolvedValue(mockSuccessResponse);

      const response = await request(app)
        .post('/crawl')
        .send({
          url: 'https://rent.591.com.tw/list?region=1&kind=0'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Crawl completed successfully'
      });

      expect(response.body.data).toMatchObject({
        url: 'https://rent.591.com.tw/list?region=1&kind=0',
        notifyMode: 'filtered',
        filteredMode: 'silent',
        rentalsFound: 1
      });

      expect(crawlWithNotifications).toHaveBeenCalledWith(
        'https://rent.591.com.tw/list?region=1&kind=0',
        undefined,
        { notifyMode: 'filtered', filteredMode: 'silent' }
      );
    });

    it('should handle custom notification modes', async () => {
      crawlWithNotifications.mockResolvedValue({
        ...mockSuccessResponse,
        summary: {
          ...mockSuccessResponse.summary,
          notifyMode: 'all',
          filteredMode: 'normal'
        }
      });

      const response = await request(app)
        .post('/crawl')
        .send({
          url: 'https://rent.591.com.tw/list?region=1&kind=0',
          notifyMode: 'all',
          filteredMode: 'normal',
          maxLatest: 5
        })
        .expect(200);

      expect(response.body.data.notifyMode).toBe('all');
      expect(response.body.data.filteredMode).toBe('normal');

      expect(crawlWithNotifications).toHaveBeenCalledWith(
        'https://rent.591.com.tw/list?region=1&kind=0',
        5,
        { notifyMode: 'all', filteredMode: 'normal' }
      );
    });

    it('should handle crawler errors gracefully', async () => {
      crawlWithNotifications.mockRejectedValue(new Error('Crawl failed'));

      const response = await request(app)
        .post('/crawl')
        .send({
          url: 'https://rent.591.com.tw/list?region=1&kind=0'
        })
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Crawl failed',
        message: 'Crawl failed'
      });
    });

    it('should include timestamp in response', async () => {
      crawlWithNotifications.mockResolvedValue(mockSuccessResponse);

      const response = await request(app)
        .post('/crawl')
        .send({
          url: 'https://rent.591.com.tw/list?region=1&kind=0'
        })
        .expect(200);

      expect(response.body.data.timestamp).toBeDefined();
      expect(new Date(response.body.data.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/unknown')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Endpoint not found',
        availableEndpoints: ['/health', '/info', '/crawl']
      });
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });
});