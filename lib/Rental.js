/**
 * Rental Domain Model
 * Represents a rental property from 591.com.tw with business logic
 */

const Distance = require('./domain/Distance');
const PropertyId = require('./domain/PropertyId');

class Rental {
  constructor(data) {
    this.title = data.title;
    this.link = data.link;
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
   * @returns {number|null} Distance in meters or null if not available
   */
  getDistanceToMRT() {
    const distance = Distance.fromMetroValue(this.metroValue);
    return distance ? distance.toMeters() : null;
  }

  /**
   * Get all metro distances
   * @returns {Array<Object>} Array of metro distance objects
   */
  getAllMetroDistances() {
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
   * @returns {number|null} Minimum distance in meters
   */
  getMinDistanceToMRT() {
    const allDistances = this.getAllMetroDistances()
      .map(d => d.distance)
      .filter(d => d !== null && d !== undefined);
    
    if (allDistances.length === 0) return null;
    return Math.min(...allDistances);
  }

  /**
   * Add metro distance information
   * @param {string} stationId - Station ID
   * @param {string} stationName - Station name
   * @param {string} metroValue - Metro value string from 591
   */
  addMetroDistance(stationId, stationName, metroValue) {
    const distance = Distance.fromMetroValue(metroValue);
    const distanceInfo = {
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
   * @param {number|null} distanceThreshold - Threshold in meters (null = no filtering)
   * @param {boolean} useMinDistance - Use minimum distance from all stations (default: true)
   * @returns {boolean} True if rental is far from MRT
   */
  isFarFromMRT(distanceThreshold, useMinDistance = true) {
    if (!distanceThreshold) return false;
    
    const distance = useMinDistance ? 
      this.getMinDistanceToMRT() : 
      this.getDistanceToMRT();
    
    return distance && distance > distanceThreshold;
  }

  /**
   * Get unique identifier for this rental
   * @returns {string} Rental ID
   */
  getId() {
    const propertyId = PropertyId.fromProperty(this);
    return propertyId.toString();
  }

  /**
   * Check if rental should be sent as silent notification
   * @param {string} notifyMode - Notification mode
   * @param {string} filteredMode - Filtered sub-mode
   * @param {number|null} distanceThreshold - Distance threshold
   * @returns {boolean} True if should be silent
   */
  shouldBeSilentNotification(notifyMode, filteredMode, distanceThreshold) {
    return notifyMode === 'filtered' && 
           this.isFarFromMRT(distanceThreshold) && 
           filteredMode === 'silent';
  }

  /**
   * Determine notification color based on MRT distance
   * @param {number|null} distanceThreshold - Distance threshold
   * @returns {number} Discord embed color (hex)
   */
  getNotificationColor(distanceThreshold) {
    return this.isFarFromMRT(distanceThreshold) ? 0xffa500 : 0x00ff00; // Orange or Green
  }

  /**
   * Convert to plain object (for JSON serialization)
   * @returns {Object} Plain object representation
   */
  toJSON() {
    return {
      title: this.title,
      link: this.link,
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
   * @param {Rental} otherRental - Another rental with possibly different metro info
   */
  mergeMetroDistances(otherRental) {
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
   * @param {Object} data - Plain object data
   * @returns {Rental} New instance
   */
  static fromJSON(data) {
    return new Rental(data);
  }
}

module.exports = Rental;