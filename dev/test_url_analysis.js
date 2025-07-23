/**
 * Test script to analyze URL formatting issues
 */

const { parseRentals } = require('../lib/parser');
const cheerio = require('cheerio');

// Test with sample HTML that might contain problematic URLs
const sampleHTML = `
<div class="item">
  <div class="item-info-title">
    <a href="/house/19284954.html?type=1&amp;recom_type=area">【精品套房】台北市中山區民生東路一段</a>
  </div>
  <div class="item-img">
    <img class="common-img" data-src="https://example.com/img1.jpg">
  </div>
  <div class="item-info-tag">
    <span class="tag">電梯大樓</span>
  </div>
  <div class="item-info-txt">
    <i class="house-home"></i>
    <span>1房1廳1衛</span>
  </div>
  <div class="item-info-txt">
    <i class="house-metro"></i>
    <span>文湖線 中山國小站</span>
    <strong>3分鐘</strong>
  </div>
</div>
`;

console.log('=== URL Analysis ===');

// Test parsing
const rentals = parseRentals(sampleHTML, cheerio);
if (rentals.length > 0) {
  const rental = rentals[0];
  console.log('Parsed link:', rental.link);
  
  // Check for common URL issues
  console.log('\n=== URL Issue Analysis ===');
  
  // 1. HTML entities
  console.log('1. Contains HTML entities:', rental.link.includes('&amp;'));
  
  // 2. URL encoding issues
  const hasEncodingIssues = rental.link.includes('%') && !decodeURIComponent(rental.link);
  console.log('2. URL encoding issues:', hasEncodingIssues);
  
  // 3. Special characters
  const specialChars = /[^\w\-._~:/?#[\]@!$&'()*+,;=]/.test(rental.link);
  console.log('3. Contains unusual special chars:', specialChars);
  
  // 4. URL structure validation
  const urlPattern = /^https?:\/\/[^\s]+$/;
  console.log('4. Valid URL format:', urlPattern.test(rental.link));
  
  // 5. Test URL in Discord context
  console.log('\n=== Discord Compatibility ===');
  console.log('URL length:', rental.link.length);
  console.log('URL starts with http:', rental.link.startsWith('http'));
  console.log('URL contains spaces:', rental.link.includes(' '));
  console.log('URL contains newlines:', rental.link.includes('\n') || rental.link.includes('\r'));
  
  // Test URL copying simulation
  console.log('\n=== URL Copy Test ===');
  const urlToCopy = rental.link;
  console.log('URL to copy:', JSON.stringify(urlToCopy));
  console.log('Trimmed URL:', JSON.stringify(urlToCopy.trim()));
  
  // Check for invisible characters
  const hasInvisibleChars = urlToCopy !== urlToCopy.replace(/[\u200B-\u200D\uFEFF]/g, '');
  console.log('Contains invisible Unicode chars:', hasInvisibleChars);
  
} else {
  console.log('No rentals parsed from sample HTML');
}

// Test the createRentalEmbed function with potentially problematic URLs
const { createRentalEmbed } = require('../lib/notification');

const testRental = {
  title: '測試房源 with special chars & symbols',
  link: 'https://rent.591.com.tw/house/19284954.html?type=1&recom_type=area&utm_source=test',
  rooms: '1房1廳1衛',
  metroTitle: '文湖線 中山國小站',
  metroValue: '3分鐘',
  tags: ['電梯大樓'],
  imgUrls: []
};

const embed = createRentalEmbed(testRental, 1, 1, false, null, '');
console.log('\n=== Embed URL Field ===');
console.log('Embed URL:', JSON.stringify(embed.url));
console.log('URL equals original:', embed.url === testRental.link);