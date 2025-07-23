#!/usr/bin/env node

const { crawl591 } = require('../lib/crawler');
const { logWithTimestamp } = require('../lib/utils');

const userAgents = [
  // Chrome Windows
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  
  // Firefox Windows  
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0',
  
  // Safari macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
  
  // Chrome macOS
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  
  // Mobile Chrome
  'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
];

const url = "https://rent.591.com.tw/list?region=3&metro=162&sort=posttime_desc&station=4232,4233,4234,4231&acreage=20$_50$&option=cold&notice=not_cover&price=25000$_40000$";

async function testUserAgents() {
  const results = [];
  
  for (let i = 0; i < userAgents.length; i++) {
    const ua = userAgents[i];
    const browser = ua.includes('Firefox') ? 'Firefox' : 
                   ua.includes('Safari') && !ua.includes('Chrome') ? 'Safari' :
                   ua.includes('Mobile') ? 'Mobile Chrome' : 'Chrome';
    
    console.log(`\n=== 測試 ${i+1}: ${browser} ===`);
    console.log(`User-Agent: ${ua.substring(0, 80)}...`);
    
    try {
      // 使用自定義的 User-Agent
      const customConfig = {
        maxRetries: 3,
        retryDelay: 2000,
        timeout: 30000
      };
      
      const customHeaders = {
        'User-Agent': ua
      };
      
      const properties = await crawl591(url, null, {
        noNotify: true,
        config: customConfig,
        getDefaultHeaders: () => customHeaders
      });
      
      const firstFive = properties.slice(0, 5).map(p => p.title);
      results.push({
        browser,
        userAgent: ua,
        totalProperties: properties.length,
        firstFive
      });
      
      console.log(`找到 ${properties.length} 個租屋`);
      console.log(`前5筆: ${firstFive.join(' | ')}`);
      
    } catch (error) {
      console.log(`錯誤: ${error.message}`);
      results.push({
        browser,
        userAgent: ua,
        error: error.message
      });
    }
    
    // 避免請求太頻繁
    if (i < userAgents.length - 1) {
      console.log('等待 3 秒...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log('\n=== 比較結果 ===');
  results.forEach((result, i) => {
    console.log(`\n${i+1}. ${result.browser}:`);
    if (result.error) {
      console.log(`   錯誤: ${result.error}`);
    } else {
      console.log(`   租屋數量: ${result.totalProperties}`);
      console.log(`   第一筆: ${result.firstFive[0]}`);
    }
  });
  
  // 檢查第一筆房源是否都相同
  const firstRentals = results.filter(r => !r.error).map(r => r.firstFive[0]);
  const uniqueFirst = [...new Set(firstRentals)];
  
  console.log(`\n=== 分析 ===`);
  console.log(`有效測試: ${firstRentals.length}`);
  console.log(`不同的第一筆租屋: ${uniqueFirst.length}`);
  
  if (uniqueFirst.length === 1) {
    console.log('✅ 所有 User-Agent 都得到相同的第一筆房源');
  } else {
    console.log('❌ 不同 User-Agent 得到不同的結果！');
    uniqueFirst.forEach((title, i) => {
      console.log(`   ${i+1}. ${title}`);
    });
  }
}

testUserAgents().catch(console.error);