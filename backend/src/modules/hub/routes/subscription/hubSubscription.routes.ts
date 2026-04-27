import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  hubCreateCheckoutSessionBodySchema,
  hubVerifySessionQuerySchema,
} from '@core/schemas/hub/settings';
import type { FastifyInstance } from 'fastify';
import {
  createCheckoutSession,
  getMySubscriptions,
  getPlans,
  handleStripeWebhook,
  verifyCheckoutSession,
} from '../../controllers/subscription/hubSubscription.controller';

/**
 * Hub Subscription routes
 */
export async function hubSubscriptionRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Get available plans (public)
   */
  fastify.get('/plans', {
    schema: {
      tags: ['Hub Subscription'],
      summary: 'Get available plans',
      description: 'Get all active subscription plans',
    },
    handler: getPlans,
  });

  /**
   * Create checkout session
   */
  fastify.post('/create-checkout-session', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Subscription'],
      summary: 'Create Stripe checkout session',
      description: 'Create a Stripe checkout session for hub subscription',
      body: hubCreateCheckoutSessionBodySchema,
      security: [{ bearerAuth: [] }],
    },
    handler: createCheckoutSession,
  });

  /**
   * Verify checkout session
   */
  fastify.get('/verify-session', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Subscription'],
      summary: 'Verify checkout session',
      description: 'Verify checkout session and get subscription details',
      querystring: hubVerifySessionQuerySchema,
      security: [{ bearerAuth: [] }],
    },
    handler: verifyCheckoutSession,
  });

  /**
   * Get my subscriptions
   */
  fastify.get('/me', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Subscription'],
      summary: 'Get my subscriptions',
      description: 'Get current user subscriptions',
      security: [{ bearerAuth: [] }],
    },
    handler: getMySubscriptions,
  });
}

/**
 * Webhook routes (separate from main subscription routes)
 * Endpoint: POST /api/v1/webhook
 *
 * Multi-Region Support:
 * - POST /api/v1/webhook?region=malaysia → Uses MY Stripe webhook secret
 * - POST /api/v1/webhook?region=atlas → Uses Atlas/global Stripe webhook secret
 * - POST /api/v1/webhook (no region) → Defaults to Atlas (backward compatible)
 *
 * Stripe Dashboard Setup:
 * 1. Malaysia account webhook: https://api.mereka.io/api/v1/webhook?region=malaysia
 * 2. Atlas account webhook: https://api.mereka.io/api/v1/webhook?region=atlas
 *
 * Required Stripe Events:
 *
 * Subscription Events:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - checkout.session.completed
 *
 * Payment Events (for Transaction status sync):
 * - payment_intent.succeeded
 * - payment_intent.payment_failed
 * - charge.refunded
 *
 * Transfer Events (for Connect payouts):
 * - transfer.created
 * - transfer.reversed
 *
 * Payout Events (for withdrawal tracking - logged only, data fetched from Stripe):
 * - payout.paid
 * - payout.failed
 */
export async function hubWebhookRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/', {
    schema: {
      tags: ['Webhook'],
      summary: 'Stripe webhook',
      description:
        'Handle Stripe webhook events. Use ?region=malaysia or ?region=atlas to specify which Stripe account.',
      hide: true,
      querystring: {
        type: 'object',
        properties: {
          region: {
            type: 'string',
            enum: ['malaysia', 'atlas'],
            description: 'Stripe region for webhook verification (defaults to atlas)',
          },
        },
      },
    },
    handler: handleStripeWebhook,
  });
}
