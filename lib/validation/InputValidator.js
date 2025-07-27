/**
 * Input Validation Layer
 * Provides centralized input validation and sanitization
 */

const { ValidationError } = require('../errors');

class InputValidator {
  /**
   * Validate URL format and domain
   * @param {string} url - URL to validate
   * @param {Array<string>} allowedDomains - Optional list of allowed domains
   * @returns {string} Sanitized URL
   * @throws {ValidationError} If URL is invalid
   */
  static validateUrl(url, allowedDomains = []) {
    if (!url || typeof url !== 'string') {
      throw ValidationError.invalidValue('url', url, 'non-empty string');
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      throw ValidationError.invalidUrl('empty URL after trimming');
    }

    // Basic URL format validation
    try {
      const urlObj = new URL(trimmedUrl);
      
      // Check allowed domains if specified
      if (allowedDomains.length > 0) {
        const isAllowed = allowedDomains.some(domain => 
          urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
        );
        
        if (!isAllowed) {
          throw ValidationError.invalidUrl(`Domain ${urlObj.hostname} not in allowed list: ${allowedDomains.join(', ')}`);
        }
      }

      return trimmedUrl;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw ValidationError.invalidUrl(trimmedUrl);
    }
  }

  /**
   * Validate positive integer
   * @param {*} value - Value to validate
   * @param {string} fieldName - Field name for error messages
   * @param {number} min - Minimum value (default: 1)
   * @param {number} max - Maximum value (optional)
   * @returns {number} Validated integer
   * @throws {ValidationError} If value is invalid
   */
  static validatePositiveInteger(value, fieldName, min = 1, max = null) {
    if (value === null || value === undefined) {
      throw ValidationError.missingField(fieldName);
    }

    const num = Number(value);
    if (!Number.isInteger(num) || num < min) {
      throw ValidationError.invalidValue(fieldName, value, `integer >= ${min}`);
    }

    if (max !== null && num > max) {
      throw ValidationError.invalidValue(fieldName, value, `integer <= ${max}`);
    }

    return num;
  }

  /**
   * Validate string with length constraints
   * @param {*} value - Value to validate
   * @param {string} fieldName - Field name for error messages
   * @param {number} minLength - Minimum length (default: 1)
   * @param {number} maxLength - Maximum length (optional)
   * @returns {string} Validated and trimmed string
   * @throws {ValidationError} If value is invalid
   */
  static validateString(value, fieldName, minLength = 1, maxLength = null) {
    if (value === null || value === undefined) {
      throw ValidationError.missingField(fieldName);
    }

    if (typeof value !== 'string') {
      throw ValidationError.invalidValue(fieldName, value, 'string');
    }

    const trimmed = value.trim();
    if (trimmed.length < minLength) {
      throw ValidationError.invalidValue(fieldName, value, `string with length >= ${minLength}`);
    }

    if (maxLength !== null && trimmed.length > maxLength) {
      throw ValidationError.invalidValue(fieldName, value, `string with length <= ${maxLength}`);
    }

    return trimmed;
  }

  /**
   * Validate enum value
   * @param {*} value - Value to validate
   * @param {string} fieldName - Field name for error messages
   * @param {Array} allowedValues - Array of allowed values
   * @returns {*} Validated value
   * @throws {ValidationError} If value is not in allowed list
   */
  static validateEnum(value, fieldName, allowedValues) {
    if (!allowedValues.includes(value)) {
      throw ValidationError.invalidValue(
        fieldName, 
        value, 
        `one of: ${allowedValues.join(', ')}`
      );
    }
    return value;
  }

  /**
   * Validate object with required fields
   * @param {*} obj - Object to validate
   * @param {Array<string>} requiredFields - Array of required field names
   * @param {string} objectName - Object name for error messages
   * @returns {Object} Validated object
   * @throws {ValidationError} If object is invalid or missing fields
   */
  static validateObject(obj, requiredFields, objectName = 'object') {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      throw ValidationError.invalidValue(objectName, obj, 'object');
    }

    for (const field of requiredFields) {
      if (!(field in obj)) {
        throw ValidationError.missingField(`${objectName}.${field}`);
      }
    }

    return obj;
  }

  /**
   * Sanitize HTML string to prevent XSS
   * @param {string} html - HTML string to sanitize
   * @returns {string} Sanitized HTML
   */
  static sanitizeHtml(html) {
    if (typeof html !== 'string') {
      return '';
    }

    // Basic HTML sanitization - remove script tags and event handlers
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\s*on\w+="[^"]*"/gi, '')
      .replace(/\s*on\w+='[^']*'/gi, '')
      .replace(/\s*javascript:[^"']*/gi, '');
  }
}

module.exports = InputValidator;