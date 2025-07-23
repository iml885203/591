# Plan: Add Swagger Documentation

## Overview
Integrate Swagger/OpenAPI documentation to the 591-crawler API server for better API discoverability, testing, and developer experience. This will provide interactive documentation accessible via web interface.

## Current API Analysis
The API currently has:
- `/health` - GET endpoint for health checks
- `/crawl` - POST endpoint for triggering crawl operations
- `/info` - Basic API documentation endpoint (mentioned in CLAUDE.md)

## Implementation Steps

### 1. Dependencies Installation
- **Add Swagger dependencies**:
  - `swagger-ui-express`: Swagger UI middleware for Express
  - `swagger-jsdoc`: Generate OpenAPI specs from JSDoc comments
  - Consider `yamljs` for YAML spec file support

### 2. OpenAPI Specification Creation
- **Create API specification** (`docs/swagger.yaml` or inline JSDoc):
  - API info (title, version, description)
  - Server configuration
  - Authentication (if needed)
  - Request/response schemas
  - Error response formats

### 3. Endpoint Documentation
- **Document `/health` endpoint**:
  - Response schema for health check
  - HTTP status codes (200)
  
- **Document `/crawl` endpoint**:
  - Request body schema with all parameters
  - Response schema for successful operations
  - Error response schemas (400, 500)
  - Parameter descriptions and examples

### 4. Schema Definitions
- **Request schemas**:
  - CrawlRequest: url, maxLatest, notifyMode, filteredMode, filter
  - FilterOptions: mrtDistanceThreshold and future filter parameters
  
- **Response schemas**:
  - CrawlResponse: success, message, data, timestamp
  - HealthResponse: status, timestamp, service
  - ErrorResponse: success, error, message

### 5. Integration with Express App
- **Add Swagger middleware** to `api.js`:
  - Configure swagger-ui-express
  - Set up documentation route (e.g., `/docs` or `/api-docs`)
  - Integrate with existing CORS configuration

### 6. Examples and Use Cases
- **Add realistic examples**:
  - Sample 591.com.tw URLs
  - Different notification modes
  - Filter parameter examples
  - Success and error response examples

### 7. Enhanced API Info Endpoint
- **Update `/info` endpoint**:
  - Redirect to Swagger UI or provide links
  - Include API version and capabilities
  - Maintain backward compatibility

## Technical Considerations

### Security
- Ensure Swagger UI doesn't expose sensitive information
- Add basic authentication if needed for production
- Document rate limiting and security practices

### Performance
- Swagger UI assets served efficiently
- Documentation generation optimized
- Minimal impact on API performance

### Maintenance
- Keep documentation in sync with code changes
- Use JSDoc comments for inline documentation
- Version documentation alongside API changes

## File Structure
```
591-crawler/
├── docs/
│   ├── swagger.yaml          # OpenAPI specification
│   └── examples/             # Request/response examples
├── api.js                    # Updated with Swagger integration
└── package.json              # New dependencies
```

## Documentation Features
- **Interactive API testing** via Swagger UI
- **Request/response examples** for all endpoints
- **Parameter validation** documentation
- **Error handling** explanations
- **Rate limiting** information
- **Authentication** requirements (future)

## Integration Testing
- Verify Swagger UI loads correctly
- Test API documentation accuracy
- Validate example requests work
- Check mobile responsiveness of documentation

## Deployment Considerations
- Update Docker configuration if needed
- Ensure documentation works in containerized environment
- Consider documentation hosting options
- Update CLAUDE.md with new documentation routes

## Benefits
- **Improved developer experience** with interactive docs
- **API discoverability** and easier integration
- **Standardized documentation** following OpenAPI spec
- **Built-in testing interface** for API endpoints
- **Professional API presentation** for external users

## Backward Compatibility
- Existing `/info` endpoint maintained
- No breaking changes to current API
- Optional documentation access (not required for API usage)
- Graceful fallback if Swagger assets fail to load