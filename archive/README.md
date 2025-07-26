# Archive

This directory contains legacy code that has been removed from the main codebase but preserved for historical reference.

## Migration Scripts (migration-scripts/)

**Moved on:** 2025-07-26  
**Reason:** One-time migration from JSON to PostgreSQL database completed. These scripts are no longer needed for normal operation.

**Files:**
- `legacy-json-migration.js` - Main migration script for JSON to PostgreSQL 
- `final-legacy-sql.sql` - Final SQL cleanup for legacy rental records
- `improved-legacy-sql.sql` - Improved patterns for legacy data cleanup
- `update-legacy-sql.sql` - SQL updates for legacy rental data
- `update-legacy-rentals.js` - Script to update legacy rental records

**Package.json scripts removed:**
- `migrate:legacy-json` - Migration command
- `migrate:verify` - Migration verification
- `migrate:update-legacy` - Legacy data updates

These scripts can still be run manually from the archive if needed for emergency data recovery, but they are not part of the normal workflow anymore.

## API Changes

**Deprecated Swagger fields removed:**
- `propertiesFound` → use `rentalsFound`
- `newProperties` → use `newRentals` 
- `properties` → use `rentals`

These deprecated fields were maintained for backward compatibility but are now removed from the API schema.

## Legacy Code Files

**Moved on:** 2025-07-26  
**Reason:** Code no longer used after migration to PostgreSQL database.

**Files:**
- `storage.js` - Legacy JSON file storage functions (loadPreviousData, savePreviousData, getDataFilePath)

These functions were replaced by the DatabaseStorage class and are no longer used in the codebase.