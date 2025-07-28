/**
 * Unit tests for PropertyId domain model
 */

import { describe, test, expect } from 'bun:test';
import PropertyId from '../../../lib/domain/PropertyId.js';

interface TestProperty {
  title?: string;
  link?: string;
  metroValue?: string;
}

describe('PropertyId Domain Model', () => {
  describe('ID generation', () => {
    test('should generate consistent IDs for duplicate rentals', () => {
      const rental1: TestProperty = {
        title: 'Test Rental',
        link: 'https://rent.591.com.tw/12345',
        metroValue: '500公尺'
      };
      
      const rental2: TestProperty = {
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
      const rental1: TestProperty = {
        title: 'Test Rental A',
        link: 'https://rent.591.com.tw/12345'
      };
      
      const rental2: TestProperty = {
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
      const rentals: TestProperty[] = [
        { link: 'https://rent.591.com.tw/12345' },
        { link: 'https://rent.591.com.tw/67890' },
        { link: 'https://rent.591.com.tw/12345' } // Duplicate
      ];
      
      const idSet = new Set<string>();
      const duplicateIds: string[] = [];
      
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
      const rental: TestProperty = {
        title: 'Test Rental',
        // No link property
      };
      
      const id = PropertyId.fromProperty(rental);
      expect(id).toBeDefined();
    });
  });

  describe('edge cases', () => {
    test('should throw error for empty rental objects', () => {
      const rental: TestProperty = {};
      expect(() => PropertyId.fromProperty(rental)).toThrow('Unable to generate PropertyId: property must have at least a link or title');
    });

    test('should throw error for null/undefined input', () => {
      expect(() => PropertyId.fromProperty(null as any)).toThrow('Property object is required');
      expect(() => PropertyId.fromProperty(undefined as any)).toThrow('Property object is required');
    });

    test('should throw error for malformed URLs without title', () => {
      const rental: TestProperty = {
        link: 'not-a-valid-url'
      };
      
      expect(() => PropertyId.fromProperty(rental)).toThrow('Unable to generate PropertyId: property must have at least a link or title');
    });
  });
});