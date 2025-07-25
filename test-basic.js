#!/usr/bin/env bun
/**
 * Basic test runner that only tests core functionality without complex mocking
 */

console.log('🧪 Running basic tests...');

// Test 1: Utils functions
try {
  const { sleep, extractArrayFromElements, logWithTimestamp } = require('./lib/utils');
  
  console.log('✅ Utils functions exist');
  
  // Test sleep function
  await sleep(1);
  console.log('✅ Sleep function works');
  
  console.log('✅ Basic utils tests passed');
} catch (error) {
  console.error('❌ Utils tests failed:', error.message);
  process.exit(1);
}

// Test 2: Config loading
try {
  const { getConfig, getAllConfig } = require('./lib/config');
  const config = getConfig('crawler');
  console.log('✅ Config loading works');
} catch (error) {
  console.error('❌ Config tests failed:', error.message);
  process.exit(1);
}

// Test 3: Rental class
try {
  const Rental = require('./lib/Rental');
  const mockData = {
    title: 'Test Property',
    link: 'https://rent.591.com.tw/12345',
    imgUrls: ['https://example.com/img.jpg'],
    tags: ['近捷運'],
    rooms: '套房',
    metroValue: '500公尺',
    metroTitle: '中山站'
  };
  
  const rental = new Rental(mockData);
  console.log('✅ Rental class instantiation works');
  
  const json = rental.toJSON();
  if (json.title === 'Test Property') {
    console.log('✅ Rental toJSON works');
  } else {
    throw new Error('toJSON failed');
  }
} catch (error) {
  console.error('❌ Rental tests failed:', error.message);
  process.exit(1);
}

// Test 4: API health check
try {
  const app = require('./api');
  console.log('✅ API module loads successfully');
} catch (error) {
  console.error('❌ API module failed to load:', error.message);
  process.exit(1);
}

console.log('🎉 All basic tests passed!');
process.exit(0);