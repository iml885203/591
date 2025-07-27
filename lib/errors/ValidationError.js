/**
 * Validation Error Class
 * For input validation failures
 */

const CrawlerError = require('./CrawlerError');

class ValidationError extends CrawlerError {
  constructor(message, field = null, value = null) {
    super(message, 'VALIDATION_ERROR', {
      field,
      value: typeof value === 'string' ? value : JSON.stringify(value)
    });
  }

  /**
   * Create validation error for invalid URL
   * @param {string} url - Invalid URL
   * @returns {ValidationError}
   */
  static invalidUrl(url) {
    return new ValidationError(
      `Invalid URL format: ${url}`,
      'url',
      url
    );
  }

  /**
   * Create validation error for missing required field
   * @param {string} field - Missing field name
   * @returns {ValidationError}
   */
  static missingField(field) {
    return new ValidationError(
      `Missing required field: ${field}`,
      field,
      null
    );
  }

  /**
   * Create validation error for invalid field value
   * @param {string} field - Field name
   * @param {*} value - Invalid value
   * @param {string} expected - Expected format/type
   * @returns {ValidationError}
   */
  static invalidValue(field, value, expected) {
    return new ValidationError(
      `Invalid value for ${field}: expected ${expected}, got ${typeof value}`,
      field,
      value
    );
  }
}

module.exports = ValidationError;