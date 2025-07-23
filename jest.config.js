module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Coverage settings
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ],
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'lib/**/*.js',
    'crawler.js',
    'api.js',
    '!lib/**/*.test.js',
    '!tests/**/*'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Module name mapping (correct property name is moduleNameMapper)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/lib/$1'
  },
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Test timeout (for integration tests that may be slower)
  testTimeout: 10000
};