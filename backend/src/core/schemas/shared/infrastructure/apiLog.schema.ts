import { ApiLogLevel, ApiModule } from '@core/models/ApiLog';

/**
 * API Log schemas - Native JSON Schema
 * Note: Date/number coercion handled by Fastify's coerceTypes option
 */

/**
 * Query API Logs Schema
 */
export const queryApiLogsSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        minimum: 1,
        default: 1,
        description: 'Page number',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 50,
        description: 'Items per page',
      },
      userId: {
        type: 'string',
        description: 'User ID filter',
      },
      method: {
        type: 'string',
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        description: 'HTTP method filter',
      },
      path: {
        type: 'string',
        description: 'Path filter',
      },
      module: {
        type: 'string',
        enum: Object.values(ApiModule),
        description: 'API module filter',
      },
      statusCode: {
        type: 'number',
        description: 'Exact status code filter',
      },
      statusCodeGte: {
        type: 'number',
        description: 'Status code greater than or equal filter',
      },
      statusCodeLte: {
        type: 'number',
        description: 'Status code less than or equal filter',
      },
      ip: {
        type: 'string',
        description: 'IP address filter',
      },
      level: {
        type: 'string',
        enum: Object.values(ApiLogLevel),
        description: 'Log level filter',
      },
      errorCode: {
        type: 'string',
        description: 'Error code filter',
      },
      tags: {
        type: 'string',
        description: 'Comma-separated tags filter',
      },
      startDate: {
        type: 'string',
        format: 'date-time',
        description: 'Start date filter (ISO 8601)',
      },
      endDate: {
        type: 'string',
        format: 'date-time',
        description: 'End date filter (ISO 8601)',
      },
      search: {
        type: 'string',
        description: 'Search query',
      },
    },
  },
} as const;

/**
 * Get API Log Stats Schema
 */
export const getApiLogStatsSchema = {
  querystring: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        format: 'date-time',
        description: 'Start date filter (ISO 8601)',
      },
      endDate: {
        type: 'string',
        format: 'date-time',
        description: 'End date filter (ISO 8601)',
      },
    },
  },
} as const;

/**
 * Get Suspicious Activity Schema
 */
export const getSuspiciousActivitySchema = {
  querystring: {
    type: 'object',
    properties: {
      minutes: {
        type: 'number',
        minimum: 1,
        maximum: 60,
        default: 15,
        description: 'Time window in minutes',
      },
      threshold: {
        type: 'number',
        minimum: 10,
        default: 100,
        description: 'Request threshold',
      },
    },
  },
} as const;

/**
 * API Log Response Schema (for Swagger docs)
 */
export const apiLogResponseSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    requestId: { type: 'string' },
    userId: { type: 'string' },
    userEmail: { type: 'string' },
    method: { type: 'string' },
    path: { type: 'string' },
    route: { type: 'string' },
    module: {
      type: 'string',
      enum: Object.values(ApiModule),
    },
    statusCode: { type: 'number' },
    responseTime: { type: 'number' },
    ip: { type: 'string' },
    userAgent: { type: 'string' },
    level: {
      type: 'string',
      enum: Object.values(ApiLogLevel),
    },
    errorCode: { type: 'string' },
    errorMessage: { type: 'string' },
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
    createdAt: { type: 'string' },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface QueryApiLogsInput {
  page?: number;
  limit?: number;
  userId?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path?: string;
  module?: ApiModule;
  statusCode?: number;
  statusCodeGte?: number;
  statusCodeLte?: number;
  ip?: string;
  level?: ApiLogLevel;
  errorCode?: string;
  tags?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface GetApiLogStatsInput {
  startDate?: string;
  endDate?: string;
}

export interface GetSuspiciousActivityInput {
  minutes?: number;
  threshold?: number;
}
