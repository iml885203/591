/**
 * PropertyId Domain Model
 * Handles unique identification of rental properties from 591.com.tw
 */

type PropertyIdSource = 'url' | 'title-metro' | 'title' | 'custom' | 'unknown';

interface PropertyData {
  id?: string;
  link?: string;
  title?: string;
  metroValue?: string;
}

interface PropertyIdData {
  id: string;
  source: PropertyIdSource;
  isUrlBased: boolean;
  isReliable: boolean;
  reliabilityScore: number;
}

class PropertyId {
  public readonly id: string;
  public readonly source: PropertyIdSource;

  constructor(id: string, source: PropertyIdSource = 'unknown') {
    this.id = id;
    this.source = source;
  }

  /**
   * Generate PropertyId from rental property object
   * @param property - Rental property object
   * @returns PropertyId object
   */
  static fromProperty(property: PropertyData): PropertyId {
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
   * @param url - Property URL
   * @returns PropertyId object or null if not extractable
   */
  static fromUrl(url: string | null | undefined): PropertyId | null {
    if (!url || typeof url !== 'string') return null;
    
    const match = url.match(/\/(\d+)/);
    if (match) {
      return new PropertyId(match[1], 'url');
    }
    
    return null;
  }

  /**
   * Create PropertyId from string
   * @param id - ID string
   * @param source - Source of the ID
   * @returns PropertyId object
   */
  static fromString(id: string, source: PropertyIdSource = 'custom'): PropertyId {
    return new PropertyId(id, source);
  }

  /**
   * Check if this PropertyId is URL-based (most reliable)
   * @returns True if ID is extracted from URL
   */
  isUrlBased(): boolean {
    return this.source === 'url';
  }

  /**
   * Check if this PropertyId is composite (title + metro)
   * @returns True if ID is composite
   */
  isComposite(): boolean {
    return this.source === 'title-metro';
  }

  /**
   * Check if this PropertyId is reliable for duplicate detection
   * URL-based IDs are most reliable, followed by composite IDs
   * @returns True if ID is reliable
   */
  isReliable(): boolean {
    return this.source === 'url' || this.source === 'title-metro';
  }

  /**
   * Get reliability score (higher is more reliable)
   * @returns Reliability score (0-100)
   */
  getReliabilityScore(): number {
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
   * @param other - Another PropertyId
   * @returns True if IDs are equal
   */
  equals(other: PropertyId): boolean {
    if (!(other instanceof PropertyId)) return false;
    return this.id === other.id;
  }

  /**
   * Get hash code for this PropertyId (useful for Sets/Maps)
   * @returns Hash code
   */
  hashCode(): string {
    return this.id;
  }

  /**
   * Validate if a property object can generate a reliable PropertyId
   * @param property - Property object to validate
   * @returns True if property can generate reliable ID
   */
  static canGenerateReliableId(property: PropertyData | null | undefined): boolean {
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
   * @param properties - Array of property objects
   * @returns Set of property ID strings
   */
  static createIdSet(properties: PropertyData[]): Set<string> {
    if (!Array.isArray(properties)) return new Set();
    
    return new Set(
      properties
        .filter(prop => PropertyId.canGenerateReliableId(prop))
        .map(prop => PropertyId.fromProperty(prop).toString())
    );
  }

  /**
   * Convert to string representation
   * @returns String representation of the ID
   */
  toString(): string {
    return this.id;
  }

  /**
   * Convert to plain object for serialization
   * @returns Plain object representation
   */
  toJSON(): PropertyIdData {
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
   * @param data - Plain object data
   * @returns PropertyId object
   */
  static fromJSON(data: PropertyIdData): PropertyId {
    return new PropertyId(data.id, data.source);
  }
}

export default PropertyId;
export { PropertyId, PropertyIdSource, PropertyData, PropertyIdData };