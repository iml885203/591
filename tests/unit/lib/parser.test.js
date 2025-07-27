/**
 * Parser unit tests
 */

const { parseRental, parseRentals } = require('../../../lib/core/parser');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

describe('Parser', () => {
  let sampleHtml;
  let $;

  beforeAll(() => {
    // Load fresh HTML sample for testing
    const htmlPath = path.join(__dirname, '../../../samples/sample_591.html');
    sampleHtml = fs.readFileSync(htmlPath, 'utf8');
    $ = cheerio.load(sampleHtml);
  });

  describe('parseRentals', () => {
    test('should parse rentals from fresh HTML sample', () => {
      const rentals = parseRentals(sampleHtml, cheerio);
      
      expect(rentals).toBeDefined();
      expect(Array.isArray(rentals)).toBe(true);
      expect(rentals.length).toBeGreaterThan(0);
    });

    test('should parse all rentals without parsing errors', () => {
      const rentals = parseRentals(sampleHtml, cheerio);
      
      // Check for parsing issues
      const roomsIssues = rentals.filter(r => r.rooms === '房型未明');
      const houseTypeIssues = rentals.filter(r => r.houseType === '房屋類型未明');
      
      expect(roomsIssues.length).toBe(0);
      expect(houseTypeIssues.length).toBe(0);
    });

    test('should return valid rental objects structure', () => {
      const rentals = parseRentals(sampleHtml, cheerio);
      
      if (rentals.length > 0) {
        const rental = rentals[0];
        
        expect(rental).toHaveProperty('title');
        expect(rental).toHaveProperty('link');
        expect(rental).toHaveProperty('houseType');
        expect(rental).toHaveProperty('rooms');
        expect(rental).toHaveProperty('metroTitle');
        expect(rental).toHaveProperty('metroValue');
        expect(rental).toHaveProperty('imgUrls');
        expect(rental).toHaveProperty('tags');
        expect(rental).toHaveProperty('timestamp');
        
        expect(typeof rental.title).toBe('string');
        expect(typeof rental.houseType).toBe('string');
        expect(typeof rental.rooms).toBe('string');
        expect(Array.isArray(rental.imgUrls)).toBe(true);
        expect(Array.isArray(rental.tags)).toBe(true);
      }
    });
  });

  describe('parseRental', () => {
    let firstRentalElement;

    beforeAll(() => {
      // Get first rental element for testing
      const items = $('.item');
      if (items.length > 0) {
        firstRentalElement = $(items.first());
      }
    });

    test('should parse valid rental element', () => {
      if (!firstRentalElement) {
        console.warn('No rental elements found in HTML sample');
        return;
      }

      const rental = parseRental(firstRentalElement, $);
      
      expect(rental).toBeDefined();
      expect(rental).not.toBeNull();
      expect(typeof rental.title).toBe('string');
      expect(rental.title.length).toBeGreaterThan(0);
    });

    test('should extract house type correctly', () => {
      if (!firstRentalElement) return;

      const rental = parseRental(firstRentalElement, $);
      
      expect(rental.houseType).toBeDefined();
      expect(typeof rental.houseType).toBe('string');
      expect(rental.houseType).not.toBe('房屋類型未明');
      
      // Should be one of the expected house types
      const validHouseTypes = ['整層住家', '獨立套房', '分租套房', '雅房'];
      expect(validHouseTypes).toContain(rental.houseType);
    });

    test('should extract rooms correctly', () => {
      if (!firstRentalElement) return;

      const rental = parseRental(firstRentalElement, $);
      
      expect(rental.rooms).toBeDefined();
      expect(typeof rental.rooms).toBe('string');
      expect(rental.rooms).not.toBe('房型未明');
      
      // Should match room pattern or be specific room types
      const roomPattern = /^\d+房\d*廳?.*$|^套房$|^雅房$/;
      expect(roomPattern.test(rental.rooms)).toBe(true);
    });

    test('should extract metro information', () => {
      if (!firstRentalElement) return;

      const rental = parseRental(firstRentalElement, $);
      
      if (rental.metroTitle) {
        expect(typeof rental.metroTitle).toBe('string');
        expect(rental.metroTitle.length).toBeGreaterThan(0);
      }
      
      if (rental.metroValue) {
        expect(typeof rental.metroValue).toBe('string');
        expect(rental.metroValue.length).toBeGreaterThan(0);
      }
    });

    test('should handle elements without titles', () => {
      // Create a mock element without title
      const mockHtml = '<div class="item"><div class="item-info-title"><a></a></div></div>';
      const mockElement = cheerio.load(mockHtml)('.item');
      
      const rental = parseRental(mockElement, cheerio.load(mockHtml));
      
      expect(rental).toBeNull();
    });

    test('should construct proper links', () => {
      if (!firstRentalElement) return;

      const rental = parseRental(firstRentalElement, $);
      
      if (rental.link) {
        expect(rental.link).toMatch(/^https:\/\/rent\.591\.com\.tw/);
      }
    });
  });

  describe('HTML structure validation', () => {
    test('should find rental items in HTML', () => {
      const items = $('.item');
      expect(items.length).toBeGreaterThan(0);
    });

    test('should find house-home elements', () => {
      const houseHomeElements = $('.item-info-txt:has(i.house-home)');
      expect(houseHomeElements.length).toBeGreaterThan(0);
    });

    test('should find rental titles', () => {
      const titleElements = $('.item-info-title a');
      expect(titleElements.length).toBeGreaterThan(0);
      
      // Check that titles have text content
      let hasTextContent = false;
      titleElements.each((i, elem) => {
        if ($(elem).text().trim().length > 0) {
          hasTextContent = true;
        }
      });
      expect(hasTextContent).toBe(true);
    });
  });

  describe('Regression tests', () => {
    test('should not produce room parsing issues that caused "房型未明"', () => {
      const rentals = parseRentals(sampleHtml, cheerio);
      
      // Count various room types to ensure parsing variety
      const roomTypes = rentals.map(r => r.rooms);
      const uniqueRoomTypes = [...new Set(roomTypes)];
      
      // Should have variety in room types (not all the same)
      expect(uniqueRoomTypes.length).toBeGreaterThan(1);
      
      // Should not contain default fallback values
      expect(roomTypes).not.toContain('房型未明');
      expect(roomTypes).not.toContain('房屋類型未明');
    });

    test('should handle different house types correctly', () => {
      const rentals = parseRentals(sampleHtml, cheerio);
      
      const houseTypes = rentals.map(r => r.houseType);
      const uniqueHouseTypes = [...new Set(houseTypes)];
      
      // Verify all house types are valid
      const validHouseTypes = ['整層住家', '獨立套房', '分租套房', '雅房', '其他'];
      uniqueHouseTypes.forEach(houseType => {
        expect(validHouseTypes).toContain(houseType);
      });
    });

    test('should parse metro distances correctly', () => {
      const rentals = parseRentals(sampleHtml, cheerio);
      
      const rentalsWithMetro = rentals.filter(r => r.metroValue && r.metroValue.includes('公尺'));
      
      if (rentalsWithMetro.length > 0) {
        rentalsWithMetro.forEach(rental => {
          expect(rental.metroValue).toMatch(/\d+公尺/);
          expect(rental.metroTitle).toMatch(/距.+站$|距.+捷運站$/);
        });
      }
    });
  });
});