/**
 * Jest-compatible mock utilities
 * Uses Jest's native mock functions for full compatibility with expect() matchers
 */

import { jest, type MockedFunction } from '@jest/globals';

export interface BunMockFunction<T extends (...args: any[]) => any = (...args: any[]) => any> extends MockedFunction<T> {
  calls: Array<Parameters<T>>;
  callCount: number;
}

interface SpyFunction<T extends (...args: any[]) => any = (...args: any[]) => any> extends BunMockFunction<T> {
  restore: () => void;
  mockRestore?: () => void;
}

/**
 * Creates a mock function using Jest's native jest.fn() function
 */
export const createMockFunction = <T extends (...args: any[]) => any>(
  returnValue?: ReturnType<T>
): BunMockFunction<T> => {
  // Create a Jest native mock function with the default return value
  const fn = jest.fn(() => returnValue) as BunMockFunction<T>;
  
  // If a return value was provided, set it up
  if (returnValue !== undefined) {
    fn.mockReturnValue(returnValue);
  }
  
  // Add backward compatibility for the old 'calls' property
  // This creates a getter that returns fn.mock.calls
  Object.defineProperty(fn, 'calls', {
    get() {
      return this.mock.calls;
    },
    configurable: true
  });
  
  // Add backward compatibility for callCount
  Object.defineProperty(fn, 'callCount', {
    get() {
      return this.mock.calls.length;
    },
    configurable: true
  });
  
  return fn;
};

/**
 * Creates a spy function that wraps an existing function
 */
export const createSpy = <T extends Record<string, any>, K extends keyof T>(
  object: T,
  methodName: K
): SpyFunction<T[K] extends (...args: any[]) => any ? T[K] : never> => {
  const originalMethod = object[methodName];
  
  if (typeof originalMethod !== 'function') {
    throw new Error(`Cannot spy on ${String(methodName)} because it is not a function`);
  }
  
  // Create a Jest native mock that calls the original method
  const spy = jest.fn((...args: any[]) => {
    return originalMethod.apply(object, args);
  }) as SpyFunction<T[K] extends (...args: any[]) => any ? T[K] : never>;
  
  // Add backward compatibility for the old 'calls' property
  Object.defineProperty(spy, 'calls', {
    get() {
      return this.mock.calls;
    },
    configurable: true
  });
  
  // Add backward compatibility for callCount
  Object.defineProperty(spy, 'callCount', {
    get() {
      return this.mock.calls.length;
    },
    configurable: true
  });
  
  // Use a different property name for restore since mockRestore might be readonly
  Object.defineProperty(spy, 'restore', {
    value: () => {
      object[methodName] = originalMethod;
    },
    configurable: true
  });
  
  // Also try to add mockRestore if possible
  try {
    spy.mockRestore = () => {
      object[methodName] = originalMethod;
    };
  } catch (e) {
    // If mockRestore is readonly, we'll use the 'restore' method instead
  }
  
  object[methodName] = spy as any;
  return spy;
};

/**
 * Clears all mocks in an object
 */
export const clearAllMocks = (mocks: any): void => {
  const clearMock = (obj: any): void => {
    if (typeof obj === 'function' && obj.mockClear) {
      obj.mockClear();
    } else if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(clearMock);
    }
  };
  
  clearMock(mocks);
};

/**
 * Creates a mock object with specified methods
 */
export const createMockObject = <T extends Record<string, any>>(
  methods: { [K in keyof T]: T[K] | ((...args: any[]) => any) } = {} as any
): { [K in keyof T]: BunMockFunction<T[K] extends (...args: any[]) => any ? T[K] : () => T[K]> } => {
  const mockObj = {} as any;
  
  Object.keys(methods).forEach(methodName => {
    const implementation = methods[methodName];
    if (typeof implementation === 'function') {
      mockObj[methodName] = createMockFunction().mockImplementation(implementation);
    } else {
      mockObj[methodName] = createMockFunction(implementation);
    }
  });
  
  return mockObj;
};