/**
 * Admin Subscription Schemas
 * JSON Schema definitions for admin subscription endpoints
 */

export const getSubscriptionStatsSchema = {
  tags: ['Admin - Subscriptions'],
  summary: 'Get subscription statistics',
  description:
    'Returns aggregated subscription statistics including counts by plan, status, and revenue',
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            byPlan: {
              type: 'object',
              properties: {
                scale: { type: 'number' },
                soar: { type: 'number' },
              },
            },
            byStatus: {
              type: 'object',
              properties: {
                active: { type: 'number' },
                trialing: { type: 'number' },
                past_due: { type: 'number' },
                cancelled: { type: 'number' },
                expired: { type: 'number' },
              },
            },
            revenue: {
              type: 'object',
              properties: {
                mrr: { type: 'number' },
                totalRevenue: { type: 'number' },
                currency: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
} as const;

export const listSubscriptionsSchema = {
  tags: ['Admin - Subscriptions'],
  summary: 'List all subscriptions',
  description: 'Returns paginated list of subscriptions with optional filters',
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'number', minimum: 1, default: 1 },
      limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
      planCode: { type: 'string', enum: ['scale', 'soar'] },
      status: {
        type: 'string',
        enum: ['active', 'trialing', 'past_due', 'cancelled', 'expired'],
      },
      search: { type: 'string' },
      sortBy: { type: 'string', default: 'createdAt' },
      sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
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
            subscriptions: { type: 'array' },
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  },
} as const;

export const getSubscriptionByIdSchema = {
  tags: ['Admin - Subscriptions'],
  summary: 'Get subscription by ID',
  description: 'Returns detailed subscription information',
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object', additionalProperties: true },
      },
    },
    404: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  },
} as const;

// Query interfaces
export interface ListSubscriptionsQuery {
  page?: number;
  limit?: number;
  planCode?: 'scale' | 'soar';
  status?: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired';
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SubscriptionIdParams {
  id: string;
}
