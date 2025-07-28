/**
 * General test utilities for Bun test environment
 */

import { createMockFunction } from './mockUtils';

interface MockRental {
  id: string;
  title: string;
  price: number;
  address: string;
  url: string;
  images: string[];
  metro: string;
  area: string;
  room: string;
  floor: string;
  publishTime: string;
  features: string[];
  [key: string]: any;
}

interface CrawlSummary {
  totalProperties: number;
  newProperties: number;
  processedAt: string;
}

interface MockCrawlResult {
  rentals: MockRental[];
  summary: CrawlSummary;
  [key: string]: any;
}

interface MockResponseOptions {
  status?: number;
  data?: any;
  headers?: Record<string, string>;
}

interface MockResponse {
  status: number;
  data: any;
  headers: Record<string, string>;
  statusText: string;
}

interface MockRequestOptions {
  body?: any;
  params?: Record<string, any>;
  query?: Record<string, any>;
  headers?: Record<string, string>;
  method?: string;
  url?: string;
  [key: string]: any;
}

interface MockRequest {
  body: any;
  params: Record<string, any>;
  query: Record<string, any>;
  headers: Record<string, string>;
  method: string;
  url: string;
  [key: string]: any;
}

interface MockExpressResponse {
  status: ReturnType<typeof createMockFunction>;
  json: ReturnType<typeof createMockFunction>;
  send: ReturnType<typeof createMockFunction>;
  end: ReturnType<typeof createMockFunction>;
  redirect: ReturnType<typeof createMockFunction>;
  cookie: ReturnType<typeof createMockFunction>;
  header: ReturnType<typeof createMockFunction>;
}

interface CaptureConsoleResult<T> {
  result: T;
  logs: Array<[string, ...any[]]>;
}

/**
 * Creates a delayed promise for testing async operations
 */
export const delay = <T = void>(ms: number, value?: T): Promise<T> => {
  return new Promise(resolve => setTimeout(() => resolve(value!), ms));
};

/**
 * Creates a mock rental object for testing
 */
export const createMockRental = (overrides: Partial<MockRental> = {}): MockRental => {
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
 */
export const createMockCrawlResult = (overrides: Partial<MockCrawlResult> = {}): MockCrawlResult => {
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
 */
export const createMockHttpResponse = (options: MockResponseOptions = {}): MockResponse => {
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
 */
export const createMockRequest = (options: MockRequestOptions = {}): MockRequest => {
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
 */
export const createMockResponse = (): MockExpressResponse => {
  const res: MockExpressResponse = {
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
    const method = res[key as keyof MockExpressResponse];
    if (typeof method === 'function') {
      method.mockReturnValue(res);
    }
  });
  
  return res;
};

/**
 * Captures console output during test execution
 */
export const captureConsole = async <T>(fn: () => T | Promise<T>): Promise<CaptureConsoleResult<T>> => {
  const originalLog = console.log;
  const originalError = console.error;
  const logs: Array<[string, ...any[]]> = [];
  
  console.log = (...args: any[]) => logs.push(['log', ...args]);
  console.error = (...args: any[]) => logs.push(['error', ...args]);
  
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
 */
export const expectToThrow = (fn: () => void, expectedMessage?: string | RegExp): void => {
  let error: Error | undefined;
  try {
    fn();
  } catch (e) {
    error = e as Error;
  }
  
  if (!error) {
    throw new Error('Expected function to throw an error');
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

/**
 * Asserts that an async function throws an error
 */
export const expectToThrowAsync = async (fn: () => Promise<void>, expectedMessage?: string | RegExp): Promise<void> => {
  let error: Error | undefined;
  try {
    await fn();
  } catch (e) {
    error = e as Error;
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