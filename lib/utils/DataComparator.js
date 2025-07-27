/**
 * Data comparison utility for detecting dirty data
 * Avoids unnecessary database writes when data hasn't changed
 */

class DataComparator {
  /**
   * Check if rental data has changed and needs database update
   * @param {Object} newData - New rental data from crawler
   * @param {Object} existingData - Existing rental data from database
   * @returns {Object} { hasChanged: boolean, changedFields: string[], hash: string }
   */
  static compareRentalData(newData, existingData) {
    if (!existingData) {
      return { 
        hasChanged: true, 
        changedFields: ['new_record'], 
        hash: this.generateDataHash(newData) 
      };
    }

    const changedFields = [];
    
    // Core fields that matter for dirty data detection
    const fieldsToCompare = [
      'title',
      'houseType', 
      'rooms',
      'metroTitle',
      'metroValue'
    ];

    for (const field of fieldsToCompare) {
      const newValue = this.normalizeValue(newData[field]);
      const existingValue = this.normalizeValue(existingData[field]);
      
      if (field === 'title') {
        // For title, use similarity check to avoid minor formatting changes
        if (!this.titlesAreSimilar(newValue, existingValue)) {
          changedFields.push(field);
        }
      } else if (newValue !== existingValue) {
        changedFields.push(field);
      }
    }

    // Compare arrays (tags only, imgUrls completely ignored)
    if (this.arraysAreDifferent(newData.tags, existingData.tags)) {
      changedFields.push('tags');
    }
    
    // imgUrls completely ignored for dirty data detection

    return {
      hasChanged: changedFields.length > 0,
      changedFields,
      hash: this.generateDataHash(newData)
    };
  }

  /**
   * Generate a hash for rental data to enable quick comparison
   * @param {Object} rentalData - Rental data
   * @returns {string} MD5 hash of relevant data
   */
  static generateDataHash(rentalData) {
    const crypto = require('crypto');
    
    // Normalize arrays for hashing
    const normalizeTags = (tags) => {
      if (Array.isArray(tags)) {
        return tags.sort().join(',');
      } else if (typeof tags === 'string') {
        return tags ? tags.split(',').sort().join(',') : '';
      }
      return '';
    };

    const normalizeImgUrls = (imgUrls) => {
      // For hash generation, we want to normalize imgUrls to reduce sensitivity
      // Only include the first 10 URLs sorted to create a stable hash
      let urls = [];
      if (Array.isArray(imgUrls)) {
        urls = imgUrls.filter(url => url && url.trim());
      } else if (typeof imgUrls === 'string') {
        urls = imgUrls ? imgUrls.split(',').map(url => url.trim()).filter(url => url) : [];
      }
      
      // Sort and take first 10 to reduce hash sensitivity to minor reordering
      return urls.sort().slice(0, 10).join(',');
    };
    
    // Create normalized data object for hashing
    // NOTE: imgUrls are excluded from hash to avoid frequent updates due to image reordering
    const hashData = {
      title: this.normalizeValue(rentalData.title),
      houseType: this.normalizeValue(rentalData.houseType),
      rooms: this.normalizeValue(rentalData.rooms),
      metroTitle: this.normalizeValue(rentalData.metroTitle),
      metroValue: this.normalizeValue(rentalData.metroValue),
      tags: normalizeTags(rentalData.tags)
      // imgUrls: intentionally excluded from hash
    };
    
    const hashString = JSON.stringify(hashData);
    return crypto.createHash('md5').update(hashString).digest('hex');
  }

  /**
   * Normalize values for comparison (handle null, undefined, empty strings)
   * @param {any} value - Value to normalize
   * @returns {string} Normalized value
   */
  static normalizeValue(value) {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    
    // More aggressive normalization for title fields
    return String(value)
      .trim()
      .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
      .replace(/[""'']/g, '"')        // Normalize quotes
      .replace(/[—–-]/g, '-')         // Normalize dashes
      .toLowerCase();                 // Case insensitive comparison
  }

  /**
   * Check if two titles are similar enough to be considered the same
   * @param {string} title1 - First title (normalized)
   * @param {string} title2 - Second title (normalized)
   * @returns {boolean} True if titles are similar
   */
  static titlesAreSimilar(title1, title2) {
    if (title1 === title2) return true;
    if (!title1 || !title2) return false;
    
    // Simple character-based similarity for Chinese text
    const len1 = title1.length;
    const len2 = title2.length;
    
    // If length difference is too large, probably different
    if (Math.abs(len1 - len2) > Math.max(len1, len2) * 0.3) {
      return false;
    }
    
    // Calculate edit distance (simplified)
    const shorter = len1 < len2 ? title1 : title2;
    const longer = len1 >= len2 ? title1 : title2;
    
    // Count matching characters
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) {
        matches++;
      }
    }
    
    // If more than 78% characters match, consider similar
    const similarity = matches / Math.max(len1, len2);
    return similarity >= 0.78;
  }

  /**
   * Compare two arrays for differences
   * @param {Array} arr1 - First array
   * @param {Array|string} arr2 - Second array or comma-separated string
   * @returns {boolean} True if arrays are different
   */
  static arraysAreDifferent(arr1, arr2) {
    // Normalize arr1 to array
    const normalized1 = Array.isArray(arr1) ? arr1 : (arr1 ? arr1.split(',') : []);
    
    // Normalize arr2 to array (handle both array and comma-separated string)
    let normalized2;
    if (Array.isArray(arr2)) {
      normalized2 = arr2;
    } else if (typeof arr2 === 'string') {
      normalized2 = arr2 ? arr2.split(',') : [];
    } else {
      normalized2 = [];
    }
    
    const norm1 = normalized1.sort().join(',');
    const norm2 = normalized2.sort().join(',');
    return norm1 !== norm2;
  }

  /**
   * Check if imgUrls have significantly changed
   * Uses a more lenient comparison to avoid frequent updates due to minor reordering
   * @param {Array|string} newUrls - New image URLs
   * @param {Array|string} existingUrls - Existing image URLs
   * @returns {boolean} True if URLs have significantly changed
   */
  static imgUrlsSignificantlyChanged(newUrls, existingUrls) {
    // Normalize to arrays
    const normalizeUrls = (urls) => {
      if (Array.isArray(urls)) {
        return urls.filter(url => url && url.trim()); // Remove empty URLs
      } else if (typeof urls === 'string') {
        return urls ? urls.split(',').map(url => url.trim()).filter(url => url) : [];
      }
      return [];
    };

    const newUrlsArray = normalizeUrls(newUrls);
    const existingUrlsArray = normalizeUrls(existingUrls);

    // If both are empty, no change
    if (newUrlsArray.length === 0 && existingUrlsArray.length === 0) {
      return false;
    }

    // If one is empty and the other isn't, that's a significant change
    if (newUrlsArray.length === 0 || existingUrlsArray.length === 0) {
      return true;
    }

    // Check for significant changes in count (more than 20% difference)
    const countDiff = Math.abs(newUrlsArray.length - existingUrlsArray.length);
    const maxCount = Math.max(newUrlsArray.length, existingUrlsArray.length);
    const countChangePercent = (countDiff / maxCount) * 100;
    
    if (countChangePercent > 20) {
      return true; // More than 20% change in image count
    }

    // Check content overlap - if less than 70% overlap, consider it a significant change
    const newUrlSet = new Set(newUrlsArray);
    const existingUrlSet = new Set(existingUrlsArray);
    
    const intersection = new Set([...newUrlSet].filter(url => existingUrlSet.has(url)));
    const union = new Set([...newUrlSet, ...existingUrlSet]);
    
    const overlapPercent = (intersection.size / union.size) * 100;
    
    return overlapPercent < 70; // Less than 70% overlap is significant change
  }

  /**
   * Check if metro distances have changed
   * @param {Array} newDistances - New metro distances
   * @param {Array} existingDistances - Existing metro distances
   * @returns {boolean} True if distances have changed
   */
  static metroDistancesChanged(newDistances, existingDistances) {
    if (!newDistances && !existingDistances) return false;
    if (!newDistances || !existingDistances) return true;
    
    if (newDistances.length !== existingDistances.length) return true;
    
    // Convert to comparable format
    const normalize = (distances) => {
      return distances.map(d => ({
        stationId: d.stationId || '',
        stationName: d.stationName || '',
        distance: d.distance || 0,
        metroValue: d.metroValue || ''
      })).sort((a, b) => a.stationName.localeCompare(b.stationName));
    };
    
    const norm1 = normalize(newDistances);
    const norm2 = normalize(existingDistances);
    
    return JSON.stringify(norm1) !== JSON.stringify(norm2);
  }

  /**
   * Generate summary of what changed for logging
   * @param {Array} changedFields - List of changed field names
   * @returns {string} Human readable summary
   */
  static getChangesSummary(changedFields) {
    if (changedFields.length === 0) return 'No changes';
    if (changedFields.includes('new_record')) return 'New record';
    return `Changed: ${changedFields.join(', ')}`;
  }
}

module.exports = DataComparator;