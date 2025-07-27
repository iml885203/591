/**
 * Network Error Class
 * For HTTP and network-related failures
 */

const CrawlerError = require('./CrawlerError');

class NetworkError extends CrawlerError {
  constructor(message, statusCode = null, url = null) {
    super(message, 'NETWORK_ERROR', {
      statusCode,
      url
    });
    this.statusCode = statusCode;
    this.url = url;
  }

  /**
   * Create network error for HTTP status codes
   * @param {number} statusCode - HTTP status code
   * @param {string} url - Request URL
   * @returns {NetworkError}
   */
  static httpError(statusCode, url) {
    return new NetworkError(
      `HTTP ${statusCode} error for URL: ${url}`,
      statusCode,
      url
    );
  }

  /**
   * Create network error for timeout
   * @param {string} url - Request URL
   * @param {number} timeout - Timeout duration in ms
   * @returns {NetworkError}
   */
  static timeout(url, timeout) {
    return new NetworkError(
      `Request timeout after ${timeout}ms for URL: ${url}`,
      408,
      url
    );
  }

  /**
   * Create network error for connection failure
   * @param {string} url - Request URL
   * @param {string} reason - Connection failure reason
   * @returns {NetworkError}
   */
  static connectionFailed(url, reason) {
    return new NetworkError(
      `Connection failed for URL: ${url} - ${reason}`,
      null,
      url
    );
  }
}

module.exports = NetworkError;