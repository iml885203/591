/**
 * Unit tests for PropertyId domain model
 */

const PropertyId = require('../../../lib/domain/valueObjects/PropertyId');

describe('PropertyId Domain Model', () => {
  describe('ID generation', () => {
    test('should generate consistent IDs for duplicate rentals', () => {
      const rental1 = {
        title: 'Test Rental',
        link: 'https://rent.591.com.tw/12345',
        metroValue: '500公尺'
      };
      
      const rental2 = {
        title: 'Test Rental',
        link: 'https://rent.591.com.tw/12345',
        metroValue: '300公尺' // Different metro value
      };
      
      const id1 = PropertyId.fromProperty(rental1);
      const id2 = PropertyId.fromProperty(rental2);
      
      expect(id1.toString()).toBe(id2.toString()); // Same ID despite different metro values
      expect(id1.toString()).toBe('12345'); // URL-based ID
    });

    test('should generate different IDs for different properties', () => {
      const rental1 = {
        title: 'Test Rental A',
        link: 'https://rent.591.com.tw/12345'
      };
      
      const rental2 = {
        title: 'Test Rental B',
        link: 'https://rent.591.com.tw/67890'
      };
      
      const id1 = PropertyId.fromProperty(rental1);
      const id2 = PropertyId.fromProperty(rental2);
      
      expect(id1.toString()).not.toBe(id2.toString());
      expect(id1.toString()).toBe('12345');
      expect(id2.toString()).toBe('67890');
    });
  });

  describe('ID sets for duplicate detection', () => {
    test('should create ID sets for duplicate detection', () => {
      const rentals = [
        { link: 'https://rent.591.com.tw/12345' },
        { link: 'https://rent.591.com.tw/67890' },
        { link: 'https://rent.591.com.tw/12345' } // Duplicate
      ];
      
      const idSet = new Set();
      const duplicateIds = [];
      
      rentals.forEach(rental => {
        const id = PropertyId.fromProperty(rental);
        const idString = id.toString();
        
        if (idSet.has(idString)) {
          duplicateIds.push(idString);
        } else {
          idSet.add(idString);
        }
      });
      
      expect(idSet.size).toBe(2);
      expect(duplicateIds).toEqual(['12345']);
    });

    test('should handle properties without links', () => {
      const rental = {
        title: 'Test Rental',
        // No link property
      };
      
      const id = PropertyId.fromProperty(rental);
      expect(id).toBeDefined();
    });
  });

  describe('edge cases', () => {
    test('should throw error for empty rental objects', () => {
      const rental = {};
      expect(() => PropertyId.fromProperty(rental)).toThrow('Unable to generate PropertyId: property must have at least a link or title');
    });

    test('should throw error for null/undefined input', () => {
      expect(() => PropertyId.fromProperty(null)).toThrow('Property object is required');
      expect(() => PropertyId.fromProperty(undefined)).toThrow('Property object is required');
    });

    test('should throw error for malformed URLs without title', () => {
      const rental = {
        link: 'not-a-valid-url'
      };
      
      expect(() => PropertyId.fromProperty(rental)).toThrow('Unable to generate PropertyId: property must have at least a link or title');
    });
  });
});