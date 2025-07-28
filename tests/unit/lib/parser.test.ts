/**
 * Parser unit tests
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { parseRental, parseRentals } from '../../../lib/parser.js';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

interface ParsedRental {
  title: string;
  link: string | null;
  houseType: string;
  rooms: string;
  metroTitle: string;
  metroValue: string;
  imgUrls: string[];
  tags: string[];
  timestamp: string;
}

describe('Parser', () => {
  let sampleHtml: string;
  let $: cheerio.CheerioAPI;

  beforeAll(() => {
    // Load fresh HTML sample for testing
    const htmlPath = path.join(__dirname, '../../../samples/sample_591.html');
    sampleHtml = fs.readFileSync(htmlPath, 'utf8');
    $ = cheerio.load(sampleHtml);
  });

  describe('parseRentals', () => {
    test('should parse rentals from fresh HTML sample', () => {
      const rentals: ParsedRental[] = parseRentals(sampleHtml, cheerio);
      
      expect(rentals).toBeDefined();
      expect(Array.isArray(rentals)).toBe(true);
      expect(rentals.length).toBeGreaterThan(0);
    });

    test('should parse all rentals without parsing errors', () => {
      const rentals: ParsedRental[] = parseRentals(sampleHtml, cheerio);
      
      // Check for parsing issues
      const roomsIssues = rentals.filter(r => r.rooms === '房型未明');
      const houseTypeIssues = rentals.filter(r => r.houseType === '房屋類型未明');
      
      expect(roomsIssues.length).toBe(0);
      expect(houseTypeIssues.length).toBe(0);
    });

    test('should return valid rental objects structure', () => {
      const rentals: ParsedRental[] = parseRentals(sampleHtml, cheerio);
      
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
});