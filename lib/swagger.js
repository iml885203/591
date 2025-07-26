/**
 * Swagger Configuration for 591 Crawler API
 * OpenAPI 3.0 specification for API documentation
 */

const swaggerJsdoc = require('swagger-jsdoc');
const packageInfo = require('../package.json');
const { getVersion } = require('./getVersion');

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: '591 Crawler API',
    version: getVersion(),
    description: `
      REST API for 591.com.tw rental property crawler with Discord notifications.
      
      This API provides endpoints to crawl Taiwan's largest rental property platform 
      and send filtered notifications via Discord webhooks.
      
      **Features:**
      - 🏗️ Modular architecture with dependency injection
      - 🔔 Flexible notification system with distance-based filtering
      - 🎯 Smart rental detection and duplicate prevention
      - 📊 Comprehensive response data with rental details
      
      **Version Format:** CalVer (YYYY.MM.PATCH)
    `,
    contact: {
      name: 'API Support',
      url: packageInfo.homepage,
      email: 'support@example.com'
    },
    license: {
      name: packageInfo.license,
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'http://localhost:3001',
      description: 'Production server (Local Docker)'
    },
    {
      url: 'http://192.168.50.154:3001',
      description: 'Production server (Network access)'
    }
  ],
  tags: [
    {
      name: 'Health',
      description: 'Health check and status endpoints'
    },
    {
      name: 'Crawler',
      description: 'Rental property crawling operations'
    },
    {
      name: 'Info',
      description: 'API information and documentation'
    }
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API key for authentication. Can also be provided as apiKey query parameter.'
      }
    },
    schemas: {
      Rental: {
        type: 'object',
        description: 'Rental property data from 591.com.tw',
        properties: {
          title: {
            type: 'string',
            description: 'Property title/description',
            example: '台北市大安區 2房1廳 近捷運站'
          },
          link: {
            type: 'string',
            format: 'uri',
            description: 'Direct link to property listing',
            example: 'https://rent.591.com.tw/home/123456'
          },
          rooms: {
            type: 'string',
            description: 'Room configuration (bedrooms/bathrooms/living rooms)',
            example: '2房1廳1衛'
          },
          metroTitle: {
            type: 'string',
            description: 'Nearest MRT station name',
            example: '忠孝復興站'
          },
          metroValue: {
            type: 'string',
            description: 'Distance to nearest MRT station',
            example: '步行約 5 分鐘'
          },
          tags: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Property tags and features',
            example: ['可養寵物', '有電梯', '近捷運']
          },
          imgUrls: {
            type: 'array',
            items: {
              type: 'string',
              format: 'uri'
            },
            description: 'Property image URLs',
            example: ['https://hp2.591.com.tw/house/active/2024/123456/1.jpg']
          },
          notification: {
            type: 'object',
            description: 'Notification metadata',
            properties: {
              sent: {
                type: 'boolean',
                description: 'Whether notification was sent'
              },
              silent: {
                type: 'boolean',
                description: 'Whether notification was sent silently'
              },
              color: {
                type: 'integer',
                description: 'Discord embed color (hex)'
              }
            }
          }
        },
        required: ['title', 'link']
      },
      CrawlRequest: {
        type: 'object',
        description: 'Request parameters for crawling operation',
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            description: '591.com.tw search URL',
            example: 'https://rent.591.com.tw/list?region=1&kind=0'
          },
          maxLatest: {
            type: 'integer',
            minimum: 1,
            description: 'Maximum number of latest rentals to process (null = new only)',
            example: 10,
            nullable: true
          },
          notifyMode: {
            type: 'string',
            enum: ['all', 'filtered', 'none'],
            default: 'filtered',
            description: 'Notification mode: all (all rentals), filtered (distance-based), none (no notifications)'
          },
          filteredMode: {
            type: 'string',
            enum: ['normal', 'silent', 'none'],
            default: 'silent',
            description: 'Filtered sub-mode: normal (normal notifications), silent (silent for far rentals), none (skip far rentals)'
          },
          filter: {
            type: 'object',
            description: 'Filter options for rental screening',
            properties: {
              mrtDistanceThreshold: {
                type: 'integer',
                minimum: 1,
                description: 'Distance threshold in meters for MRT filtering',
                example: 600
              }
            }
          }
        },
        required: ['url']
      },
      CrawlResponse: {
        type: 'object',
        description: 'Successful crawl operation response',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          message: {
            type: 'string',
            example: 'Crawl completed successfully'
          },
          data: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                format: 'uri',
                description: 'The crawled URL'
              },
              maxLatest: {
                type: 'integer',
                nullable: true,
                description: 'Maximum rentals processed'
              },
              notifyMode: {
                type: 'string',
                enum: ['all', 'filtered', 'none']
              },
              filteredMode: {
                type: 'string',
                enum: ['normal', 'silent', 'none']
              },
              rentalsFound: {
                type: 'integer',
                description: 'Total number of rentals found'
              },
              newRentals: {
                type: 'integer',
                description: 'Number of new rentals discovered'
              },
              notificationsSent: {
                type: 'boolean',
                description: 'Whether notifications were sent successfully'
              },
              rentals: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/Rental'
                }
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Response timestamp'
              }
            }
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        description: 'Error response format',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'string',
            description: 'Error type or category'
          },
          message: {
            type: 'string',
            description: 'Detailed error message'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Error timestamp'
          }
        },
        required: ['success', 'error', 'message']
      },
      HealthResponse: {
        type: 'object',
        description: 'Health check response',
        properties: {
          status: {
            type: 'string',
            example: 'ok'
          },
          timestamp: {
            type: 'string',
            format: 'date-time'
          },
          service: {
            type: 'string',
            example: '591-crawler-api'
          }
        }
      },
      InfoResponse: {
        type: 'object',
        description: 'API information response',
        properties: {
          name: {
            type: 'string',
            example: '591 Crawler API'
          },
          version: {
            type: 'string',
            description: 'API version in CalVer format (YYYY.MM.PATCH)',
            example: '2025.07.3'
          },
          description: {
            type: 'string'
          },
          endpoints: {
            type: 'object',
            description: 'Available API endpoints'
          },
          crawlParameters: {
            type: 'object',
            description: 'Detailed parameter documentation'
          },
          examples: {
            type: 'object',
            description: 'Usage examples for different scenarios'
          }
        }
      }
    },
    responses: {
      BadRequest: {
        description: 'Bad Request - Invalid parameters',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              error: 'URL is required',
              message: 'Please provide a 591.com.tw search URL'
            }
          }
        }
      },
      InternalServerError: {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              error: 'Crawl failed',
              message: 'Network timeout while fetching rental data',
              timestamp: '2025-07-23T12:00:00.000Z'
            }
          }
        }
      },
      Unauthorized: {
        description: 'Unauthorized - Invalid or missing API key',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            },
            example: {
              success: false,
              error: 'Unauthorized',
              message: 'API key required. Provide via x-api-key header or apiKey query parameter'
            }
          }
        }
      },
      NotFound: {
        description: 'Not Found - Endpoint does not exist',
        content: {
          'application/json': {
            schema: {
              allOf: [
                {
                  $ref: '#/components/schemas/ErrorResponse'
                },
                {
                  type: 'object',
                  properties: {
                    availableEndpoints: {
                      type: 'array',
                      items: {
                        type: 'string'
                      }
                    }
                  }
                }
              ]
            },
            example: {
              success: false,
              error: 'Endpoint not found',
              message: 'Route GET /unknown not found',
              availableEndpoints: ['/health', '/info', '/crawl']
            }
          }
        }
      }
    }
  }
};

// Options for swagger-jsdoc
const options = {
  definition: swaggerDefinition,
  // Path to the API files
  apis: ['./api.js', './lib/*.js']
};

// Initialize swagger-jsdoc
const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerDefinition
};