/**
 * SearchUrl Domain Model
 * Handles 591.com.tw URL parsing, validation and manipulation
 */

class SearchUrl {
  constructor(url) {
    this.originalUrl = url;
    this.urlObj = null;
    this.isValid = false;
    
    this._parseUrl();
  }

  /**
   * Parse and validate the URL
   * @private
   */
  _parseUrl() {
    try {
      if (!this.originalUrl || typeof this.originalUrl !== 'string') {
        return;
      }

      this.urlObj = new URL(this.originalUrl);
      this.isValid = this._validate();
    } catch (error) {
      this.isValid = false;
    }
  }

  /**
   * Validate if URL is a valid 591.com.tw URL
   * @private
   * @returns {boolean} True if valid 591.com.tw URL
   */
  _validate() {
    if (!this.urlObj) return false;
    const hostname = this.urlObj.hostname.toLowerCase();
    return hostname.includes('591.com.tw') || hostname.includes('sale.591.com.tw');
  }

  /**
   * Check if URL contains multiple station parameters
   * @returns {boolean} True if URL has multiple stations
   */
  hasMultipleStations() {
    if (!this.isValid || !this.urlObj) return false;
    
    const stationParams = this.urlObj.searchParams.getAll('station');
    if (stationParams.length > 1) return true;
    
    // Check for comma-separated stations
    return stationParams.some(param => param.includes(','));
  }

  /**
   * Get all station IDs from URL
   * @returns {string[]} Array of station IDs
   */
  getStationIds() {
    if (!this.isValid || !this.urlObj) return [];
    
    const stationParams = this.urlObj.searchParams.getAll('station');
    let stations = [];
    
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
   * @returns {SearchUrl[]} Array of SearchUrl objects with individual stations
   */
  splitByStations() {
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
   * @param {string} stationId - Station ID to set
   * @returns {SearchUrl} New SearchUrl with specified station
   */
  withStation(stationId) {
    if (!this.isValid || !this.urlObj) return null;
    
    const newUrl = new URL(this.originalUrl);
    newUrl.searchParams.delete('station');
    newUrl.searchParams.set('station', stationId);
    return new SearchUrl(newUrl.toString());
  }

  /**
   * Generate storage key for this URL
   * @returns {string} Base64 encoded URL key (first 20 chars)
   */
  getStorageKey() {
    return Buffer.from(this.originalUrl).toString('base64').slice(0, 20);
  }

  /**
   * Get URL parameters as object
   * @returns {Object} URL parameters
   */
  getParams() {
    if (!this.isValid || !this.urlObj) return {};
    
    const params = {};
    this.urlObj.searchParams.forEach((value, key) => {
      if (params[key]) {
        // Handle multiple values for same key
        if (Array.isArray(params[key])) {
          params[key].push(value);
        } else {
          params[key] = [params[key], value];
        }
      } else {
        params[key] = value;
      }
    });
    
    return params;
  }

  /**
   * Get region parameter
   * @returns {string|null} Region ID or null
   */
  getRegion() {
    if (!this.isValid || !this.urlObj) return null;
    return this.urlObj.searchParams.get('region');
  }

  /**
   * Get metro parameter  
   * @returns {string|null} Metro ID or null
   */
  getMetro() {
    if (!this.isValid || !this.urlObj) return null;
    return this.urlObj.searchParams.get('metro');
  }

  /**
   * Check if this is a rental search URL (vs sale)
   * @returns {boolean} True if rental search URL
   */
  isRentalSearch() {
    if (!this.isValid || !this.urlObj) return false;
    return this.urlObj.pathname.includes('/rent/') || 
           this.urlObj.hostname.includes('rent.591.com.tw');
  }

  /**
   * Get the URL string
   * @returns {string} URL string
   */
  toString() {
    return this.originalUrl;
  }

  /**
   * Convert to plain object for serialization
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      url: this.originalUrl,
      isValid: this.isValid,
      isRental: this.isRentalSearch(),
      hasMultipleStations: this.hasMultipleStations(),
      stations: this.getStationIds(),
      region: this.getRegion(),
      metro: this.getMetro(),
      params: this.getParams()
    };
  }

  /**
   * Create SearchUrl from string
   * @param {string} url - URL string
   * @returns {SearchUrl} SearchUrl object
   */
  static fromString(url) {
    return new SearchUrl(url);
  }

  /**
   * Validate URL string
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid 591.com.tw URL
   */
  static isValid(url) {
    return new SearchUrl(url).isValid;
  }
}

module.exports = SearchUrl;