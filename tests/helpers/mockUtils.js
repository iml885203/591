/**
 * Bun-compatible mock utilities
 * Uses Bun's native mock functions for full compatibility with expect() matchers
 */

import { mock } from 'bun:test';

/**
 * Creates a mock function using Bun's native mock() function
 * @param {*} returnValue - Default return value
 * @returns {Function} Bun mock function with call tracking
 */
export const createMockFunction = (returnValue) => {
  // Create a Bun native mock function with the default return value
  const fn = mock(() => returnValue);
  
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
 * @param {Object} object - Object containing the method
 * @param {string} methodName - Method name to spy on
 * @returns {Function} Spy function
 */
export const createSpy = (object, methodName) => {
  const originalMethod = object[methodName];
  
  // Create a Bun native mock that calls the original method
  const spy = mock((...args) => {
    return originalMethod.apply(object, args);
  });
  
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
  
  object[methodName] = spy;
  return spy;
};

/**
 * Clears all mocks in an object
 * @param {Object} mocks - Object containing mock functions or nested objects
 */
export const clearAllMocks = (mocks) => {
  const clearMock = (obj) => {
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
 * @param {Object} methods - Object with method names and their implementations
 * @returns {Object} Mock object
 */
export const createMockObject = (methods = {}) => {
  const mock = {};
  
  Object.keys(methods).forEach(methodName => {
    const implementation = methods[methodName];
    if (typeof implementation === 'function') {
      mock[methodName] = createMockFunction().mockImplementation(implementation);
    } else {
      mock[methodName] = createMockFunction(implementation);
    }
  });
  
  return mock;
};