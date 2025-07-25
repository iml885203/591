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
  
  // Coverage thresholds - Set to realistic levels based on current coverage
  coverageThreshold: {
    global: {
      branches: 60,    // Current: 61.24%
      functions: 70,   // Current: 74.82% 
      lines: 70,       // Current: 73.78%
      statements: 70   // Current: 72.22%
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