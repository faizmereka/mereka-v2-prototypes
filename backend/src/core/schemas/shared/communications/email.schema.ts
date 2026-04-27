import { EmailStatus, EmailType } from '@core/models/Email';

/**
 * Email schemas - Native JSON Schema
 * Note: Date and number coercion handled by Fastify's coerceTypes option
 */

/**
 * Query params for getting email logs
 */
export const getEmailLogsQuerySchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: Object.values(EmailStatus),
      description: 'Email status filter',
    },
    emailType: {
      type: 'string',
      enum: Object.values(EmailType),
      description: 'Email type filter',
    },
    toEmail: {
      type: 'string',
      description: 'Recipient email filter',
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
      default: 20,
      description: 'Items per page',
    },
  },
} as const;

/**
 * Query params for searching emails
 */
export const searchEmailsQuerySchema = {
  type: 'object',
  required: ['query'],
  properties: {
    query: {
      type: 'string',
      minLength: 1,
      description: 'Search query',
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
      default: 20,
      description: 'Items per page',
    },
  },
} as const;

/**
 * Email ID param
 */
export const emailIdParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      pattern: '^[0-9a-fA-F]{24}$',
      description: 'Email ID (MongoDB ObjectId)',
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface GetEmailLogsQuery {
  status?: EmailStatus;
  emailType?: EmailType;
  toEmail?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface SearchEmailsQuery {
  query: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface EmailIdParam {
  id: string;
}
