/**
 * Test script to check Discord embed format
 */

const { createRentalEmbed } = require('./lib/notification');

// Mock rental data similar to actual 591 data
const mockRental = {
  title: '【精品套房】台北市中山區民生東路一段 近中山國小站',
  link: 'https://rent.591.com.tw/19284954.html',
  rooms: '1房1廳1衛',
  metroTitle: '文湖線 中山國小站',
  metroValue: '3分鐘',
  tags: ['電梯大樓', '可養寵物', '近捷運', '有陽台'],
  imgUrls: ['https://example.com/image1.jpg']
};

const originalUrl = 'https://rent.591.com.tw/list?region=1&kind=0&searchtype=1';
const embed = createRentalEmbed(mockRental, 1, 5, false, 800, originalUrl);

console.log('=== Discord Embed Structure ===');
console.log(JSON.stringify(embed, null, 2));

console.log('\n=== Key URL Fields ===');
console.log('Embed title:', embed.title);
console.log('Embed url (clickable title):', embed.url);
console.log('Footer text:', embed.footer.text);

console.log('\n=== Potential Issues Analysis ===');
console.log('1. Embed URL (title link):', embed.url);
console.log('   - This should make the title clickable');
console.log('   - URL format looks correct:', /^https?:\/\/.+/.test(embed.url));

console.log('\n2. Footer contains original URL:', embed.footer.text.includes(originalUrl));
console.log('   - Footer text:', embed.footer.text);
console.log('   - This is plain text, not clickable');

console.log('\n3. No additional URL fields in embed fields');
console.log('   - Fields are for display only, not clickable');