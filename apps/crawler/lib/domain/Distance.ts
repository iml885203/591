/**
 * Distance Domain Model
 * Handles distance calculations and conversions for metro proximity
 */

type DistanceUnit = 'meters' | 'kilometers' | 'minutes';

interface DistanceData {
  value: number;
  unit: DistanceUnit;
  meters: number | null;
}

class Distance {
  public readonly value: number;
  public readonly unit: DistanceUnit;

  constructor(value: number, unit: DistanceUnit = 'meters') {
    this.value = value;
    this.unit = unit;
  }

  /**
   * Parse metro distance string from 591.com.tw
   * @param metroValue - Metro distance value from 591.com.tw
   * @returns Distance object or null if not parseable
   */
  static fromMetroValue(metroValue: string | null | undefined): Distance | null {
    if (!metroValue || typeof metroValue !== 'string') return null;
    
    const meterMatch = metroValue.match(/(\d+)\s*公尺/);
    if (meterMatch) {
      return new Distance(parseInt(meterMatch[1]), 'meters');
    }
    
    // Convert minutes to approximate meters (assuming 80m/min walking speed)
    const minuteMatch = metroValue.match(/(\d+)\s*分鐘/);
    if (minuteMatch) {
      const meters = parseInt(minuteMatch[1]) * 80;
      return new Distance(meters, 'meters');
    }
    
    return null;
  }

  /**
   * Get distance in meters
   * @returns Distance in meters
   */
  toMeters(): number | null {
    if (this.value === null || this.value === undefined) return null;
    
    switch (this.unit) {
      case 'meters':
        return this.value;
      case 'kilometers':
        return this.value * 1000;
      case 'minutes':
        return this.value * 80; // Assuming 80m/min walking speed
      default:
        return this.value;
    }
  }

  /**
   * Check if distance is beyond threshold
   * @param threshold - Threshold in meters
   * @returns True if distance exceeds threshold
   */
  exceedsThreshold(threshold: number | null | undefined): boolean {
    if (!threshold || threshold <= 0) return false;
    const meters = this.toMeters();
    return meters !== null && meters > threshold;
  }

  /**
   * Compare with another distance
   * @param other - Another distance object
   * @returns -1 if smaller, 0 if equal, 1 if larger
   */
  compareTo(other: Distance): number {
    if (!(other instanceof Distance)) return 0;
    
    const thisMeters = this.toMeters();
    const otherMeters = other.toMeters();
    
    if (thisMeters === null && otherMeters === null) return 0;
    if (thisMeters === null) return 1;
    if (otherMeters === null) return -1;
    
    if (thisMeters < otherMeters) return -1;
    if (thisMeters > otherMeters) return 1;
    return 0;
  }

  /**
   * Get the minimum distance from an array of distances
   * @param distances - Array of distance objects
   * @returns Minimum distance or null if array is empty
   */
  static getMinimum(distances: Distance[]): Distance | null {
    if (!Array.isArray(distances) || distances.length === 0) return null;
    
    const validDistances = distances.filter(d => d instanceof Distance && d.toMeters() !== null);
    if (validDistances.length === 0) return null;
    
    return validDistances.reduce((min, current) => 
      current.compareTo(min) < 0 ? current : min
    );
  }

  /**
   * Format distance for display
   * @returns Formatted distance string
   */
  toString(): string {
    const meters = this.toMeters();
    if (meters === null) return 'Unknown';
    
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)}km`;
    }
    return `${meters}m`;
  }

  /**
   * Create Distance from meters
   * @param meters - Distance in meters
   * @returns Distance object
   */
  static fromMeters(meters: number): Distance {
    return new Distance(meters, 'meters');
  }

  /**
   * Convert to plain object for serialization
   * @returns Plain object representation
   */
  toJSON(): DistanceData {
    return {
      value: this.value,
      unit: this.unit,
      meters: this.toMeters()
    };
  }

  /**
   * Create Distance from plain object
   * @param data - Plain object data
   * @returns Distance object
   */
  static fromJSON(data: DistanceData): Distance {
    return new Distance(data.value, data.unit);
  }
}

export default Distance;
export { Distance, DistanceUnit, DistanceData };