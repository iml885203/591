/**
 * Unit tests for HTML parser functions
 */

const { parseRental, parseRentals } = require('../../lib/parser');

describe('parser', () => {
  let mockCheerio, mockElement;

  beforeEach(() => {
    mockCheerio = jest.fn();
    mockElement = {
      find: jest.fn()
    };
  });

  describe('parseRental', () => {
    it('should parse rental with all data available', () => {
      // Mock title element
      const mockTitleElement = {
        text: jest.fn().mockReturnValue('Test Rental Title'),
        attr: jest.fn().mockReturnValue('/19284954')
      };
      
      // Mock other elements
      mockElement.find
        .mockReturnValueOnce(mockTitleElement) // .item-info-title a
        .mockReturnValueOnce({ // .item-img .common-img
          each: jest.fn((callback) => {
            callback(0, { attr: () => 'img1.jpg' });
            callback(1, { attr: () => 'img2.jpg' });
          })
        })
        .mockReturnValueOnce({ // .item-info-tag .tag
          each: jest.fn((callback) => {
            callback(0, { text: () => '近捷運' });
            callback(1, { text: () => '可開伙' });
          })
        })
        .mockReturnValueOnce({ // rooms
          text: jest.fn().mockReturnValue('整層住家2房1廳')
        })
        .mockReturnValueOnce({ // metro value
          text: jest.fn().mockReturnValue('500公尺')
        })
        .mockReturnValueOnce({ // metro title
          text: jest.fn().mockReturnValue('距台北車站')
        });

      // Mock cheerio instance
      mockCheerio.mockImplementation((element) => ({
        text: () => element.text ? element.text() : '',
        attr: (attr) => element.attr ? element.attr() : null
      }));

      const result = parseRental(mockElement, mockCheerio);

      expect(result).toMatchObject({
        title: 'Test Rental Title',
        link: 'https://rent.591.com.tw/19284954',
        imgUrls: ['img1.jpg', 'img2.jpg'],
        tags: ['近捷運', '可開伙'],
        rooms: '整層住家2房1廳',
        metroValue: '500公尺',
        metroTitle: '距台北車站'
      });
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return null when no title is found', () => {
      const mockTitleElement = {
        text: jest.fn().mockReturnValue(''),
        attr: jest.fn().mockReturnValue('')
      };
      
      mockElement.find.mockReturnValue(mockTitleElement);

      const result = parseRental(mockElement, mockCheerio);
      expect(result).toBeNull();
    });

    it('should handle relative links by making them absolute', () => {
      const mockTitleElement = {
        text: jest.fn().mockReturnValue('Test Rental'),
        attr: jest.fn().mockReturnValue('/relative-link')
      };
      
      mockElement.find
        .mockReturnValueOnce(mockTitleElement)
        .mockReturnValue({ each: jest.fn(), text: jest.fn().mockReturnValue('') });

      const result = parseRental(mockElement, mockCheerio);
      expect(result.link).toBe('https://rent.591.com.tw/relative-link');
    });

    it('should handle absolute links without modification', () => {
      const mockTitleElement = {
        text: jest.fn().mockReturnValue('Test Rental'),
        attr: jest.fn().mockReturnValue('https://rent.591.com.tw/absolute-link')
      };
      
      mockElement.find
        .mockReturnValueOnce(mockTitleElement)
        .mockReturnValue({ each: jest.fn(), text: jest.fn().mockReturnValue('') });

      const result = parseRental(mockElement, mockCheerio);
      expect(result.link).toBe('https://rent.591.com.tw/absolute-link');
    });
  });

  describe('parseRentals', () => {
    it('should parse multiple rentals from HTML and filter valid ones', () => {
      // Test with realistic HTML that would actually produce some valid and invalid results
      const realCheerio = require('cheerio');
      
      // Create HTML with one valid rental and one invalid (no title)
      const mockHTML = `
        <div class="item">
          <div class="item-info-title"><a href="/12345">Valid Rental Title</a></div>
          <div class="item-img"><img class="common-img" data-src="image1.jpg"></div>
        </div>
        <div class="item">
          <!-- This one has no title, so should be filtered out -->
          <div class="item-img"><img class="common-img" data-src="image2.jpg"></div>
        </div>
      `;

      const result = parseRentals(mockHTML, realCheerio);

      // Should only return the valid rental (the one with a title)
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        title: 'Valid Rental Title',
        link: 'https://rent.591.com.tw/12345'
      });
      expect(result[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return empty array when no valid rentals found', () => {
      const realCheerio = require('cheerio');
      const mockHTML = '<html><body><div class="not-item">No items here</div></body></html>';

      const result = parseRentals(mockHTML, realCheerio);

      expect(result).toHaveLength(0);
    });
  });
});