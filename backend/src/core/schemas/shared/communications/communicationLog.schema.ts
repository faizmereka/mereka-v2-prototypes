import type { FastifySchema } from 'fastify';

/**
 * Communication Log Query Schema
 */
export const communicationLogQuerySchema = {
  type: 'object',
  properties: {
    channel: {
      type: 'string',
      enum: ['all', 'inApp', 'email', 'whatsApp'],
      default: 'all',
    },
    templateId: { type: 'string' },
    status: { type: 'string' },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
} as const;

/**
 * Communication Log Item Response Schema
 */
const communicationLogItemSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    channel: { type: 'string', enum: ['inApp', 'email', 'whatsApp'] },
    templateId: { type: 'string' },
    title: { type: 'string' },
    message: { type: 'string' },
    recipient: { type: 'string' },
    status: { type: 'string' },
    isRead: { type: 'boolean' },
    data: { type: 'object', additionalProperties: true },
    sentAt: { type: 'string', format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

/**
 * Communication Log Response Schema
 */
const communicationLogResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        logs: {
          type: 'array',
          items: communicationLogItemSchema,
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalInApp: { type: 'integer' },
            totalEmail: { type: 'integer' },
            totalWhatsApp: { type: 'integer' },
            unreadInApp: { type: 'integer' },
          },
        },
      },
    },
  },
} as const;

/**
 * Summary Response Schema
 */
const summaryResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        totalInApp: { type: 'integer' },
        totalEmail: { type: 'integer' },
        totalWhatsApp: { type: 'integer' },
        unreadInApp: { type: 'integer' },
      },
    },
  },
} as const;

/**
 * Get User Communication Logs Schema
 */
export const getUserCommunicationLogsSchema: FastifySchema = {
  tags: ['User - Notifications'],
  summary: 'Get user communication logs (InApp, Email, WhatsApp)',
  description: 'Fetches all communication logs for the authenticated user across all channels',
  querystring: communicationLogQuerySchema,
  response: {
    200: communicationLogResponseSchema,
  },
};

/**
 * Get User Communication Logs Summary Schema
 */
export const getUserCommunicationLogsSummarySchema: FastifySchema = {
  tags: ['User - Notifications'],
  summary: 'Get user communication logs summary',
  description: 'Returns counts for each channel',
  response: {
    200: summaryResponseSchema,
  },
};

/**
 * Get Hub Communication Logs Schema
 */
export const getHubCommunicationLogsSchema: FastifySchema = {
  tags: ['Hub - Notifications'],
  summary: 'Get hub communication logs (Email, WhatsApp)',
  description: 'Fetches all communication logs for the hub across Email and WhatsApp channels',
  params: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: { type: 'string' },
    },
  },
  querystring: communicationLogQuerySchema,
  response: {
    200: communicationLogResponseSchema,
  },
};

/**
 * Get Hub Communication Logs Summary Schema
 */
export const getHubCommunicationLogsSummarySchema: FastifySchema = {
  tags: ['Hub - Notifications'],
  summary: 'Get hub communication logs summary',
  description: 'Returns counts for Email and WhatsApp channels',
  params: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            totalEmail: { type: 'integer' },
            totalWhatsApp: { type: 'integer' },
          },
        },
      },
    },
  },
};

/**
 * TypeScript Types
 */
export interface CommunicationLogQuery {
  channel?: 'all' | 'inApp' | 'email' | 'whatsApp';
  templateId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface HubCommunicationLogParams {
  hubId: string;
}
