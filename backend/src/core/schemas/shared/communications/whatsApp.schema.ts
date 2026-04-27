import { WhatsAppStatus } from '@core/models/WhatsAppLog';

/**
 * WhatsApp schemas - Native JSON Schema
 * Note: Date and number coercion handled by Fastify's coerceTypes option
 */

/**
 * Query params for getting WhatsApp logs
 */
export const getWhatsAppLogsQuerySchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: Object.values(WhatsAppStatus),
      description: 'WhatsApp message status filter',
    },
    templateId: {
      type: 'string',
      description: 'Template ID filter',
    },
    toPhone: {
      type: 'string',
      description: 'Recipient phone number filter',
    },
    userId: {
      type: 'string',
      pattern: '^[0-9a-fA-F]{24}$',
      description: 'User ID filter',
    },
    hubId: {
      type: 'string',
      pattern: '^[0-9a-fA-F]{24}$',
      description: 'Hub ID filter',
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
 * Query params for searching WhatsApp logs
 */
export const searchWhatsAppLogsQuerySchema = {
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
 * WhatsApp log ID param
 */
export const whatsAppLogIdParamSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      pattern: '^[0-9a-fA-F]{24}$',
      description: 'WhatsApp log ID (MongoDB ObjectId)',
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface GetWhatsAppLogsQuery {
  status?: WhatsAppStatus;
  templateId?: string;
  toPhone?: string;
  userId?: string;
  hubId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface SearchWhatsAppLogsQuery {
  query: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface WhatsAppLogIdParam {
  id: string;
}
