#!/usr/bin/env bun

/**
 * Legacy Rental Data Update Script
 * Updates existing rental records to parse houseType and rooms from title
 */

const { logWithTimestamp } = require('../lib/utils');
const DatabaseStorage = require('../lib/storage/DatabaseStorage');

async function updateLegacyRentals() {
  const databaseStorage = new DatabaseStorage();
  
  try {
    logWithTimestamp('🔄 Starting legacy rental data update...');
    
    await databaseStorage.initialize();
    
    // Find rentals with default houseType value
    const legacyRentals = await databaseStorage.prisma.rentals.findMany({
      where: {
        houseType: '房屋類型未明'
      },
      select: {
        id: true,
        title: true,
        houseType: true,
        rooms: true
      }
    });
    
    logWithTimestamp(`📋 Found ${legacyRentals.length} legacy rentals to update`);
    
    if (legacyRentals.length === 0) {
      logWithTimestamp('✅ No legacy rentals found. All records are up to date.');
      return true;
    }
    
    let updatedCount = 0;
    let errors = 0;
    
    for (const rental of legacyRentals) {
      try {
        const { houseType, rooms } = parseHouseTypeAndRoomsFromTitle(rental.title);
        
        // Only update if we found better values
        if (houseType !== '房屋類型未明' || (rooms !== '房型未明' && rental.rooms === '房型未明')) {
          await databaseStorage.prisma.rentals.update({
            where: { id: rental.id },
            data: {
              houseType: houseType,
              rooms: rooms !== '房型未明' ? rooms : rental.rooms // Keep existing rooms if new parsing fails
            }
          });
          
          updatedCount++;
          logWithTimestamp(`✓ Updated rental: ${rental.title.substring(0, 30)}... -> ${houseType} | ${rooms}`);
        }
        
      } catch (error) {
        errors++;
        logWithTimestamp(`❌ Error updating rental ${rental.id}: ${error.message}`, 'ERROR');
      }
    }
    
    logWithTimestamp(`✅ Legacy rental update completed:`);
    logWithTimestamp(`   - Processed: ${legacyRentals.length}`);
    logWithTimestamp(`   - Updated: ${updatedCount}`);
    logWithTimestamp(`   - Errors: ${errors}`);
    
    return true;
    
  } catch (error) {
    logWithTimestamp(`❌ Legacy rental update failed: ${error.message}`, 'ERROR');
    return false;
  } finally {
    await databaseStorage.close();
  }
}

/**
 * Parse house type and rooms from rental title
 * @param {string} title - Rental title
 * @returns {Object} - {houseType, rooms}
 */
function parseHouseTypeAndRoomsFromTitle(title) {
  let houseType = '房屋類型未明';
  let rooms = '房型未明';
  
  // House type patterns (order matters - more specific first)
  const houseTypePatterns = [
    { pattern: /獨立套房|獨棟套房|套房獨立/, type: '獨立套房' },
    { pattern: /分租套房|套房分租/, type: '分租套房' },
    { pattern: /雅房|分租雅房/, type: '雅房' },
    { pattern: /套房/, type: '獨立套房' },
    { pattern: /整層住家|整層|透天|別墅|公寓整層|大樓整層/, type: '整層住家' },
    { pattern: /店面|商用|辦公/, type: '店面' }
  ];
  
  // Room patterns
  const roomPatterns = [
    /(\d+房\d*廳?\d*衛?)/,
    /(套房)/,
    /(雅房)/,
    /(\d+房)/,
    /(\d+廳)/
  ];
  
  // Extract house type
  for (const { pattern, type } of houseTypePatterns) {
    if (pattern.test(title)) {
      houseType = type;
      break;
    }
  }
  
  // Extract rooms
  for (const pattern of roomPatterns) {
    const match = title.match(pattern);
    if (match) {
      rooms = match[1];
      break;
    }
  }
  
  return { houseType, rooms };
}

// Run if executed directly
if (require.main === module) {
  updateLegacyRentals()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Legacy rental update failed:', error);
      process.exit(1);
    });
}

module.exports = { updateLegacyRentals, parseHouseTypeAndRoomsFromTitle };