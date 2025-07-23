#!/usr/bin/env node

/**
 * Test script for 591 Crawler API
 * Demonstrates how to use the API endpoints
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

// Test cases
const testCases = [
  {
    name: 'Health Check',
    method: 'GET',
    endpoint: '/health',
    expectedStatus: 200
  },
  {
    name: 'API Information',
    method: 'GET', 
    endpoint: '/info',
    expectedStatus: 200
  },
  {
    name: 'Basic Crawl (with noNotify)',
    method: 'POST',
    endpoint: '/crawl',
    data: {
      url: 'https://rent.591.com.tw/list?region=1&kind=0',
      noNotify: true
    },
    expectedStatus: 200
  },
  {
    name: 'Crawl with maxLatest (with noNotify)',
    method: 'POST',
    endpoint: '/crawl',
    data: {
      url: 'https://rent.591.com.tw/list?region=1&kind=0',
      maxLatest: 3,
      noNotify: true
    },
    expectedStatus: 200
  },
  {
    name: 'Invalid URL Test',
    method: 'POST',
    endpoint: '/crawl',
    data: {
      url: 'https://example.com'
    },
    expectedStatus: 400
  },
  {
    name: 'Missing URL Test',
    method: 'POST',
    endpoint: '/crawl',
    data: {},
    expectedStatus: 400
  }
];

async function runTest(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`   ${testCase.method} ${testCase.endpoint}`);
  
  try {
    let response;
    const config = {
      timeout: 30000, // 30 second timeout
      validateStatus: () => true // Don't throw on HTTP error status
    };

    if (testCase.method === 'GET') {
      response = await axios.get(`${API_BASE_URL}${testCase.endpoint}`, config);
    } else if (testCase.method === 'POST') {
      response = await axios.post(`${API_BASE_URL}${testCase.endpoint}`, testCase.data, config);
    }

    const statusMatch = response.status === testCase.expectedStatus;
    console.log(`   Status: ${response.status} ${statusMatch ? '✅' : '❌'}`);
    
    if (response.data) {
      console.log(`   Response:`, JSON.stringify(response.data, null, 2).slice(0, 200) + '...');
    }

    return statusMatch;
    
  } catch (error) {
    console.log(`   Error: ${error.message} ❌`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting 591 Crawler API Tests');
  console.log(`📍 API URL: ${API_BASE_URL}`);
  
  let passed = 0;
  let total = testCases.length;

  for (const testCase of testCases) {
    const result = await runTest(testCase);
    if (result) passed++;
  }

  console.log(`\n📊 Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Check the output above.');
  }

  console.log(`\n📚 Usage Examples:`);
  console.log(`
  # Start the API server
  npm run api
  
  # Health check
  curl http://localhost:3000/health
  
  # Get API info
  curl http://localhost:3000/info
  
  # Basic crawl (no notifications)
  curl -X POST http://localhost:3000/crawl \\
    -H "Content-Type: application/json" \\
    -d '{"url": "https://rent.591.com.tw/list?region=1&kind=0", "noNotify": true}'
  
  # Crawl with limit
  curl -X POST http://localhost:3000/crawl \\
    -H "Content-Type: application/json" \\
    -d '{"url": "https://rent.591.com.tw/list?region=1&kind=0", "maxLatest": 5, "noNotify": false}'
  `);
}

// Check if API server is running
async function checkServer() {
  try {
    await axios.get(`${API_BASE_URL}/health`, { timeout: 3000 });
    return true;
  } catch (error) {
    console.log('❌ API server is not running!');
    console.log('💡 Start the server first: npm run api');
    console.log('   Then run this test script again');
    return false;
  }
}

// Run tests
checkServer().then(serverRunning => {
  if (serverRunning) {
    main();
  }
});

module.exports = { testCases, runTest };