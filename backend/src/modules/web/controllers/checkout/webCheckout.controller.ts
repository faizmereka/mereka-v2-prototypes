import type {
  InitExperienceCheckoutInput,
  InitExpertiseCheckoutInput,
  ProcessExperiencePaymentInput,
  ProcessExpertisePaymentInput,
  ValidateCouponInput,
} from '@schemas/web';
import { webCheckoutService } from '@services/web';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Experience Checkout Controllers
// ============================================================================

/**
 * Initialize experience checkout
 * POST /checkout/experience/init
 *
 * Returns checkout data including experience details and pricing.
 * Creates slot hold if user is logged in, otherwise returns data without hold.
 * Supports guest checkout.
 */
export async function initExperienceCheckout(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as InitExperienceCheckoutInput;
  const { experienceSlug, eventId, tickets } = body;

  // Get user ID if logged in (optional for guest checkout)
  const userId = (request.user as { id?: string } | undefined)?.id;

  try {
    const result = await webCheckoutService.initializeExperienceCheckout({
      experienceSlug,
      eventId,
      tickets,
      userId, // Can be undefined for guest checkout
    });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    request.log.error({ error, experienceSlug, eventId }, 'Error initializing experience checkout');

    // Handle specific error codes
    if (errorMessage.includes('EXPERIENCE_NOT_FOUND')) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERIENCE_NOT_FOUND',
          message: 'Experience not found or is not available',
        },
      });
    }

    if (errorMessage.includes('EVENT_NOT_FOUND')) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EVENT_NOT_FOUND',
          message: 'Selected time slot is not available',
        },
      });
    }

    if (errorMessage.includes('INSUFFICIENT_CAPACITY')) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_CAPACITY',
          message: errorMessage.replace('INSUFFICIENT_CAPACITY: ', ''),
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'CHECKOUT_INIT_ERROR',
        message: 'Failed to initialize checkout',
      },
    });
  }
}

/**
 * Process experience payment
 * POST /checkout/experience/pay
 *
 * Processes Stripe payment, creates booking, and confirms the slot hold.
 * Supports guest checkout - creates user from primary learner if not logged in.
 */
export async function processExperiencePayment(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as ProcessExperiencePaymentInput;
  const { holdId, paymentMethodId, paymentIntentId, learners, questionnaire, couponCode } = body;

  // Get user ID if logged in (optional for guest checkout)
  const userId = (request.user as { id?: string } | undefined)?.id;

  try {
    const result = await webCheckoutService.processExperiencePayment({
      holdId,
      paymentMethodId,
      paymentIntentId, // New Payment Element flow
      learners,
      questionnaire: questionnaire as Record<string, unknown>[] | undefined,
      couponCode,
      userId, // Can be undefined for guest checkout - service will create user
    });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    request.log.error({ error, holdId }, 'Error processing experience payment');

    if (errorMessage.includes('HOLD_EXPIRED')) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'HOLD_EXPIRED',
          message: 'Your slot reservation has expired. Please try again.',
        },
      });
    }

    if (errorMessage.includes('PAYMENT_FAILED')) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'PAYMENT_FAILED',
          message: errorMessage.replace('PAYMENT_FAILED: ', ''),
        },
      });
    }

    if (errorMessage.includes('INVALID_COUPON')) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_COUPON',
          message: errorMessage.replace('INVALID_COUPON: ', ''),
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'PAYMENT_ERROR',
        message: 'Failed to process payment',
      },
    });
  }
}

/**
 * Process free experience checkout
 * POST /checkout/experience/free
 *
 * Creates a free booking without payment processing.
 * Supports guest checkout - creates user from primary learner if not logged in.
 */
export async function processExperienceFreeCheckout(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as Omit<ProcessExperiencePaymentInput, 'paymentMethodId'>;
  const { holdId, learners, questionnaire, couponCode } = body;

  // Get user ID if logged in (optional for guest checkout)
  const userId = (request.user as { id?: string } | undefined)?.id;

  try {
    // Use empty string for paymentMethodId to indicate free checkout
    const result = await webCheckoutService.processExperiencePayment({
      holdId,
      paymentMethodId: '', // No payment method for free checkout
      learners,
      questionnaire: questionnaire as Record<string, unknown>[] | undefined,
      couponCode,
      userId, // Can be undefined for guest checkout - service will create user
    });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    request.log.error({ error, holdId }, 'Error processing free experience checkout');

    if (errorMessage.includes('HOLD_EXPIRED')) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'HOLD_EXPIRED',
          message: 'Your slot reservation has expired. Please try again.',
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'CHECKOUT_ERROR',
        message: 'Failed to complete checkout',
      },
    });
  }
}

// ============================================================================
// Expertise Checkout Controllers
// ============================================================================

/**
 * Initialize expertise checkout
 * POST /checkout/expertise/init
 *
 * Returns checkout data including expertise details, session info, and pricing.
 * No slot hold is created for expertise (flexible scheduling).
 * Supports guest checkout.
 */
export async function initExpertiseCheckout(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as InitExpertiseCheckoutInput;
  const { expertiseSlug, ticketId, date, time } = body;

  // userId is optional for guest checkout - not used for init
  // const userId = (request.user as { id?: string } | undefined)?.id;

  try {
    const result = await webCheckoutService.initializeExpertiseCheckout({
      expertiseSlug,
      ticketId,
      date,
      time,
    });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    request.log.error({ error, expertiseSlug }, 'Error initializing expertise checkout');

    if (errorMessage.includes('EXPERTISE_NOT_FOUND')) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERTISE_NOT_FOUND',
          message: 'Expertise not found or is not available',
        },
      });
    }

    if (errorMessage.includes('TICKET_NOT_FOUND')) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'TICKET_NOT_FOUND',
          message: 'Selected ticket is not available',
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'CHECKOUT_INIT_ERROR',
        message: 'Failed to initialize checkout',
      },
    });
  }
}

/**
 * Process expertise payment
 * POST /checkout/expertise/pay
 *
 * Processes Stripe payment and creates expertise booking.
 * Supports guest checkout - creates user from learner if not logged in.
 */
export async function processExpertisePayment(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as ProcessExpertisePaymentInput;
  const { expertiseId, ticketId, date, time, paymentMethodId, learner, questionnaire, couponCode } =
    body;

  // Get user ID if logged in (optional for guest checkout)
  const userId = (request.user as { id?: string } | undefined)?.id;

  try {
    const result = await webCheckoutService.processExpertisePayment({
      expertiseId,
      ticketId,
      date,
      time,
      paymentMethodId,
      learner,
      questionnaire: questionnaire as Record<string, unknown>[] | undefined,
      couponCode,
      userId, // Can be undefined for guest checkout - service will create user
    });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    request.log.error({ error, expertiseId }, 'Error processing expertise payment');

    if (errorMessage.includes('PAYMENT_FAILED')) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'PAYMENT_FAILED',
          message: errorMessage.replace('PAYMENT_FAILED: ', ''),
        },
      });
    }

    if (errorMessage.includes('INVALID_COUPON')) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_COUPON',
          message: errorMessage.replace('INVALID_COUPON: ', ''),
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'PAYMENT_ERROR',
        message: 'Failed to process payment',
      },
    });
  }
}

/**
 * Process free expertise checkout
 * POST /checkout/expertise/free
 * Supports guest checkout - creates user from learner if not logged in.
 */
export async function processExpertiseFreeCheckout(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as Omit<ProcessExpertisePaymentInput, 'paymentMethodId'>;
  const { expertiseId, ticketId, date, time, learner, questionnaire, couponCode } = body;

  // Get user ID if logged in (optional for guest checkout)
  const userId = (request.user as { id?: string } | undefined)?.id;

  try {
    const result = await webCheckoutService.processExpertisePayment({
      expertiseId,
      ticketId,
      date,
      time,
      paymentMethodId: '', // No payment method for free checkout
      learner,
      questionnaire: questionnaire as Record<string, unknown>[] | undefined,
      couponCode,
      userId, // Can be undefined for guest checkout - service will create user
    });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, expertiseId }, 'Error processing free expertise checkout');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'CHECKOUT_ERROR',
        message: 'Failed to complete checkout',
      },
    });
  }
}

// ============================================================================
// Coupon Validation Controller
// ============================================================================

/**
 * Validate coupon code
 * POST /checkout/validate-coupon
 *
 * Validates a coupon code for a specific service and amount.
 * Supports guest checkout - per-user limits are not checked for guests.
 */
export async function validateCoupon(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as ValidateCouponInput;
  const { code, serviceType, serviceId, amount } = body;

  // Get user ID if logged in (optional for guest checkout)
  const userId = (request.user as { id?: string } | undefined)?.id || '';

  try {
    const result = await webCheckoutService.validateCoupon(
      code,
      serviceType,
      serviceId,
      userId, // Empty string for guest - per-user limits won't be checked
      amount,
    );

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, code }, 'Error validating coupon');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Failed to validate coupon',
      },
    });
  }
}

// ============================================================================
// Slot Hold Management Controllers
// ============================================================================

/**
 * Release slot hold
 * POST /checkout/hold/release
 *
 * Manually releases a slot hold when user abandons checkout.
 */
export async function releaseHold(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { holdId: string };
  const { holdId } = body;

  const userId = (request.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  try {
    await webCheckoutService.releaseHold(holdId, userId);

    return reply.send({
      success: true,
      data: {
        success: true,
        message: 'Hold released successfully',
      },
    });
  } catch (error) {
    request.log.error({ error, holdId }, 'Error releasing hold');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'RELEASE_ERROR',
        message: 'Failed to release hold',
      },
    });
  }
}

/**
 * Extend slot hold
 * POST /checkout/hold/extend
 *
 * Extends the hold expiry time by another 5 minutes.
 */
export async function extendHold(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as { holdId: string };
  const { holdId } = body;

  const userId = (request.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  try {
    const result = await webCheckoutService.extendHold(holdId, userId);

    if (!result) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'HOLD_NOT_FOUND',
          message: 'Hold not found or has expired',
        },
      });
    }

    return reply.send({
      success: true,
      data: {
        success: true,
        expiresAt: result.expiresAt,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    request.log.error({ error, holdId }, 'Error extending hold');

    if (errorMessage.includes('HOLD_NOT_FOUND')) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'HOLD_NOT_FOUND',
          message: 'Hold not found or has expired',
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'EXTEND_ERROR',
        message: 'Failed to extend hold',
      },
    });
  }
}
