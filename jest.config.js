module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
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
  // 忽略 dist 目錄避免衝突
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  // 集成測試配置
  testTimeout: 60000,
  maxWorkers: 1,
  // 分別運行單元測試和集成測試
  projects: [
    {
      preset: 'ts-jest',
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      testTimeout: 10000,
      modulePathIgnorePatterns: ['<rootDir>/dist/'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
    },
    {
      preset: 'ts-jest',
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testTimeout: 90000,
      maxWorkers: 1,
      modulePathIgnorePatterns: ['<rootDir>/dist/'],
      setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
      transform: {
        '^.+\\.ts$': 'ts-jest',
      },
    }
  ]
};