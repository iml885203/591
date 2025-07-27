/**
 * Crawl Options Validator
 * Validates crawl-specific options and parameters
 */

const InputValidator = require('./InputValidator');
const { ValidationError } = require('../errors');

class CrawlOptionsValidator {
  /**
   * Validate basic crawl options
   * @param {Object} options - Crawl options to validate
   * @returns {Object} Validated and sanitized options
   * @throws {ValidationError} If options are invalid
   */
  static validateCrawlOptions(options = {}) {
    const validated = {};

    // Validate URL (required)
    if (options.url) {
      validated.url = InputValidator.validateUrl(options.url, ['rent.591.com.tw']);
    }

    // Validate maxLatest (optional)
    if (options.maxLatest !== undefined && options.maxLatest !== null) {
      validated.maxLatest = InputValidator.validatePositiveInteger(
        options.maxLatest, 
        'maxLatest', 
        1, 
        100
      );
    }

    // Validate notifyMode (optional)
    if (options.notifyMode !== undefined) {
      validated.notifyMode = InputValidator.validateEnum(
        options.notifyMode,
        'notifyMode',
        ['all', 'filtered', 'none']
      );
    } else {
      validated.notifyMode = 'filtered'; // default
    }

    // Validate filteredMode (optional)
    if (options.filteredMode !== undefined) {
      validated.filteredMode = InputValidator.validateEnum(
        options.filteredMode,
        'filteredMode',
        ['normal', 'silent', 'none']
      );
    } else {
      validated.filteredMode = 'silent'; // default
    }

    return validated;
  }

  /**
   * Validate multi-station crawl options
   * @param {Object} multiStationOptions - Multi-station options to validate
   * @returns {Object} Validated multi-station options
   * @throws {ValidationError} If options are invalid
   */
  static validateMultiStationOptions(multiStationOptions = {}) {
    const validated = {};

    // Validate maxConcurrent (optional)
    if (multiStationOptions.maxConcurrent !== undefined) {
      validated.maxConcurrent = InputValidator.validatePositiveInteger(
        multiStationOptions.maxConcurrent,
        'maxConcurrent',
        1,
        10
      );
    } else {
      validated.maxConcurrent = 3; // default
    }

    // Validate delayBetweenRequests (optional)
    if (multiStationOptions.delayBetweenRequests !== undefined) {
      validated.delayBetweenRequests = InputValidator.validatePositiveInteger(
        multiStationOptions.delayBetweenRequests,
        'delayBetweenRequests',
        100,
        10000
      );
    } else {
      validated.delayBetweenRequests = 1500; // default
    }

    // Validate enableMerging (optional)
    if (multiStationOptions.enableMerging !== undefined) {
      if (typeof multiStationOptions.enableMerging !== 'boolean') {
        throw ValidationError.invalidValue(
          'enableMerging',
          multiStationOptions.enableMerging,
          'boolean'
        );
      }
      validated.enableMerging = multiStationOptions.enableMerging;
    } else {
      validated.enableMerging = true; // default
    }

    // Validate showStationInfo (optional)
    if (multiStationOptions.showStationInfo !== undefined) {
      if (typeof multiStationOptions.showStationInfo !== 'boolean') {
        throw ValidationError.invalidValue(
          'showStationInfo',
          multiStationOptions.showStationInfo,
          'boolean'
        );
      }
      validated.showStationInfo = multiStationOptions.showStationInfo;
    } else {
      validated.showStationInfo = true; // default
    }

    return validated;
  }

  /**
   * Validate filter options
   * @param {Object} filter - Filter options to validate
   * @returns {Object} Validated filter options
   * @throws {ValidationError} If filter options are invalid
   */
  static validateFilterOptions(filter = {}) {
    const validated = {};

    // Validate mrtDistanceThreshold (optional)
    if (filter.mrtDistanceThreshold !== undefined) {
      validated.mrtDistanceThreshold = InputValidator.validatePositiveInteger(
        filter.mrtDistanceThreshold,
        'mrtDistanceThreshold',
        1,
        5000
      );
    }

    // Validate minPrice (optional)
    if (filter.minPrice !== undefined) {
      validated.minPrice = InputValidator.validatePositiveInteger(
        filter.minPrice,
        'minPrice',
        0,
        1000000
      );
    }

    // Validate maxPrice (optional)
    if (filter.maxPrice !== undefined) {
      validated.maxPrice = InputValidator.validatePositiveInteger(
        filter.maxPrice,
        'maxPrice',
        0,
        1000000
      );
    }

    // Validate price range consistency
    if (validated.minPrice !== undefined && validated.maxPrice !== undefined) {
      if (validated.minPrice > validated.maxPrice) {
        throw ValidationError.invalidValue(
          'priceRange',
          `${validated.minPrice}-${validated.maxPrice}`,
          'minPrice <= maxPrice'
        );
      }
    }

    return validated;
  }
}

module.exports = CrawlOptionsValidator;