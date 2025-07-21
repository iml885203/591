/**
 * Jest test setup file
 * Runs before each test file
 */

// Mock console.log to reduce noise during tests
const originalLog = console.log;
const originalError = console.error;

beforeAll(() => {
  // Suppress console output during tests unless explicitly enabled
  if (!process.env.VERBOSE_TESTS) {
    console.log = jest.fn();
    console.error = jest.fn();
  }
});

afterAll(() => {
  // Restore original console functions
  console.log = originalLog;
  console.error = originalError;
});

// Global test utilities
global.testUtils = {
  // Create a mock property object
  createMockProperty: (overrides = {}) => ({
    title: 'Test Property',
    link: 'https://rent.591.com.tw/12345',
    imgUrls: ['https://img.591.com.tw/test.jpg'],
    tags: ['近捷運', '可開伙'],
    rooms: '整層住家2房1廳',
    metroValue: '500公尺',
    metroTitle: '距台北車站',
    timestamp: new Date().toISOString(),
    ...overrides
  }),

  // Create multiple mock properties
  createMockProperties: (count = 3) => {
    return Array.from({ length: count }, (_, i) => 
      global.testUtils.createMockProperty({
        title: `Test Property ${i + 1}`,
        link: `https://rent.591.com.tw/1234${i + 1}`
      })
    );
  },

  // Mock cheerio element structure
  createMockCheerioElement: (data = {}) => ({
    find: jest.fn().mockReturnValue({
      text: jest.fn().mockReturnValue(data.text || ''),
      attr: jest.fn().mockReturnValue(data.attr || ''),
      each: jest.fn((callback) => {
        if (data.items) {
          data.items.forEach((item, index) => callback(index, item));
        }
      })
    })
  })
};