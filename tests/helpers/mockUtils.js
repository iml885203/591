/**
 * Bun-compatible mock utilities
 * Replaces Jest mocking functionality with Bun-compatible alternatives
 */

/**
 * Creates a mock function similar to jest.fn()
 * @param {*} returnValue - Default return value
 * @returns {Function} Mock function with call tracking
 */
export const createMockFunction = (returnValue) => {
  const fn = (...args) => {
    fn.calls.push(args);
    fn.callCount++;
    
    if (fn._implementation) {
      return fn._implementation(...args);
    }
    
    if (fn._returnValues.length > 0) {
      return fn._returnValues.shift();
    }
    
    if (fn._rejectedValues.length > 0) {
      const error = fn._rejectedValues.shift();
      throw error;
    }
    
    return fn._defaultReturnValue;
  };
  
  // Initialize mock function properties
  fn.calls = [];
  fn.callCount = 0;
  fn._defaultReturnValue = returnValue;
  fn._returnValues = [];
  fn._rejectedValues = [];
  fn._implementation = null;
  
  // Mock function methods
  fn.mockReturnValue = (value) => {
    fn._defaultReturnValue = value;
    return fn;
  };
  
  fn.mockReturnValueOnce = (value) => {
    fn._returnValues.push(value);
    return fn;
  };
  
  fn.mockResolvedValue = (value) => {
    fn._defaultReturnValue = Promise.resolve(value);
    return fn;
  };
  
  fn.mockResolvedValueOnce = (value) => {
    fn._returnValues.push(Promise.resolve(value));
    return fn;
  };
  
  fn.mockRejectedValue = (error) => {
    fn._defaultReturnValue = Promise.reject(error);
    return fn;
  };
  
  fn.mockRejectedValueOnce = (error) => {
    fn._rejectedValues.push(error);
    return fn;
  };
  
  fn.mockImplementation = (impl) => {
    fn._implementation = impl;
    return fn;
  };
  
  fn.mockImplementationOnce = (impl) => {
    const originalImpl = fn._implementation;
    fn._implementation = (...args) => {
      fn._implementation = originalImpl;
      return impl(...args);
    };
    return fn;
  };
  
  fn.mockClear = () => {
    fn.calls = [];
    fn.callCount = 0;
    return fn;
  };
  
  fn.mockReset = () => {
    fn.mockClear();
    fn._defaultReturnValue = undefined;
    fn._returnValues = [];
    fn._rejectedValues = [];
    fn._implementation = null;
    return fn;
  };
  
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
  const spy = createMockFunction();
  
  spy.mockImplementation((...args) => {
    return originalMethod.apply(object, args);
  });
  
  spy.mockRestore = () => {
    object[methodName] = originalMethod;
  };
  
  object[methodName] = spy;
  return spy;
};

/**
 * Clears all mocks in an object
 * @param {Object} mocks - Object containing mock functions
 */
export const clearAllMocks = (mocks) => {
  Object.values(mocks).forEach(mock => {
    if (typeof mock === 'function' && mock.mockClear) {
      mock.mockClear();
    }
  });
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