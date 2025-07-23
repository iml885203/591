# Plan: Rename Property to Rental

## Overview
Refactor the codebase to consistently use "rental" terminology instead of "property" throughout the application. This improves semantic clarity since the domain specifically deals with rental properties from 591.com.tw.

## Scope Analysis
The codebase already uses the `Rental` class as the domain model, but many variables, comments, and API responses still use "property" terminology. This plan will standardize terminology while maintaining backward compatibility where needed.

## Implementation Steps

### 1. Code Refactoring
- **Variables and function parameters**: Rename `property` → `rental` in:
  - `lib/crawlService.js`: Function parameters and local variables
  - `lib/crawler.js`: Property processing variables
  - `lib/parser.js`: Parsing function variables
  - `lib/notification.js`: Notification message variables
  - `tests/`: All test files using property terminology

### 2. API Response Structure
- **API endpoints** (`api.js`):
  - Update response field names: `properties` → `rentals`
  - Update response field names: `propertiesFound` → `rentalsFound`
  - Update response field names: `newProperties` → `newRentals`
  - Maintain backward compatibility with deprecation warnings

### 3. Documentation Updates
- **Comments and JSDoc**: Update inline documentation
- **CLAUDE.md**: Update examples and terminology (note: not creating new docs, just updating existing)
- **API documentation**: Update `/info` endpoint examples

### 4. Test Updates
- **Test descriptions**: Update test names and descriptions
- **Test data**: Update mock data variable names
- **Assertions**: Update expectation messages

### 5. Configuration and Messages
- **Log messages**: Update console output and error messages
- **Discord notifications**: Update notification text (ensure user-facing messages remain clear)

## Backward Compatibility
- API responses will include both old and new field names during transition
- Environment variables and configuration remain unchanged
- External integrations (Discord webhooks) maintain current message format

## Testing Strategy
- Run full test suite after each major refactoring step
- Verify API responses include expected field names
- Test CLI functionality with renamed variables
- Integration tests for API endpoints

## Rollback Plan
- Git branch for all changes
- Incremental commits for each refactoring step
- Ability to revert individual components if needed

## Benefits
- Improved semantic clarity and domain consistency
- Better alignment with existing `Rental` domain model
- Enhanced code readability and maintainability
- Standardized terminology across codebase