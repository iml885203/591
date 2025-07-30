/**
 * SearchUrl Domain Model
 * Handles 591.com.tw URL parsing, validation and manipulation
 */

interface UrlParams {
  [key: string]: string | string[];
}

interface NormalizedParams {
  region?: string;
  kind?: string;
  stations?: string[];
  metro?: string;
  rentprice?: string;
  section?: string[];
  roomFilter?: string[];
  floor?: string;
}

interface SearchUrlData {
  url: string;
  isValid: boolean;
  isRental: boolean;
  hasMultipleStations: boolean;
  stations: string[];
  region: string | null;
  metro: string | null;
  params: UrlParams;
  queryId: string | null;
  queryDescription: string;
}

class SearchUrl {
  public readonly originalUrl: string;
  public readonly urlObj: URL | null;
  public readonly isValid: boolean;

  constructor(url: string) {
    this.originalUrl = url;
    this.urlObj = null;
    this.isValid = false;
    
    this._parseUrl();
  }

  /**
   * Parse and validate the URL
   * @private
   */
  private _parseUrl(): void {
    try {
      if (!this.originalUrl || typeof this.originalUrl !== 'string') {
        return;
      }

      (this as any).urlObj = new URL(this.originalUrl);
      (this as any).isValid = this._validate();
    } catch (error) {
      (this as any).isValid = false;
    }
  }

  /**
   * Validate if URL is a valid 591.com.tw URL
   * @private
   * @returns True if valid 591.com.tw URL
   */
  private _validate(): boolean {
    if (!this.urlObj) return false;
    const hostname = this.urlObj.hostname.toLowerCase();
    return hostname.includes('591.com.tw') || hostname.includes('sale.591.com.tw');
  }

  /**
   * Check if URL contains multiple station parameters
   * @returns True if URL has multiple stations
   */
  hasMultipleStations(): boolean {
    if (!this.isValid || !this.urlObj) return false;
    
    const stationParams = this.urlObj.searchParams.getAll('station');
    if (stationParams.length > 1) return true;
    
    // Check for comma-separated stations
    return stationParams.some(param => param.includes(','));
  }

  /**
   * Get all station IDs from URL
   * @returns Array of station IDs
   */
  getStationIds(): string[] {
    if (!this.isValid || !this.urlObj) return [];
    
    const stationParams = this.urlObj.searchParams.getAll('station');
    let stations: string[] = [];
    
    stationParams.forEach(param => {
      if (param.includes(',')) {
        // Handle comma-separated stations: station=123,456,789
        stations.push(...param.split(',').map(s => s.trim()));
      } else {
        // Handle individual station params: station=123&station=456
        stations.push(param.trim());
      }
    });

    // Remove duplicates and filter out empty values
    return [...new Set(stations)].filter(s => s);
  }

  /**
   * Split URL into multiple URLs with individual station parameters
   * @returns Array of SearchUrl objects with individual stations
   */
  splitByStations(): SearchUrl[] {
    const stationIds = this.getStationIds();
    
    if (stationIds.length <= 1) {
      return [this]; // Return self if only one or no stations
    }

    return stationIds.map(stationId => {
      const newUrl = new URL(this.originalUrl);
      newUrl.searchParams.delete('station'); // Remove all existing station params
      newUrl.searchParams.set('station', stationId); // Set single station
      return new SearchUrl(newUrl.toString());
    });
  }

  /**
   * Create a new SearchUrl with specific station
   * @param stationId - Station ID to set
   * @returns New SearchUrl with specified station
   */
  withStation(stationId: string): SearchUrl | null {
    if (!this.isValid || !this.urlObj) return null;
    
    const newUrl = new URL(this.originalUrl);
    newUrl.searchParams.delete('station');
    newUrl.searchParams.set('station', stationId);
    return new SearchUrl(newUrl.toString());
  }

  /**
   * Generate storage key for this URL
   * @returns Base64 encoded URL key (first 20 chars)
   */
  getStorageKey(): string {
    return Buffer.from(this.originalUrl).toString('base64').slice(0, 20);
  }

  /**
   * Generate a deterministic query ID from normalized URL parameters
   * @returns Deterministic query ID (e.g., "region1_kind0_stations4232-4233_price15000-30000")
   */
  getQueryId(): string | null {
    if (!this.isValid || !this.urlObj) return null;
    
    const params = this.getParams();
    const normalized = this._normalizeParams(params);
    
    // Build query ID components in consistent order
    const components: string[] = [];
    
    // Region (required for most searches)
    if (normalized.region) {
      components.push(`region${normalized.region}`);
    }
    
    // Kind (rental type)
    if (normalized.kind !== undefined) {
      components.push(`kind${normalized.kind}`);
    }
    
    // Metro/Stations (sorted for consistency)
    if (normalized.stations && normalized.stations.length > 0) {
      const stationStr = normalized.stations.sort().join('-');
      components.push(`stations${stationStr}`);
    } else if (normalized.metro) {
      components.push(`metro${normalized.metro}`);
    }
    
    // Price range
    if (normalized.rentprice) {
      components.push(`price${normalized.rentprice}`);
    }
    
    // Section (district)
    if (normalized.section && normalized.section.length > 0) {
      const sectionStr = normalized.section.sort().join('-');
      components.push(`section${sectionStr}`);
    }
    
    // Room type filters
    if (normalized.roomFilter && normalized.roomFilter.length > 0) {
      const roomStr = normalized.roomFilter.sort().join('-');
      components.push(`rooms${roomStr}`);
    }
    
    // Floor range
    if (normalized.floor) {
      components.push(`floor${normalized.floor}`);
    }
    
    return components.join('_') || 'unknown';
  }

  /**
   * Generate a human-readable description of the search criteria
   * @returns Human-readable search description
   */
  getQueryDescription(): string {
    if (!this.isValid || !this.urlObj) return 'Invalid search URL';
    
    const params = this.getParams();
    const normalized = this._normalizeParams(params);
    const parts: string[] = [];
    
    // Region mapping (basic Taiwan regions)
    const regions: Record<string, string> = {
      '1': '台北市',
      '2': '基隆市',
      '3': '新北市',
      '4': '宜蘭縣',
      '5': '桃園市',
      '6': '新竹縣',
      '7': '新竹市',
      '8': '苗栗縣',
      '9': '台中市',
      '10': '彰化縣',
      '11': '南投縣',
      '12': '嘉義市',
      '13': '嘉義縣',
      '14': '雲林縣',
      '15': '台南市',
      '16': '高雄市',
      '17': '澎湖縣',
      '18': '金門縣',
      '19': '屏東縣',
      '20': '台東縣',
      '21': '花蓮縣',
      '22': '連江縣'
    };
    
    // Kind mapping
    const kinds: Record<string, string> = {
      '0': '所有類型',
      '1': '整層住家',
      '2': '雅房',
      '3': '分租套房',
      '4': '車位',
      '8': '其他'
    };
    
    // Region
    if (normalized.region) {
      const regionName = regions[normalized.region] || `區域${normalized.region}`;
      parts.push(regionName);
    }
    
    // Kind
    if (normalized.kind !== undefined) {
      const kindName = kinds[normalized.kind] || `類型${normalized.kind}`;
      if (normalized.kind !== '0') {
        parts.push(kindName);
      }
    }
    
    // Stations
    if (normalized.stations && normalized.stations.length > 0) {
      if (normalized.stations.length === 1) {
        parts.push(`近捷運站${normalized.stations[0]}`);
      } else {
        parts.push(`近${normalized.stations.length}個捷運站`);
      }
    } else if (normalized.metro) {
      parts.push(`捷運${normalized.metro}線`);
    }
    
    // Price range
    if (normalized.rentprice) {
      const prices = normalized.rentprice.split(',');
      if (prices.length === 2) {
        const min = parseInt(prices[0]);
        const max = parseInt(prices[1]);
        if (min > 0 && max > min) {
          parts.push(`${min.toLocaleString()}-${max.toLocaleString()}元`);
        } else if (min > 0) {
          parts.push(`${min.toLocaleString()}元以上`);
        } else if (max > 0) {
          parts.push(`${max.toLocaleString()}元以下`);
        }
      }
    }
    
    // Room filters
    if (normalized.roomFilter && normalized.roomFilter.length > 0) {
      const roomTypes = normalized.roomFilter.map(r => `${r}房`).join('、');
      parts.push(roomTypes);
    }
    
    // Floor range
    if (normalized.floor) {
      const floors = normalized.floor.split(',');
      if (floors.length === 2) {
        parts.push(`${floors[0]}-${floors[1]}樓`);
      }
    }
    
    return parts.length > 0 ? parts.join(' ') : '基本搜尋';
  }

  /**
   * Normalize URL parameters for consistent query ID generation
   * @private
   * @param params - URL parameters
   * @returns Normalized parameters
   */
  private _normalizeParams(params: UrlParams): NormalizedParams {
    const normalized: NormalizedParams = {};
    
    // Normalize region
    if (params.region) {
      normalized.region = params.region.toString();
    }
    
    // Normalize kind
    if (params.kind !== undefined) {
      normalized.kind = params.kind.toString();
    }
    
    // Normalize stations (handle both single and multiple)
    if (params.station) {
      const stations = Array.isArray(params.station) ? params.station : [params.station];
      const allStations: string[] = [];
      stations.forEach(station => {
        if (station.includes(',')) {
          allStations.push(...station.split(',').map(s => s.trim()));
        } else {
          allStations.push(station.trim());
        }
      });
      if (allStations.length > 0) {
        normalized.stations = [...new Set(allStations)]; // Remove duplicates
      }
    }
    
    // Normalize metro
    if (params.metro) {
      normalized.metro = params.metro.toString();
    }
    
    // Normalize price range
    if (params.rentprice) {
      normalized.rentprice = params.rentprice.toString();
    }
    
    // Normalize sections
    if (params.section) {
      const sections = Array.isArray(params.section) ? params.section : [params.section];
      normalized.section = sections.map(s => s.toString());
    }
    
    // Normalize room filters
    if (params.roomFilter || params.other) {
      const roomFilter = params.roomFilter || params.other;
      const rooms = Array.isArray(roomFilter) ? roomFilter : [roomFilter];
      normalized.roomFilter = rooms.map(r => r.toString());
    }
    
    // Normalize floor range
    if (params.floor) {
      normalized.floor = params.floor.toString();
    }
    
    return normalized;
  }

  /**
   * Get URL parameters as object
   * @returns URL parameters
   */
  getParams(): UrlParams {
    if (!this.isValid || !this.urlObj) return {};
    
    const params: UrlParams = {};
    this.urlObj.searchParams.forEach((value, key) => {
      if (params[key]) {
        // Handle multiple values for same key
        if (Array.isArray(params[key])) {
          (params[key] as string[]).push(value);
        } else {
          params[key] = [params[key] as string, value];
        }
      } else {
        params[key] = value;
      }
    });
    
    return params;
  }

  /**
   * Get region parameter
   * @returns Region ID or null
   */
  getRegion(): string | null {
    if (!this.isValid || !this.urlObj) return null;
    return this.urlObj.searchParams.get('region');
  }

  /**
   * Get metro parameter  
   * @returns Metro ID or null
   */
  getMetro(): string | null {
    if (!this.isValid || !this.urlObj) return null;
    return this.urlObj.searchParams.get('metro');
  }

  /**
   * Check if this is a rental search URL (vs sale)
   * @returns True if rental search URL
   */
  isRentalSearch(): boolean {
    if (!this.isValid || !this.urlObj) return false;
    return this.urlObj.pathname.includes('/rent/') || 
           this.urlObj.hostname.includes('rent.591.com.tw');
  }

  /**
   * Get the URL string
   * @returns URL string
   */
  toString(): string {
    return this.originalUrl;
  }

  /**
   * Convert to plain object for serialization
   * @returns Plain object representation
   */
  toJSON(): SearchUrlData {
    return {
      url: this.originalUrl,
      isValid: this.isValid,
      isRental: this.isRentalSearch(),
      hasMultipleStations: this.hasMultipleStations(),
      stations: this.getStationIds(),
      region: this.getRegion(),
      metro: this.getMetro(),
      params: this.getParams(),
      queryId: this.getQueryId(),
      queryDescription: this.getQueryDescription()
    };
  }

  /**
   * Create SearchUrl from string
   * @param url - URL string
   * @returns SearchUrl object
   */
  static fromString(url: string): SearchUrl {
    return new SearchUrl(url);
  }

  /**
   * Validate URL string
   * @param url - URL to validate
   * @returns True if valid 591.com.tw URL
   */
  static isValid(url: string): boolean {
    return new SearchUrl(url).isValid;
  }
}

export default SearchUrl;
export { SearchUrl, UrlParams, NormalizedParams, SearchUrlData };