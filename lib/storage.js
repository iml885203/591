/**
 * Data storage functions for persisting crawl results
 */

const path = require('path');
const { logWithTimestamp } = require('./utils');

/**
 * Load previous crawl data from file
 * @param {string} dataFile - Path to data file
 * @param {Object} fs - File system module (for dependency injection)
 * @returns {Promise<Object>} Previous data object
 */
const loadPreviousData = async (dataFile, fs) => {
  try {
    if (await fs.pathExists(dataFile)) {
      return await fs.readJson(dataFile);
    }
  } catch (error) {
    logWithTimestamp('No previous data found or error reading file', 'WARN');
  }
  return {};
};

/**
 * Save current crawl data to file
 * @param {string} dataFile - Path to data file
 * @param {Object} data - Data to save
 * @param {Object} fs - File system module (for dependency injection)
 * @returns {Promise<void>}
 */
const savePreviousData = async (dataFile, data, fs) => {
  try {
    await fs.writeJson(dataFile, data, { spaces: 2 });
  } catch (error) {
    logWithTimestamp(`Error saving data: ${error.message}`, 'ERROR');
  }
};

/**
 * Create default data file path
 * @param {string} baseDir - Base directory path
 * @returns {string} Full path to data file
 */
const getDataFilePath = (baseDir = __dirname) => {
  return path.join(baseDir, '..', 'previous_data.json');
};

module.exports = {
  loadPreviousData,
  savePreviousData,
  getDataFilePath
};