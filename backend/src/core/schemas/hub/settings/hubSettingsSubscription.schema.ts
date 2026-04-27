/**
 * Hub Settings Subscription Schema
 * Schema for managing hub subscription from settings page
 */

// ============================================================================
// Checkout Session Schemas
// ============================================================================

/**
 * Create Checkout Session schema
 */
export const hubCreateCheckoutSessionBodySchema = {
  type: 'object',
  required: ['planCode', 'successUrl', 'cancelUrl'],
  properties: {
    planCode: {
      type: 'string',
      enum: ['scale', 'soar'],
      description: 'Plan code',
    },
    successUrl: {
      type: 'string',
      minLength: 1,
      description: 'Success URL (may contain Stripe template variables like {CHECKOUT_SESSION_ID})',
    },
    cancelUrl: {
      type: 'string',
      minLength: 1,
      description: 'Cancel URL',
    },
    hubId: {
      type: 'string',
      description: 'Hub ID (optional)',
    },
    promoCode: {
      type: 'string',
      description: 'Promo code (optional)',
    },
  },
} as const;

/**
 * Verify Session query schema
 */
export const hubVerifySessionQuerySchema = {
  type: 'object',
  required: ['sessionId'],
  properties: {
    sessionId: {
      type: 'string',
      minLength: 1,
      description: 'Session ID',
    },
    forceCreate: {
      type: 'string',
      enum: ['true', 'false'],
      description: 'Force create subscription from Stripe if not found in DB (skip polling)',
    },
  },
} as const;

// ============================================================================
// Plan Management Schemas
// ============================================================================

/**
 * Change plan request schema
 */
export const hubChangePlanBodySchema = {
  body: {
    type: 'object',
    required: ['newPlanCode'],
    properties: {
      newPlanCode: {
        type: 'string',
        enum: ['scale', 'soar'],
        description: 'New plan code to switch to',
      },
    },
  },
} as const;

/**
 * Preview plan change request schema
 */
export const hubPreviewPlanChangeBodySchema = {
  body: {
    type: 'object',
    required: ['newPlanCode'],
    properties: {
      newPlanCode: {
        type: 'string',
        enum: ['scale', 'soar'],
        description: 'Plan code to preview',
      },
    },
  },
} as const;

/**
 * Set default payment method schema
 */
export const hubSetDefaultPaymentMethodBodySchema = {
  body: {
    type: 'object',
    required: ['paymentMethodId'],
    properties: {
      paymentMethodId: {
        type: 'string',
        description: 'Stripe payment method ID',
      },
    },
  },
} as const;

/**
 * Delete payment method params schema
 */
export const hubDeletePaymentMethodParamsSchema = {
  type: 'object',
  required: ['hubId', 'paymentMethodId'],
  properties: {
    hubId: {
      type: 'string',
      description: 'Hub ID',
    },
    paymentMethodId: {
      type: 'string',
      description: 'Payment method ID to delete',
    },
  },
} as const;

/**
 * Get invoices query schema
 */
export const hubGetInvoicesQuerySchema = {
  type: 'object',
  properties: {
    limit: {
      type: 'number',
      minimum: 1,
      maximum: 100,
      default: 10,
      description: 'Number of invoices to return',
    },
    startingAfter: {
      type: 'string',
      description: 'Cursor for pagination (invoice ID)',
    },
  },
} as const;

/**
 * Get invoice download params schema
 */
export const hubGetInvoiceDownloadParamsSchema = {
  type: 'object',
  required: ['hubId', 'invoiceId'],
  properties: {
    hubId: {
      type: 'string',
      description: 'Hub ID',
    },
    invoiceId: {
      type: 'string',
      description: 'Invoice ID',
    },
  },
} as const;

/**
 * TypeScript interfaces
 */
export interface HubChangePlanInput {
  newPlanCode: 'scale' | 'soar';
}

export interface HubPreviewPlanChangeInput {
  newPlanCode: 'scale' | 'soar';
}

export interface HubSetDefaultPaymentMethodInput {
  paymentMethodId: string;
}

export interface HubDeletePaymentMethodParams {
  hubId: string;
  paymentMethodId: string;
}

export interface HubGetInvoicesQuery {
  limit?: number;
  startingAfter?: string;
}

export interface HubGetInvoiceDownloadParams {
  hubId: string;
  invoiceId: string;
}

export interface HubCreateCheckoutSessionInput {
  planCode: 'scale' | 'soar';
  successUrl: string;
  cancelUrl: string;
  hubId?: string;
  promoCode?: string;
}

export interface HubVerifySessionQuery {
  sessionId: string;
  forceCreate?: 'true' | 'false';
}
