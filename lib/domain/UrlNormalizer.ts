/**
 * URL Normalization Utility
 * Handles URL parameter variations that represent the same search criteria
 */

import SearchUrl, { UrlParams } from './SearchUrl';

interface NormalizedParamsInternal {
  region?: string;
  kind?: string;
  station?: string;
  metro?: string;
  rentprice?: string;
  section?: string;
  other?: string;
  floor?: string;
  order?: string;
  orderType?: string;
  hasimg?: string;
  not_cover?: string;
  role?: string;
}

interface UrlGroup {
  queryId: string;
  description: string;
  urls: string[];
}

interface UrlCandidate {
  original: string;
  normalized: string;
  length: number;
  paramCount: number;
}

class UrlNormalizer {
  /**
   * Normalize a URL to standardize parameter variations
   * @param url - URL to normalize
   * @returns Normalized SearchUrl object
   */
  static normalize(url: string | SearchUrl): SearchUrl {
    const searchUrl = url instanceof SearchUrl ? url : new SearchUrl(url);
    
    if (!searchUrl.isValid) {
      return searchUrl;
    }

    const params = searchUrl.getParams();
    const normalized = this._normalizeParams(params);
    
    // Rebuild URL with normalized parameters
    const newUrl = new URL(searchUrl.originalUrl);
    
    // Clear all existing parameters
    newUrl.searchParams.forEach((value, key) => {
      newUrl.searchParams.delete(key);
    });
    
    // Add normalized parameters in consistent order
    this._addNormalizedParams(newUrl, normalized);
    
    return new SearchUrl(newUrl.toString());
  }

  /**
   * Check if two URLs represent the same search criteria
   * @param url1 - First URL
   * @param url2 - Second URL
   * @returns True if URLs represent same search
   */
  static areEquivalent(url1: string | SearchUrl, url2: string | SearchUrl): boolean {
    const normalized1 = this.normalize(url1);
    const normalized2 = this.normalize(url2);
    
    return normalized1.getQueryId() === normalized2.getQueryId();
  }

  /**
   * Group URLs by their normalized query ID
   * @param urls - Array of URLs to group
   * @returns Object with queryId as key and URLs array as value
   */
  static groupByQuery(urls: (string | SearchUrl)[]): Record<string, UrlGroup> {
    const groups: Record<string, UrlGroup> = {};
    
    urls.forEach(url => {
      const normalized = this.normalize(url);
      const queryId = normalized.getQueryId();
      
      if (!queryId) return; // Skip invalid URLs
      
      if (!groups[queryId]) {
        groups[queryId] = {
          queryId,
          description: normalized.getQueryDescription(),
          urls: []
        };
      }
      
      const originalUrl = url instanceof SearchUrl ? url.originalUrl : url;
      groups[queryId].urls.push(originalUrl);
    });
    
    return groups;
  }

  /**
   * Find canonical URL for a group of equivalent URLs
   * @param urls - Array of equivalent URLs
   * @returns Canonical URL (shortest, most standard form)
   */
  static getCanonicalUrl(urls: (string | SearchUrl)[]): string | null {
    if (!urls || urls.length === 0) return null;
    if (urls.length === 1) {
      return urls[0] instanceof SearchUrl ? urls[0].originalUrl : urls[0];
    }

    // Normalize all URLs and pick the shortest valid one
    const candidates: UrlCandidate[] = urls
      .map(url => {
        const searchUrl = url instanceof SearchUrl ? url : new SearchUrl(url);
        const normalized = this.normalize(searchUrl);
        return {
          original: searchUrl.originalUrl,
          normalized: normalized.originalUrl,
          length: normalized.originalUrl.length,
          paramCount: Object.keys(normalized.getParams()).length
        };
      })
      .filter(candidate => candidate.length > 0)
      .sort((a, b) => {
        // Prefer fewer parameters first, then shorter URL
        if (a.paramCount !== b.paramCount) {
          return a.paramCount - b.paramCount;
        }
        return a.length - b.length;
      });

    return candidates.length > 0 ? candidates[0].normalized : (urls[0] instanceof SearchUrl ? urls[0].originalUrl : urls[0]);
  }

  /**
   * Normalize URL parameters
   * @private
   * @param params - Original URL parameters
   * @returns Normalized parameters
   */
  private static _normalizeParams(params: UrlParams): NormalizedParamsInternal {
    const normalized: NormalizedParamsInternal = {};

    // Region - always include if present
    if (params.region) {
      normalized.region = params.region.toString();
    }

    // Kind - include if not default (0)
    if (params.kind !== undefined && params.kind !== '0') {
      normalized.kind = params.kind.toString();
    }

    // Stations - consolidate and sort
    const stations = this._consolidateStations(params);
    if (stations.length > 0) {
      normalized.station = stations.sort().join(',');
    }

    // Metro - only if no stations specified
    if (!stations.length && params.metro) {
      normalized.metro = params.metro.toString();
    }

    // Price range - normalize format
    if (params.rentprice) {
      normalized.rentprice = this._normalizePriceRange(params.rentprice.toString());
    }

    // Section - consolidate and sort
    if (params.section) {
      const sections = Array.isArray(params.section) ? params.section : [params.section];
      normalized.section = sections.map(s => s.toString()).sort().join(',');
    }

    // Room filters - consolidate and sort
    const roomFilters = this._consolidateRoomFilters(params);
    if (roomFilters.length > 0) {
      normalized.other = roomFilters.sort().join(',');
    }

    // Floor range
    if (params.floor) {
      normalized.floor = params.floor.toString();
    }

    // Additional common parameters to preserve
    const additionalParams: (keyof NormalizedParamsInternal)[] = ['order', 'orderType', 'hasimg', 'not_cover', 'role'];
    additionalParams.forEach(key => {
      if (params[key]) {
        normalized[key] = params[key].toString();
      }
    });

    return normalized;
  }

  /**
   * Consolidate station parameters from various formats
   * @private
   * @param params - URL parameters
   * @returns Consolidated station IDs
   */
  private static _consolidateStations(params: UrlParams): string[] {
    const stations = new Set<string>();

    // Handle 'station' parameter (can be array or comma-separated)
    if (params.station) {
      const stationParams = Array.isArray(params.station) ? params.station : [params.station];
      stationParams.forEach(param => {
        if (param.includes(',')) {
          param.split(',').forEach(s => stations.add(s.trim()));
        } else {
          stations.add(param.trim());
        }
      });
    }

    return Array.from(stations).filter(s => s);
  }

  /**
   * Consolidate room filter parameters
   * @private
   * @param params - URL parameters
   * @returns Consolidated room filters
   */
  private static _consolidateRoomFilters(params: UrlParams): string[] {
    const filters = new Set<string>();

    const roomFilterKeys = ['other', 'roomFilter', 'room'];
    roomFilterKeys.forEach(key => {
      if (params[key]) {
        const values = Array.isArray(params[key]) ? params[key] : [params[key]];
        values.forEach(value => {
          if (typeof value === 'string' && value.includes(',')) {
            value.split(',').forEach(f => filters.add(f.trim()));
          } else {
            filters.add(value.toString().trim());
          }
        });
      }
    });

    return Array.from(filters).filter(f => f);
  }

  /**
   * Normalize price range format
   * @private
   * @param priceRange - Original price range
   * @returns Normalized price range
   */
  private static _normalizePriceRange(priceRange: string): string {
    if (!priceRange) return '';

    const prices = priceRange.split(',');
    if (prices.length === 2) {
      const min = parseInt(prices[0]) || 0;
      const max = parseInt(prices[1]) || 0;
      
      // Remove redundant zero values
      if (min === 0 && max > 0) {
        return `,${max}`;
      } else if (min > 0 && max === 0) {
        return `${min},`;
      } else if (min > 0 && max > 0) {
        return `${min},${max}`;
      }
    }

    return priceRange;
  }

  /**
   * Add normalized parameters to URL in consistent order
   * @private
   * @param url - URL object to modify
   * @param params - Normalized parameters
   */
  private static _addNormalizedParams(url: URL, params: NormalizedParamsInternal): void {
    // Add parameters in consistent order for deterministic URLs
    const order: (keyof NormalizedParamsInternal)[] = [
      'region', 'kind', 'station', 'metro', 'section', 
      'rentprice', 'other', 'floor', 'order', 'orderType', 
      'hasimg', 'not_cover', 'role'
    ];

    order.forEach(key => {
      if (params[key]) {
        url.searchParams.set(key, params[key]!);
      }
    });

    // Add any remaining parameters not in the standard order
    Object.keys(params).forEach(key => {
      const typedKey = key as keyof NormalizedParamsInternal;
      if (!order.includes(typedKey) && params[typedKey]) {
        url.searchParams.set(key, params[typedKey]!);
      }
    });
  }

  /**
   * Extract search variations that should be considered equivalent
   * @param url - URL to analyze
   * @returns Array of equivalent URL variations
   */
  static getEquivalentVariations(url: string | SearchUrl): string[] {
    const searchUrl = url instanceof SearchUrl ? url : new SearchUrl(url);
    
    if (!searchUrl.isValid) {
      return [searchUrl.originalUrl];
    }

    const variations = new Set([searchUrl.originalUrl]);
    const normalized = this.normalize(searchUrl);
    
    // Add normalized version
    variations.add(normalized.originalUrl);
    
    // Generate common variations
    const baseUrl = new URL(searchUrl.originalUrl);
    const params = searchUrl.getParams();
    
    // Variation 1: Remove default kind=0
    if (params.kind === '0') {
      const variation1 = new URL(baseUrl);
      variation1.searchParams.delete('kind');
      variations.add(variation1.toString());
    }
    
    // Variation 2: Add/remove trailing commas in price ranges
    if (params.rentprice) {
      const variation2 = new URL(baseUrl);
      const price = params.rentprice.toString();
      if (price.endsWith(',')) {
        variation2.searchParams.set('rentprice', price.slice(0, -1));
      } else if (price.startsWith(',')) {
        variation2.searchParams.set('rentprice', price.slice(1));
      }
      variations.add(variation2.toString());
    }
    
    return Array.from(variations);
  }
}

export default UrlNormalizer;
export { UrlNormalizer, NormalizedParamsInternal, UrlGroup, UrlCandidate };