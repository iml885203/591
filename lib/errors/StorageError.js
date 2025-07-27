/**
 * Storage Error Class
 * For database and storage-related failures
 */

const CrawlerError = require('./CrawlerError');

class StorageError extends CrawlerError {
  constructor(message, operation = null, details = {}) {
    super(message, 'STORAGE_ERROR', {
      operation,
      ...details
    });
    this.operation = operation;
  }

  /**
   * Create storage error for database connection failure
   * @param {string} reason - Connection failure reason
   * @returns {StorageError}
   */
  static connectionFailed(reason) {
    return new StorageError(
      `Database connection failed: ${reason}`,
      'connect'
    );
  }

  /**
   * Create storage error for query failure
   * @param {string} query - Failed query description
   * @param {Error} originalError - Original error from database
   * @returns {StorageError}
   */
  static queryFailed(query, originalError) {
    return new StorageError(
      `Database query failed: ${query}`,
      'query',
      {
        originalError: originalError.message,
        originalStack: originalError.stack
      }
    );
  }

  /**
   * Create storage error for migration failure
   * @param {string} reason - Migration failure reason
   * @returns {StorageError}
   */
  static migrationFailed(reason) {
    return new StorageError(
      `Database migration failed: ${reason}`,
      'migrate'
    );
  }
}

module.exports = StorageError;