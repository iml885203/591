/**
 * QueryId Domain Model
 * Handles query ID generation, parsing, and validation for 591 crawler search queries
 */

const SearchUrl = require('./SearchUrl');

class QueryId {
  constructor(queryId) {
    this.id = queryId;
    this.components = this._parseQueryId(queryId);
    this.isValid = this._validate();
  }

  /**
   * Parse query ID into components
   * @private
   * @param {string} queryId - Query ID to parse
   * @returns {Object} Parsed components
   */
  _parseQueryId(queryId) {
    if (!queryId || typeof queryId !== 'string') {
      return {};
    }

    const components = {};
    const parts = queryId.split('_');

    parts.forEach(part => {
      if (part.startsWith('region')) {
        components.region = part.substring(6);
      } else if (part.startsWith('kind')) {
        components.kind = part.substring(4);
      } else if (part.startsWith('stations')) {
        components.stations = part.substring(8).split('-');
      } else if (part.startsWith('metro')) {
        components.metro = part.substring(5);
      } else if (part.startsWith('price')) {
        components.price = part.substring(5);
      } else if (part.startsWith('section')) {
        components.section = part.substring(7).split('-');
      } else if (part.startsWith('rooms')) {
        components.rooms = part.substring(5).split('-');
      } else if (part.startsWith('floor')) {
        components.floor = part.substring(5);
      }
    });

    return components;
  }

  /**
   * Validate query ID format
   * @private
   * @returns {boolean} True if valid
   */
  _validate() {
    if (!this.id || this.id === 'unknown') return false;
    
    // Must have at least region
    return this.components.region !== undefined;
  }

  /**
   * Get region from query ID
   * @returns {string|null} Region ID
   */
  getRegion() {
    return this.components.region || null;
  }

  /**
   * Get rental kind from query ID
   * @returns {string|null} Kind ID
   */
  getKind() {
    return this.components.kind || null;
  }

  /**
   * Get stations from query ID
   * @returns {string[]} Array of station IDs
   */
  getStations() {
    return this.components.stations || [];
  }

  /**
   * Get metro line from query ID
   * @returns {string|null} Metro line ID
   */
  getMetro() {
    return this.components.metro || null;
  }

  /**
   * Get price range from query ID
   * @returns {Object|null} Price range object with min/max
   */
  getPriceRange() {
    if (!this.components.price) return null;

    const prices = this.components.price.split(',');
    if (prices.length === 2) {
      return {
        min: parseInt(prices[0]) || null,
        max: parseInt(prices[1]) || null,
        raw: this.components.price
      };
    }
    return { raw: this.components.price };
  }

  /**
   * Get sections from query ID
   * @returns {string[]} Array of section IDs
   */
  getSections() {
    return this.components.section || [];
  }

  /**
   * Get room filters from query ID
   * @returns {string[]} Array of room counts
   */
  getRoomFilters() {
    return this.components.rooms || [];
  }

  /**
   * Get floor range from query ID
   * @returns {string|null} Floor range
   */
  getFloorRange() {
    return this.components.floor || null;
  }

  /**
   * Check if this query matches another query (same criteria)
   * @param {QueryId|string} other - Other query ID to compare
   * @returns {boolean} True if queries match
   */
  matches(other) {
    const otherId = other instanceof QueryId ? other.id : other;
    return this.id === otherId;
  }

  /**
   * Check if this query is similar to another (overlapping criteria)
   * @param {QueryId|string} other - Other query ID to compare
   * @returns {boolean} True if queries are similar
   */
  isSimilarTo(other) {
    const otherQuery = other instanceof QueryId ? other : new QueryId(other);
    
    if (!this.isValid || !otherQuery.isValid) return false;

    // Must have same region
    if (this.getRegion() !== otherQuery.getRegion()) return false;

    // Check for overlapping stations
    const myStations = this.getStations();
    const otherStations = otherQuery.getStations();
    
    if (myStations.length > 0 && otherStations.length > 0) {
      const hasOverlap = myStations.some(s => otherStations.includes(s));
      if (hasOverlap) return true;
    }

    // Check for overlapping price ranges
    const myPrice = this.getPriceRange();
    const otherPrice = otherQuery.getPriceRange();
    
    if (myPrice && otherPrice && myPrice.min && myPrice.max && otherPrice.min && otherPrice.max) {
      const overlap = !(myPrice.max < otherPrice.min || otherPrice.max < myPrice.min);
      if (overlap) return true;
    }

    return false;
  }

  /**
   * Generate a hash for grouping similar queries
   * @returns {string} Hash representing query characteristics
   */
  getGroupHash() {
    const parts = [];
    
    parts.push(`r${this.getRegion() || 'unknown'}`);
    
    if (this.getKind()) {
      parts.push(`k${this.getKind()}`);
    }
    
    const stations = this.getStations();
    if (stations.length > 0) {
      // Group by station count for similar searches
      parts.push(`s${stations.length}`);
    }
    
    const price = this.getPriceRange();
    if (price && price.min && price.max) {
      // Group by price tier (10k ranges)
      const tier = Math.floor(price.min / 10000) * 10;
      parts.push(`p${tier}k`);
    }
    
    return parts.join('_');
  }

  /**
   * Convert to object for serialization
   * @returns {Object} Query ID data
   */
  toJSON() {
    return {
      id: this.id,
      isValid: this.isValid,
      components: this.components,
      region: this.getRegion(),
      kind: this.getKind(),
      stations: this.getStations(),
      metro: this.getMetro(),
      priceRange: this.getPriceRange(),
      sections: this.getSections(),
      roomFilters: this.getRoomFilters(),
      floorRange: this.getFloorRange(),
      groupHash: this.getGroupHash()
    };
  }

  /**
   * Convert to string
   * @returns {string} Query ID string
   */
  toString() {
    return this.id;
  }

  /**
   * Create QueryId from SearchUrl
   * @param {SearchUrl|string} searchUrl - SearchUrl object or URL string
   * @returns {QueryId} QueryId object
   */
  static fromSearchUrl(searchUrl) {
    const url = searchUrl instanceof SearchUrl ? searchUrl : new SearchUrl(searchUrl);
    const queryId = url.getQueryId();
    return new QueryId(queryId);
  }

  /**
   * Create QueryId from string
   * @param {string} queryId - Query ID string
   * @returns {QueryId} QueryId object
   */
  static fromString(queryId) {
    return new QueryId(queryId);
  }

  /**
   * Validate query ID string
   * @param {string} queryId - Query ID to validate
   * @returns {boolean} True if valid
   */
  static isValid(queryId) {
    return new QueryId(queryId).isValid;
  }

  /**
   * Generate query ID from URL string
   * @param {string} url - URL string
   * @returns {string|null} Query ID or null if invalid
   */
  static generateFromUrl(url) {
    const searchUrl = new SearchUrl(url);
    return searchUrl.getQueryId();
  }

  /**
   * Generate description from URL string
   * @param {string} url - URL string
   * @returns {string} Human-readable description
   */
  static generateDescriptionFromUrl(url) {
    const searchUrl = new SearchUrl(url);
    return searchUrl.getQueryDescription();
  }
}

module.exports = QueryId;