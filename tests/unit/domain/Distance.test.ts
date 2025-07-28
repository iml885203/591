/**
 * Unit tests for Distance domain model
 */

import { describe, test, expect } from 'bun:test';
import Distance from '../../../lib/domain/Distance.js';

interface WalkingTimeTest {
  input: string;
  expected: number;
}

describe('Distance Domain Model', () => {
  describe('creating Distance instances', () => {
    test('should create distance from meters', () => {
      const distance = Distance.fromMeters(500);
      
      expect(distance.toMeters()).toBe(500);
      expect(distance.toString()).toBe('500m');
    });

    test('should create distance from metro value in meters', () => {
      const distance = Distance.fromMetroValue('500公尺');
      
      expect(distance.toMeters()).toBe(500);
      expect(distance.toString()).toBe('500m');
    });

    test('should create distance from metro value in minutes', () => {
      const distance = Distance.fromMetroValue('8分鐘');
      
      expect(distance.toMeters()).toBe(640); // 8 * 80
      expect(distance.toString()).toBe('640m');
    });

    test('should handle walking time conversion correctly', () => {
      const walkingTimes: WalkingTimeTest[] = [
        { input: '1分鐘', expected: 80 },
        { input: '5分鐘', expected: 400 },
        { input: '10分鐘', expected: 800 },
        { input: '15分鐘', expected: 1200 }
      ];

      walkingTimes.forEach(({ input, expected }) => {
        const distance = Distance.fromMetroValue(input);
        expect(distance.toMeters()).toBe(expected);
      });
    });
  });

  describe('distance comparison and utilities', () => {
    test('should find minimum distance from multiple distances', () => {
      const distances: Distance[] = [
        Distance.fromMeters(800),
        Distance.fromMeters(300),
        Distance.fromMeters(1200)
      ];
      
      const minDistance = Distance.getMinimum(distances);
      expect(minDistance?.toMeters()).toBe(300);
    });

    test('should handle empty distance array', () => {
      const minDistance = Distance.getMinimum([]);
      expect(minDistance).toBeNull();
    });

    test('should handle single distance in array', () => {
      const distances: Distance[] = [Distance.fromMeters(500)];
      const minDistance = Distance.getMinimum(distances);
      expect(minDistance?.toMeters()).toBe(500);
    });
  });

  describe('edge cases', () => {
    test('should handle zero distance', () => {
      const distance = Distance.fromMeters(0);
      expect(distance.toMeters()).toBe(0);
      expect(distance.toString()).toBe('0m');
    });

    test('should handle invalid metro values gracefully', () => {
      // Assuming the implementation handles invalid inputs
      const distance = Distance.fromMetroValue('invalid');
      expect(distance).toBeDefined();
    });
  });
});