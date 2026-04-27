import { optionalAuth, requireAuth } from '@core/middlewares/auth.middleware';
import {
  extendHoldBodySchema,
  initExperienceCheckoutBodySchema,
  initExpertiseCheckoutBodySchema,
  processExperienceFreeCheckoutBodySchema,
  processExperiencePaymentBodySchema,
  processExpertiseFreeCheckoutBodySchema,
  processExpertisePaymentBodySchema,
  releaseHoldBodySchema,
  validateCouponBodySchema,
} from '@schemas/web';
import type { FastifyInstance } from 'fastify';
import {
  extendHold,
  initExperienceCheckout,
  initExpertiseCheckout,
  processExperienceFreeCheckout,
  processExperiencePayment,
  processExpertiseFreeCheckout,
  processExpertisePayment,
  releaseHold,
  validateCoupon,
} from '../../controllers/checkout';

/**
 * Web Checkout Routes - Guest Checkout Supported
 * Init routes use optionalAuth (guests can view checkout)
 * Payment routes use optionalAuth (user created if not exists)
 *
 * Experience Checkout:
 * POST /checkout/experience/init - Initialize checkout with slot hold (optionalAuth)
 * POST /checkout/experience/pay - Process payment (optionalAuth, creates user if needed)
 * POST /checkout/experience/free - Complete free checkout (optionalAuth)
 *
 * Expertise Checkout:
 * POST /checkout/expertise/init - Initialize checkout (optionalAuth)
 * POST /checkout/expertise/pay - Process payment (optionalAuth)
 * POST /checkout/expertise/free - Complete free checkout (optionalAuth)
 *
 * Coupon:
 * POST /checkout/validate-coupon - Validate coupon code (optionalAuth)
 *
 * Slot Hold Management:
 * POST /checkout/hold/release - Release slot hold (requireAuth)
 * POST /checkout/hold/extend - Extend slot hold (requireAuth)
 */
export async function webCheckoutRoutes(fastify: FastifyInstance) {
  // =========================================================================
  // Experience Checkout Routes
  // =========================================================================

  // Initialize experience checkout (creates slot hold if logged in)
  fastify.post(
    '/experience/init',
    {
      preHandler: [optionalAuth],
      schema: {
        body: initExperienceCheckoutBodySchema,
        tags: ['Web - Checkout'],
        summary: 'Initialize experience checkout',
        description:
          'Returns checkout data including experience details and pricing. Creates slot hold if user is logged in.',
      },
    },
    initExperienceCheckout,
  );

  // Process experience payment (optionalAuth - creates user if needed)
  fastify.post(
    '/experience/pay',
    {
      preHandler: [optionalAuth],
      schema: {
        body: processExperiencePaymentBodySchema,
        tags: ['Web - Checkout'],
        summary: 'Process experience payment',
        description:
          'Processes Stripe payment, creates booking, and confirms the slot hold. Creates user if guest checkout.',
      },
    },
    processExperiencePayment,
  );

  // Complete free experience checkout (optionalAuth - creates user if needed)
  fastify.post(
    '/experience/free',
    {
      preHandler: [optionalAuth],
      schema: {
        body: processExperienceFreeCheckoutBodySchema,
        tags: ['Web - Checkout'],
        summary: 'Process free experience checkout',
        description:
          'Creates a free booking without payment processing. Creates user if guest checkout.',
      },
    },
    processExperienceFreeCheckout,
  );

  // =========================================================================
  // Expertise Checkout Routes
  // =========================================================================

  // Initialize expertise checkout (no slot hold)
  fastify.post(
    '/expertise/init',
    {
      preHandler: [optionalAuth],
      schema: {
        body: initExpertiseCheckoutBodySchema,
        tags: ['Web - Checkout'],
        summary: 'Initialize expertise checkout',
        description:
          'Returns checkout data including expertise details, session info, and pricing. No slot hold needed.',
      },
    },
    initExpertiseCheckout,
  );

  // Process expertise payment (optionalAuth - creates user if needed)
  fastify.post(
    '/expertise/pay',
    {
      preHandler: [optionalAuth],
      schema: {
        body: processExpertisePaymentBodySchema,
        tags: ['Web - Checkout'],
        summary: 'Process expertise payment',
        description:
          'Processes Stripe payment and creates expertise booking. Creates user if guest checkout.',
      },
    },
    processExpertisePayment,
  );

  // Complete free expertise checkout (optionalAuth - creates user if needed)
  fastify.post(
    '/expertise/free',
    {
      preHandler: [optionalAuth],
      schema: {
        body: processExpertiseFreeCheckoutBodySchema,
        tags: ['Web - Checkout'],
        summary: 'Process free expertise checkout',
        description:
          'Creates a free expertise booking without payment processing. Creates user if guest checkout.',
      },
    },
    processExpertiseFreeCheckout,
  );

  // =========================================================================
  // Coupon Validation Route
  // =========================================================================

  fastify.post(
    '/validate-coupon',
    {
      preHandler: [optionalAuth],
      schema: {
        body: validateCouponBodySchema,
        tags: ['Web - Checkout'],
        summary: 'Validate coupon code',
        description: 'Validates a coupon code for a specific service and amount.',
      },
    },
    validateCoupon,
  );

  // =========================================================================
  // Slot Hold Management Routes
  // =========================================================================

  // Release slot hold
  fastify.post(
    '/hold/release',
    {
      preHandler: [requireAuth],
      schema: {
        body: releaseHoldBodySchema,
        tags: ['Web - Checkout'],
        summary: 'Release slot hold',
        description: 'Manually releases a slot hold when user abandons checkout.',
        security: [{ bearerAuth: [] }],
      },
    },
    releaseHold,
  );

  // Extend slot hold
  fastify.post(
    '/hold/extend',
    {
      preHandler: [requireAuth],
      schema: {
        body: extendHoldBodySchema,
        tags: ['Web - Checkout'],
        summary: 'Extend slot hold',
        description: 'Extends the hold expiry time by another 5 minutes.',
        security: [{ bearerAuth: [] }],
      },
    },
    extendHold,
  );
}
