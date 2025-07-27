/**
 * Error Classes Export
 * Centralized export for all custom error classes
 */

const CrawlerError = require('./CrawlerError');
const ValidationError = require('./ValidationError');
const NetworkError = require('./NetworkError');
const StorageError = require('./StorageError');

module.exports = {
  CrawlerError,
  ValidationError,
  NetworkError,
  StorageError
};