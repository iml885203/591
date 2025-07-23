/**
 * Rental Domain Model
 * Represents a rental property from 591.com.tw with business logic
 */

const { extractDistanceInMeters } = require('./utils');

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
  }

  /**
   * Get distance to MRT in meters
   * @returns {number|null} Distance in meters or null if not available
   */
  getDistanceToMRT() {
    return extractDistanceInMeters(this.metroValue);
  }

  /**
   * Check if this rental is far from MRT
   * @param {number|null} distanceThreshold - Threshold in meters (null = no filtering)
   * @returns {boolean} True if rental is far from MRT
   */
  isFarFromMRT(distanceThreshold) {
    if (!distanceThreshold) return false;
    const distance = this.getDistanceToMRT();
    return distance && distance > distanceThreshold;
  }

  /**
   * Get unique identifier for this rental
   * @returns {string} Rental ID
   */
  getId() {
    const { getPropertyId } = require('./utils');
    return getPropertyId(this);
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
      notification: this.notification
    };
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