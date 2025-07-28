/**
 * Rental Domain Model
 * Represents a rental property from 591.com.tw with business logic
 */

import Distance from './domain/Distance.js';
import PropertyId from './domain/PropertyId.js';

interface MetroDistance {
  stationId: string | null;
  stationName: string;
  distance: number | null;
  metroValue: string;
}

interface NotificationData {
  isSilent?: boolean;
  distanceFromMRT?: number;
  [key: string]: any;
}

interface RentalConstructorData {
  title: string;
  link: string | null;
  houseType: string;
  rooms: string;
  metroTitle: string;
  metroValue: string;
  tags?: string[];
  imgUrls?: string[];
  notification?: NotificationData;
  metroDistances?: MetroDistance[];
}

class Rental {
  public readonly title: string;
  public readonly link: string | null;
  public readonly houseType: string;
  public readonly rooms: string;
  public readonly metroTitle: string;
  public readonly metroValue: string;
  public readonly tags: string[];
  public readonly imgUrls: string[];
  public readonly notification: NotificationData;
  public readonly metroDistances: MetroDistance[];

  constructor(data: RentalConstructorData) {
    this.title = data.title;
    this.link = data.link;
    this.houseType = data.houseType;
    this.rooms = data.rooms;
    this.metroTitle = data.metroTitle;
    this.metroValue = data.metroValue;
    this.tags = data.tags || [];
    this.imgUrls = data.imgUrls || [];
    this.notification = data.notification || {};
    // Support for multiple metro distances
    this.metroDistances = data.metroDistances || []; // Array of {stationId, stationName, distance, metroValue}
  }

  /**
   * Get distance to MRT in meters (primary distance)
   */
  getDistanceToMRT(): number | null {
    const distance = Distance.fromMetroValue(this.metroValue);
    return distance ? distance.toMeters() : null;
  }

  /**
   * Get all metro distances
   */
  getAllMetroDistances(): MetroDistance[] {
    const distances = [...this.metroDistances];
    
    // Include primary distance if not already in metroDistances
    if (this.metroValue && this.metroTitle) {
      const primaryExists = distances.some(d => 
        d.metroValue === this.metroValue && d.stationName === this.metroTitle
      );
      
      if (!primaryExists) {
        const distance = Distance.fromMetroValue(this.metroValue);
        distances.unshift({
          stationId: null,
          stationName: this.metroTitle,
          distance: distance ? distance.toMeters() : null,
          metroValue: this.metroValue
        });
      }
    }
    
    return distances;
  }

  /**
   * Get minimum distance to any MRT station
   */
  getMinDistanceToMRT(): number | null {
    const allDistances = this.getAllMetroDistances()
      .map(d => d.distance)
      .filter((d): d is number => d !== null && d !== undefined);
    
    if (allDistances.length === 0) return null;
    return Math.min(...allDistances);
  }

  /**
   * Add metro distance information
   */
  addMetroDistance(stationId: string, stationName: string, metroValue: string): void {
    const distance = Distance.fromMetroValue(metroValue);
    const distanceInfo: MetroDistance = {
      stationId,
      stationName,
      distance: distance ? distance.toMeters() : null,
      metroValue
    };
    
    // Avoid duplicates
    const exists = this.metroDistances.some(d => 
      d.stationId === stationId || 
      (d.stationName === stationName && d.metroValue === metroValue)
    );
    
    if (!exists) {
      this.metroDistances.push(distanceInfo);
    }
  }

  /**
   * Check if this rental is far from MRT
   */
  isFarFromMRT(distanceThreshold: number | null, useMinDistance: boolean = true): boolean {
    if (!distanceThreshold) return false;
    
    let distance: number | null = useMinDistance ? this.getMinDistanceToMRT() : null;
    
    // Fallback to primary distance if min distance is null
    if (distance === null) {
      distance = this.getDistanceToMRT();
    }
    
    return distance !== null && distance > distanceThreshold;
  }

  /**
   * Get unique identifier for this rental
   */
  getId(): string {
    const propertyId = PropertyId.fromProperty({
      title: this.title,
      link: this.link || undefined,
      metroTitle: this.metroTitle || undefined,
      houseType: this.houseType
    });
    return propertyId.toString();
  }

  /**
   * Check if rental should be sent as silent notification
   */
  shouldBeSilentNotification(
    notifyMode: string, 
    filteredMode: string, 
    distanceThreshold: number | null
  ): boolean {
    return notifyMode === 'filtered' && 
           this.isFarFromMRT(distanceThreshold) && 
           filteredMode === 'silent';
  }

  /**
   * Determine notification color based on MRT distance
   */
  getNotificationColor(distanceThreshold: number | null): number {
    return this.isFarFromMRT(distanceThreshold) ? 0xffa500 : 0x00ff00; // Orange or Green
  }

  /**
   * Convert to plain object (for JSON serialization)
   */
  toJSON(): RentalConstructorData {
    return {
      title: this.title,
      link: this.link,
      houseType: this.houseType,
      rooms: this.rooms,
      metroTitle: this.metroTitle,
      metroValue: this.metroValue,
      tags: this.tags,
      imgUrls: this.imgUrls,
      notification: this.notification,
      metroDistances: this.metroDistances
    };
  }

  /**
   * Merge metro distance information from another rental
   * Useful for combining data from different station queries
   */
  mergeMetroDistances(otherRental: Rental): void {
    if (!otherRental || !(otherRental instanceof Rental)) return;
    
    // Add metro distances from other rental
    otherRental.getAllMetroDistances().forEach(distanceInfo => {
      if (distanceInfo.stationId) {
        this.addMetroDistance(
          distanceInfo.stationId,
          distanceInfo.stationName,
          distanceInfo.metroValue
        );
      }
    });
  }

  /**
   * Create Rental from plain object
   */
  static fromJSON(data: RentalConstructorData): Rental {
    return new Rental(data);
  }
}

export default Rental;
export type { MetroDistance, NotificationData, RentalConstructorData };