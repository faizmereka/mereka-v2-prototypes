import { PlanStatus } from '@core/models/Plan';

/**
 * Admin plan schemas - Native JSON Schema
 */

/**
 * Create plan schema (admin only)
 */
export const adminCreatePlanBodySchema = {
  body: {
    type: 'object',
    required: [
      'planCode',
      'name',
      'description',
      'tagline',
      'price',
      'stripePriceId',
      'stripeProductId',
    ],
    properties: {
      planCode: {
        type: 'string',
        minLength: 1,
        description: 'Unique plan code',
      },
      name: {
        type: 'string',
        minLength: 1,
        description: 'Plan name',
      },
      description: {
        type: 'string',
        minLength: 1,
        description: 'Plan description',
      },
      tagline: {
        type: 'string',
        minLength: 1,
        description: 'Short tagline for pricing page',
      },
      price: {
        type: 'number',
        minimum: 0,
        description: 'Price in cents (e.g., 9900 = $99.00)',
      },
      currency: {
        type: 'string',
        default: 'USD',
        description: 'Currency code',
      },
      stripePriceId: {
        type: 'string',
        minLength: 1,
        description: 'Stripe price ID',
      },
      stripeProductId: {
        type: 'string',
        minLength: 1,
        description: 'Stripe product ID',
      },
      features: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Feature list',
      },
      sortOrder: {
        type: 'number',
        description: 'Display order',
      },
    },
  },
} as const;

/**
 * Update plan schema (admin only)
 */
export const adminUpdatePlanBodySchema = {
  body: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Plan name',
      },
      description: {
        type: 'string',
        description: 'Plan description',
      },
      tagline: {
        type: 'string',
        description: 'Short tagline',
      },
      price: {
        type: 'number',
        minimum: 0,
        description: 'Price in cents',
      },
      currency: {
        type: 'string',
        description: 'Currency code',
      },
      stripePriceId: {
        type: 'string',
        description: 'Stripe price ID',
      },
      stripeProductId: {
        type: 'string',
        description: 'Stripe product ID',
      },
      features: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Feature list',
      },
      status: {
        type: 'string',
        enum: Object.values(PlanStatus),
        description: 'Plan status',
      },
      sortOrder: {
        type: 'number',
        description: 'Display order',
      },
    },
  },
} as const;

/**
 * Plan code params schema
 */
export const adminPlanCodeParamsSchema = {
  params: {
    type: 'object',
    required: ['planCode'],
    properties: {
      planCode: {
        type: 'string',
        minLength: 1,
        description: 'Plan code',
      },
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface AdminCreatePlanInput {
  planCode: string;
  name: string;
  description: string;
  tagline: string;
  price: number;
  currency?: string;
  stripePriceId: string;
  stripeProductId: string;
  features?: string[];
  sortOrder?: number;
}

export interface AdminUpdatePlanInput {
  name?: string;
  description?: string;
  tagline?: string;
  price?: number;
  currency?: string;
  stripePriceId?: string;
  stripeProductId?: string;
  features?: string[];
  status?: PlanStatus;
  sortOrder?: number;
}

export interface AdminPlanCodeParams {
  planCode: string;
}
