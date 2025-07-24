/**
 * PropertyId Domain Model
 * Handles unique identification of rental properties from 591.com.tw
 */

class PropertyId {
  constructor(id, source = 'unknown') {
    this.id = id;
    this.source = source; // 'url', 'title-metro', or 'custom'
  }

  /**
   * Generate PropertyId from rental property object
   * @param {Object} property - Rental property object
   * @returns {PropertyId} PropertyId object
   */
  static fromProperty(property) {
    if (!property) {
      throw new Error('Property object is required');
    }

    // Primary: Use link as unique identifier
    if (property.link) {
      const match = property.link.match(/\/(\d+)/);
      if (match) {
        return new PropertyId(match[1], 'url');
      }
    }

    // Fallback: Create composite key from title + metro
    if (property.title && property.metroValue) {
      const compositeId = `${property.title}-${property.metroValue}`.replace(/\s+/g, '-');
      return new PropertyId(compositeId, 'title-metro');
    }

    // Last resort: Use title only
    if (property.title) {
      const titleId = property.title.replace(/\s+/g, '-');
      return new PropertyId(titleId, 'title');
    }

    throw new Error('Unable to generate PropertyId: property must have at least a link or title');
  }

  /**
   * Generate PropertyId from URL
   * @param {string} url - Property URL
   * @returns {PropertyId|null} PropertyId object or null if not extractable
   */
  static fromUrl(url) {
    if (!url || typeof url !== 'string') return null;
    
    const match = url.match(/\/(\d+)/);
    if (match) {
      return new PropertyId(match[1], 'url');
    }
    
    return null;
  }

  /**
   * Create PropertyId from string
   * @param {string} id - ID string
   * @param {string} source - Source of the ID
   * @returns {PropertyId} PropertyId object
   */
  static fromString(id, source = 'custom') {
    return new PropertyId(id, source);
  }

  /**
   * Check if this PropertyId is URL-based (most reliable)
   * @returns {boolean} True if ID is extracted from URL
   */
  isUrlBased() {
    return this.source === 'url';
  }

  /**
   * Check if this PropertyId is composite (title + metro)
   * @returns {boolean} True if ID is composite
   */
  isComposite() {
    return this.source === 'title-metro';
  }

  /**
   * Check if this PropertyId is reliable for duplicate detection
   * URL-based IDs are most reliable, followed by composite IDs
   * @returns {boolean} True if ID is reliable
   */
  isReliable() {
    return this.source === 'url' || this.source === 'title-metro';
  }

  /**
   * Get reliability score (higher is more reliable)
   * @returns {number} Reliability score (0-100)
   */
  getReliabilityScore() {
    switch (this.source) {
      case 'url':
        return 100;
      case 'title-metro':
        return 80;
      case 'title':
        return 50;
      case 'custom':
        return 30;
      default:
        return 0;
    }
  }

  /**
   * Compare with another PropertyId
   * @param {PropertyId} other - Another PropertyId
   * @returns {boolean} True if IDs are equal
   */
  equals(other) {
    if (!(other instanceof PropertyId)) return false;
    return this.id === other.id;
  }

  /**
   * Get hash code for this PropertyId (useful for Sets/Maps)
   * @returns {string} Hash code
   */
  hashCode() {
    return this.id;
  }

  /**
   * Validate if a property object can generate a reliable PropertyId
   * @param {Object} property - Property object to validate
   * @returns {boolean} True if property can generate reliable ID
   */
  static canGenerateReliableId(property) {
    if (!property) return false;
    
    // Check for URL-based ID
    if (property.link && property.link.match(/\/(\d+)/)) {
      return true;
    }
    
    // Check for composite ID
    if (property.title && property.metroValue) {
      return true;
    }
    
    return false;
  }

  /**
   * Create a Set of PropertyIds from an array of properties
   * @param {Object[]} properties - Array of property objects
   * @returns {Set<string>} Set of property ID strings
   */
  static createIdSet(properties) {
    if (!Array.isArray(properties)) return new Set();
    
    return new Set(
      properties
        .filter(prop => PropertyId.canGenerateReliableId(prop))
        .map(prop => PropertyId.fromProperty(prop).toString())
    );
  }

  /**
   * Convert to string representation
   * @returns {string} String representation of the ID
   */
  toString() {
    return this.id;
  }

  /**
   * Convert to plain object for serialization
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      id: this.id,
      source: this.source,
      isUrlBased: this.isUrlBased(),
      isReliable: this.isReliable(),
      reliabilityScore: this.getReliabilityScore()
    };
  }

  /**
   * Create PropertyId from plain object
   * @param {Object} data - Plain object data
   * @returns {PropertyId} PropertyId object
   */
  static fromJSON(data) {
    return new PropertyId(data.id, data.source);
  }
}

module.exports = PropertyId;