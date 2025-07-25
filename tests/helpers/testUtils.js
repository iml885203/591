/**
 * General test utilities for Bun test environment
 */

import { createMockFunction } from './mockUtils.js';

/**
 * Creates a delayed promise for testing async operations
 * @param {number} ms - Delay in milliseconds
 * @param {*} value - Value to resolve with
 * @returns {Promise} Delayed promise
 */
export const delay = (ms, value) => {
  return new Promise(resolve => setTimeout(() => resolve(value), ms));
};

/**
 * Creates a mock rental object for testing
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock rental object
 */
export const createMockRental = (overrides = {}) => {
  return {
    id: '12345',
    title: 'Test Rental Property',
    price: 25000,
    address: '台北市信義區',
    url: 'https://rent.591.com.tw/rent-detail-12345.html',
    images: ['https://example.com/image1.jpg'],
    metro: '捷運信義安和站 5分鐘',
    area: '25坪',
    room: '2房1廳1衛',
    floor: '3樓/10樓',
    publishTime: '2025-01-01',
    features: ['電梯', '停車位'],
    ...overrides
  };
};

/**
 * Creates a mock crawl result for testing
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock crawl result
 */
export const createMockCrawlResult = (overrides = {}) => {
  return {
    rentals: [createMockRental()],
    summary: {
      totalProperties: 1,
      newProperties: 1,
      processedAt: new Date().toISOString()
    },
    ...overrides
  };
};

/**
 * Creates a mock HTTP response for testing
 * @param {Object} options - Response options
 * @returns {Object} Mock response
 */
export const createMockResponse = (options = {}) => {
  const {
    status = 200,
    data = {},
    headers = { 'content-type': 'application/json' }
  } = options;
  
  return {
    status,
    data,
    headers,
    statusText: status === 200 ? 'OK' : 'Error'
  };
};

/**
 * Creates a mock Express request object
 * @param {Object} options - Request options
 * @returns {Object} Mock request
 */
export const createMockRequest = (options = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    method: 'GET',
    url: '/',
    ...options
  };
};

/**
 * Creates a mock Express response object
 * @returns {Object} Mock response with jest-like functions
 */
export const createMockResponse = () => {
  const res = {
    status: createMockFunction().mockReturnThis(),
    json: createMockFunction().mockReturnThis(),
    send: createMockFunction().mockReturnThis(),
    end: createMockFunction().mockReturnThis(),
    redirect: createMockFunction().mockReturnThis(),
    cookie: createMockFunction().mockReturnThis(),
    header: createMockFunction().mockReturnThis()
  };
  
  // Make methods chainable
  Object.keys(res).forEach(key => {
    if (typeof res[key] === 'function') {
      res[key].mockReturnValue(res);
    }
  });
  
  return res;
};

/**
 * Captures console output during test execution
 * @param {Function} fn - Function to execute
 * @returns {Promise<{result: *, logs: string[]}>} Result and captured logs
 */
export const captureConsole = async (fn) => {
  const originalLog = console.log;
  const originalError = console.error;
  const logs = [];
  
  console.log = (...args) => logs.push(['log', ...args]);
  console.error = (...args) => logs.push(['error', ...args]);
  
  try {
    const result = await fn();
    return { result, logs };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
};

/**
 * Asserts that a function throws an error with specific message
 * @param {Function} fn - Function that should throw
 * @param {string|RegExp} expectedMessage - Expected error message
 */
export const expectToThrow = (fn, expectedMessage) => {
  let error;
  try {
    fn();
  } catch (e) {
    error = e;
  }
  
  if (!error) {
    throw new Error('Expected function to throw an error');
  }
  
  if (typeof expectedMessage === 'string') {
    if (!error.message.includes(expectedMessage)) {
      throw new Error(`Expected error message to contain "${expectedMessage}", got "${error.message}"`);
    }
  } else if (expectedMessage instanceof RegExp) {
    if (!expectedMessage.test(error.message)) {
      throw new Error(`Expected error message to match ${expectedMessage}, got "${error.message}"`);
    }
  }
};

/**
 * Asserts that an async function throws an error
 * @param {Function} fn - Async function that should throw
 * @param {string|RegExp} expectedMessage - Expected error message
 */
export const expectToThrowAsync = async (fn, expectedMessage) => {
  let error;
  try {
    await fn();
  } catch (e) {
    error = e;
  }
  
  if (!error) {
    throw new Error('Expected async function to throw an error');
  }
  
  if (expectedMessage) {
    if (typeof expectedMessage === 'string') {
      if (!error.message.includes(expectedMessage)) {
        throw new Error(`Expected error message to contain "${expectedMessage}", got "${error.message}"`);
      }
    } else if (expectedMessage instanceof RegExp) {
      if (!expectedMessage.test(error.message)) {
        throw new Error(`Expected error message to match ${expectedMessage}, got "${error.message}"`);
      }
    }
  }
};