/**
 * Jest setup file
 * This file is executed before each test file
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.NOTIFICATION_DELAY = '0'; // Speed up tests
process.env.API_PORT = '3001'; // Use different port for testing

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to silence logs during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};