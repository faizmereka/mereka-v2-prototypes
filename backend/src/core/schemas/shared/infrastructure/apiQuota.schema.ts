import { QuotaPlan } from '@core/models/ApiQuota';

/**
 * API Quota schemas - Native JSON Schema
 * Note: Transform for isBlocked handled in controller
 */

/**
 * Get User Quota Schema
 */
export const getUserQuotaSchema = {
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: {
        type: 'string',
        minLength: 1,
        description: 'User ID',
      },
    },
  },
} as const;

/**
 * Update User Plan Schema
 */
export const updateUserPlanSchema = {
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: {
        type: 'string',
        minLength: 1,
        description: 'User ID',
      },
    },
  },
  body: {
    type: 'object',
    required: ['plan'],
    properties: {
      plan: {
        type: 'string',
        enum: Object.values(QuotaPlan),
        description: 'Quota plan',
      },
    },
  },
} as const;

/**
 * Set Custom Limits Schema
 */
export const setCustomLimitsSchema = {
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: {
        type: 'string',
        minLength: 1,
        description: 'User ID',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      daily: {
        type: 'number',
        minimum: 0,
        description: 'Daily request limit',
      },
      monthly: {
        type: 'number',
        minimum: 0,
        description: 'Monthly request limit',
      },
      perMinute: {
        type: 'number',
        minimum: 0,
        description: 'Per-minute request limit',
      },
    },
  },
} as const;

/**
 * Block User Schema
 */
export const blockUserSchema = {
  params: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: {
        type: 'string',
        minLength: 1,
        description: 'User ID',
      },
    },
  },
  body: {
    type: 'object',
    required: ['reason'],
    properties: {
      reason: {
        type: 'string',
        minLength: 1,
        maxLength: 500,
        description: 'Block reason',
      },
      durationHours: {
        type: 'number',
        minimum: 1,
        description: 'Block duration in hours (optional, permanent if not provided)',
      },
    },
  },
} as const;

/**
 * Query Quotas Schema (for admin list)
 * Note: Transform for isBlocked handled in controller
 */
export const queryQuotasSchema = {
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
      plan: {
        type: 'string',
        enum: Object.values(QuotaPlan),
        description: 'Plan filter',
      },
      isBlocked: {
        type: 'string',
        enum: ['true', 'false'],
        description: 'Blocked status filter (will be transformed to boolean)',
      },
    },
  },
} as const;

/**
 * Quota Response Schema (for Swagger docs)
 */
export const quotaResponseSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    userId: { type: 'string' },
    userEmail: { type: 'string' },
    plan: {
      type: 'string',
      enum: Object.values(QuotaPlan),
    },
    limits: {
      type: 'object',
      properties: {
        requestsPerDay: { type: 'number' },
        requestsPerMonth: { type: 'number' },
        requestsPerMinute: { type: 'number' },
      },
    },
    usage: {
      type: 'object',
      properties: {
        daily: { type: 'number' },
        monthly: { type: 'number' },
        lastDailyReset: { type: 'string' },
        lastMonthlyReset: { type: 'string' },
      },
    },
    isBlocked: { type: 'boolean' },
    blockedReason: { type: 'string' },
    blockedAt: { type: 'string' },
    blockedUntil: { type: 'string' },
    warnings: { type: 'number' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface GetUserQuotaParams {
  userId: string;
}

export interface UpdateUserPlanParams {
  userId: string;
}

export interface UpdateUserPlanBody {
  plan: QuotaPlan;
}

export interface SetCustomLimitsParams {
  userId: string;
}

export interface SetCustomLimitsBody {
  daily?: number;
  monthly?: number;
  perMinute?: number;
}

export interface BlockUserParams {
  userId: string;
}

export interface BlockUserBody {
  reason: string;
  durationHours?: number;
}

export interface QueryQuotasInput {
  page?: number;
  limit?: number;
  plan?: QuotaPlan;
  isBlocked?: string; // Will be transformed to boolean
}
