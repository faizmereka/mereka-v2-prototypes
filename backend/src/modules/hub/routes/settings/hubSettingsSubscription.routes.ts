import {
  cancelSubscriptionHandler,
  changePlanHandler,
  createSetupIntentHandler,
  deletePaymentMethodHandler,
  getHubSubscriptionSettingsHandler,
  getInvoiceDownloadHandler,
  getInvoicesHandler,
  getPaymentMethodsHandler,
  getTrialInfoHandler,
  getUpcomingPaymentHandler,
  previewPlanChangeHandler,
  reactivateSubscriptionHandler,
  setDefaultPaymentMethodHandler,
} from '@controllers/hub';
import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  hubChangePlanBodySchema,
  hubDeletePaymentMethodParamsSchema,
  hubGetInvoiceDownloadParamsSchema,
  hubGetInvoicesQuerySchema,
  hubPreviewPlanChangeBodySchema,
  hubSetDefaultPaymentMethodBodySchema,
} from '@core/schemas/hub/settings';
import type { FastifyInstance } from 'fastify';

/**
 * Hub Settings Subscription routes
 * Endpoints for managing hub subscription from settings page
 * Base path: /hub/:hubId/settings/subscription
 */
export async function hubSettingsSubscriptionRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Get hub subscription settings (current plan + available plans)
   */
  fastify.get('/', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Settings'],
      summary: 'Get hub subscription settings',
      description: 'Get current subscription info and available plans',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: {
            type: 'string',
            description: 'Hub ID',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    handler: getHubSubscriptionSettingsHandler,
  });

  /**
   * Preview plan change (get proration details)
   */
  fastify.post('/preview', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Settings'],
      summary: 'Preview plan change',
      description: 'Get proration details before changing plan',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: {
            type: 'string',
            description: 'Hub ID',
          },
        },
      },
      body: hubPreviewPlanChangeBodySchema.body,
      security: [{ bearerAuth: [] }],
    },
    handler: previewPlanChangeHandler,
  });

  /**
   * Change plan
   */
  fastify.post('/change-plan', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Settings'],
      summary: 'Change subscription plan',
      description: 'Upgrade or downgrade subscription plan',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: {
            type: 'string',
            description: 'Hub ID',
          },
        },
      },
      body: hubChangePlanBodySchema.body,
      security: [{ bearerAuth: [] }],
    },
    handler: changePlanHandler,
  });

  /**
   * Cancel subscription
   */
  fastify.post('/cancel', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Settings'],
      summary: 'Cancel subscription',
      description: 'Cancel subscription at end of billing period',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: {
            type: 'string',
            description: 'Hub ID',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    handler: cancelSubscriptionHandler,
  });

  /**
   * Reactivate subscription
   */
  fastify.post('/reactivate', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Settings'],
      summary: 'Reactivate subscription',
      description: 'Reactivate a subscription that was scheduled for cancellation',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: {
            type: 'string',
            description: 'Hub ID',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    handler: reactivateSubscriptionHandler,
  });

  // ============================================================================
  // Payment Methods
  // ============================================================================

  /**
   * Get payment methods
   */
  fastify.get('/payment-methods', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Settings'],
      summary: 'Get payment methods',
      description: 'Get all payment methods for the hub subscription',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: { type: 'string', description: 'Hub ID' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    handler: getPaymentMethodsHandler,
  });

  /**
   * Create setup intent for adding payment method
   */
  fastify.post('/payment-methods/setup-intent', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Settings'],
      summary: 'Create setup intent',
      description: 'Create a Stripe SetupIntent for adding a new payment method',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: { type: 'string', description: 'Hub ID' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    handler: createSetupIntentHandler,
  });

  /**
   * Set default payment method
   */
  fastify.post('/payment-methods/set-default', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Settings'],
      summary: 'Set default payment method',
      description: 'Set a payment method as the default for future invoices',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: { type: 'string', description: 'Hub ID' },
        },
      },
      body: hubSetDefaultPaymentMethodBodySchema.body,
      security: [{ bearerAuth: [] }],
    },
    handler: setDefaultPaymentMethodHandler,
  });

  /**
   * Delete payment method
   */
  fastify.delete('/payment-methods/:paymentMethodId', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Settings'],
      summary: 'Delete payment method',
      description: 'Remove a payment method from the hub',
      params: hubDeletePaymentMethodParamsSchema,
      security: [{ bearerAuth: [] }],
    },
    handler: deletePaymentMethodHandler,
  });

  // ============================================================================
  // Invoices
  // ============================================================================

  /**
   * Get invoices
   */
  fastify.get('/invoices', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Settings'],
      summary: 'Get invoices',
      description: 'Get invoice history for the hub subscription',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: { type: 'string', description: 'Hub ID' },
        },
      },
      querystring: hubGetInvoicesQuerySchema,
      security: [{ bearerAuth: [] }],
    },
    handler: getInvoicesHandler,
  });

  /**
   * Get invoice download URL
   */
  fastify.get('/invoices/:invoiceId/download', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Settings'],
      summary: 'Get invoice download URL',
      description: 'Get PDF download URL for an invoice',
      params: hubGetInvoiceDownloadParamsSchema,
      security: [{ bearerAuth: [] }],
    },
    handler: getInvoiceDownloadHandler,
  });

  // ============================================================================
  // Upcoming Payment & Trial Info
  // ============================================================================

  /**
   * Get upcoming payment
   */
  fastify.get('/upcoming-payment', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Settings'],
      summary: 'Get upcoming payment',
      description: 'Get details of the next scheduled payment',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: { type: 'string', description: 'Hub ID' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    handler: getUpcomingPaymentHandler,
  });

  /**
   * Get trial info
   */
  fastify.get('/trial-info', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Settings'],
      summary: 'Get trial info',
      description: 'Get trial period information for the subscription',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: { type: 'string', description: 'Hub ID' },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    handler: getTrialInfoHandler,
  });
}
