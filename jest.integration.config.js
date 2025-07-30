module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'lib/**/*.ts',
    'api.ts',
    '!lib/**/*.d.ts',
  ],
  moduleFileExtensions: ['ts', 'js'],
  verbose: true,
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  testTimeout: 90000,
  maxWorkers: 1,
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
};