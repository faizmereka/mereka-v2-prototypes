import type {
  HubChangePlanInput,
  HubDeletePaymentMethodParams,
  HubGetInvoiceDownloadParams,
  HubGetInvoicesQuery,
  HubPreviewPlanChangeInput,
  HubSetDefaultPaymentMethodInput,
} from '@core/schemas/hub/settings';
import {
  cancelSubscription,
  changePlan,
  createPaymentMethodSetupIntent,
  deletePaymentMethod,
  getHubSubscriptionSettings,
  getInvoiceDownloadUrl,
  getInvoices,
  getPaymentMethods,
  getTrialInfo,
  getUpcomingPayment,
  previewPlanChange,
  reactivateSubscription,
  setDefaultPaymentMethod,
} from '@core/services/hub/settings';
import { getUserId } from '@core/utils/auth-helpers';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get hub subscription settings
 */
export async function getHubSubscriptionSettingsHandler(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { hubId } = request.params;

    const data = await getHubSubscriptionSettings(userId, hubId);

    return reply.send({
      success: true,
      data,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get hub subscription settings');

    if (error instanceof Error) {
      if (error.message === 'Hub not found or access denied') {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'HUB_NOT_FOUND',
            message: error.message,
          },
        });
      }
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_SUBSCRIPTION_SETTINGS_FAILED',
        message: 'Failed to get subscription settings',
      },
    });
  }
}

/**
 * Preview plan change
 */
export async function previewPlanChangeHandler(
  request: FastifyRequest<{
    Params: { hubId: string };
    Body: HubPreviewPlanChangeInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { hubId } = request.params;
    const { newPlanCode } = request.body;

    const preview = await previewPlanChange(userId, hubId, newPlanCode);

    return reply.send({
      success: true,
      data: preview,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to preview plan change');

    if (error instanceof Error) {
      if (error.message === 'Hub not found or access denied') {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'HUB_NOT_FOUND',
            message: error.message,
          },
        });
      }

      if (error.message === 'No active subscription found' || error.message === 'Plan not found') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: error.message,
          },
        });
      }

      if (error.message === 'Already on this plan') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'SAME_PLAN',
            message: error.message,
          },
        });
      }
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'PREVIEW_PLAN_CHANGE_FAILED',
        message: 'Failed to preview plan change',
      },
    });
  }
}

/**
 * Change plan
 */
export async function changePlanHandler(
  request: FastifyRequest<{
    Params: { hubId: string };
    Body: HubChangePlanInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { hubId } = request.params;

    const result = await changePlan(userId, hubId, request.body);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to change plan');

    if (error instanceof Error) {
      if (error.message === 'Hub not found or access denied') {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'HUB_NOT_FOUND',
            message: error.message,
          },
        });
      }

      if (error.message === 'No active subscription found' || error.message === 'Plan not found') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: error.message,
          },
        });
      }

      if (error.message === 'Already on this plan') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'SAME_PLAN',
            message: error.message,
          },
        });
      }
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'CHANGE_PLAN_FAILED',
        message: 'Failed to change plan',
      },
    });
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscriptionHandler(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { hubId } = request.params;

    const result = await cancelSubscription(userId, hubId);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to cancel subscription');

    if (error instanceof Error) {
      if (error.message === 'Hub not found or access denied') {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'HUB_NOT_FOUND',
            message: error.message,
          },
        });
      }

      if (error.message === 'No active subscription found') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'NO_SUBSCRIPTION',
            message: error.message,
          },
        });
      }
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'CANCEL_SUBSCRIPTION_FAILED',
        message: 'Failed to cancel subscription',
      },
    });
  }
}

/**
 * Reactivate subscription
 */
export async function reactivateSubscriptionHandler(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { hubId } = request.params;

    const result = await reactivateSubscription(userId, hubId);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to reactivate subscription');

    if (error instanceof Error) {
      if (error.message === 'Hub not found or access denied') {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'HUB_NOT_FOUND',
            message: error.message,
          },
        });
      }

      if (error.message === 'No active subscription found') {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'NO_SUBSCRIPTION',
            message: error.message,
          },
        });
      }
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'REACTIVATE_SUBSCRIPTION_FAILED',
        message: 'Failed to reactivate subscription',
      },
    });
  }
}

// ============================================================================
// Payment Methods
// ============================================================================

/**
 * Get payment methods
 */
export async function getPaymentMethodsHandler(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { hubId } = request.params;

    const result = await getPaymentMethods(userId, hubId);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get payment methods');

    if (error instanceof Error && error.message === 'Hub not found or access denied') {
      return reply.status(404).send({
        success: false,
        error: { code: 'HUB_NOT_FOUND', message: error.message },
      });
    }

    return reply.status(500).send({
      success: false,
      error: { code: 'GET_PAYMENT_METHODS_FAILED', message: 'Failed to get payment methods' },
    });
  }
}

/**
 * Create setup intent for adding payment method
 */
export async function createSetupIntentHandler(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { hubId } = request.params;

    const result = await createPaymentMethodSetupIntent(userId, hubId);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to create setup intent');

    if (error instanceof Error && error.message === 'Hub not found or access denied') {
      return reply.status(404).send({
        success: false,
        error: { code: 'HUB_NOT_FOUND', message: error.message },
      });
    }

    return reply.status(500).send({
      success: false,
      error: { code: 'CREATE_SETUP_INTENT_FAILED', message: 'Failed to create setup intent' },
    });
  }
}

/**
 * Set default payment method
 */
export async function setDefaultPaymentMethodHandler(
  request: FastifyRequest<{
    Params: { hubId: string };
    Body: HubSetDefaultPaymentMethodInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { hubId } = request.params;
    const { paymentMethodId } = request.body;

    const result = await setDefaultPaymentMethod(userId, hubId, paymentMethodId);

    return reply.send({
      success: true,
      data: result,
      message: 'Default payment method updated',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to set default payment method');

    if (error instanceof Error) {
      if (error.message === 'Hub not found or access denied') {
        return reply.status(404).send({
          success: false,
          error: { code: 'HUB_NOT_FOUND', message: error.message },
        });
      }
      if (error.message === 'Payment method not found') {
        return reply.status(404).send({
          success: false,
          error: { code: 'PAYMENT_METHOD_NOT_FOUND', message: error.message },
        });
      }
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'SET_DEFAULT_PAYMENT_METHOD_FAILED',
        message: 'Failed to set default payment method',
      },
    });
  }
}

/**
 * Delete payment method
 */
export async function deletePaymentMethodHandler(
  request: FastifyRequest<{
    Params: HubDeletePaymentMethodParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { hubId, paymentMethodId } = request.params;

    const result = await deletePaymentMethod(userId, hubId, paymentMethodId);

    return reply.send({
      success: true,
      data: result,
      message: 'Payment method deleted',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to delete payment method');

    if (error instanceof Error) {
      if (error.message === 'Hub not found or access denied') {
        return reply.status(404).send({
          success: false,
          error: { code: 'HUB_NOT_FOUND', message: error.message },
        });
      }
      if (error.message === 'Payment method not found') {
        return reply.status(404).send({
          success: false,
          error: { code: 'PAYMENT_METHOD_NOT_FOUND', message: error.message },
        });
      }
      if (error.message === 'Cannot delete the only payment method') {
        return reply.status(400).send({
          success: false,
          error: { code: 'CANNOT_DELETE_ONLY_PAYMENT_METHOD', message: error.message },
        });
      }
    }

    return reply.status(500).send({
      success: false,
      error: { code: 'DELETE_PAYMENT_METHOD_FAILED', message: 'Failed to delete payment method' },
    });
  }
}

// ============================================================================
// Invoices
// ============================================================================

/**
 * Get invoices
 */
export async function getInvoicesHandler(
  request: FastifyRequest<{
    Params: { hubId: string };
    Querystring: HubGetInvoicesQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { hubId } = request.params;
    const { limit, startingAfter } = request.query;

    const result = await getInvoices(userId, hubId, { limit, startingAfter });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get invoices');

    if (error instanceof Error && error.message === 'Hub not found or access denied') {
      return reply.status(404).send({
        success: false,
        error: { code: 'HUB_NOT_FOUND', message: error.message },
      });
    }

    return reply.status(500).send({
      success: false,
      error: { code: 'GET_INVOICES_FAILED', message: 'Failed to get invoices' },
    });
  }
}

/**
 * Get invoice download URL
 */
export async function getInvoiceDownloadHandler(
  request: FastifyRequest<{
    Params: HubGetInvoiceDownloadParams;
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { hubId, invoiceId } = request.params;

    const result = await getInvoiceDownloadUrl(userId, hubId, invoiceId);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get invoice download URL');

    if (error instanceof Error) {
      if (error.message === 'Hub not found or access denied') {
        return reply.status(404).send({
          success: false,
          error: { code: 'HUB_NOT_FOUND', message: error.message },
        });
      }
      if (error.message === 'Invoice not found' || error.message === 'Invoice PDF not available') {
        return reply.status(404).send({
          success: false,
          error: { code: 'INVOICE_NOT_FOUND', message: error.message },
        });
      }
    }

    return reply.status(500).send({
      success: false,
      error: { code: 'GET_INVOICE_DOWNLOAD_FAILED', message: 'Failed to get invoice download URL' },
    });
  }
}

// ============================================================================
// Upcoming Payment & Trial Info
// ============================================================================

/**
 * Get upcoming payment
 */
export async function getUpcomingPaymentHandler(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { hubId } = request.params;

    const upcomingPayment = await getUpcomingPayment(userId, hubId);

    return reply.send({
      success: true,
      data: { upcomingPayment },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get upcoming payment');

    if (error instanceof Error && error.message === 'Hub not found or access denied') {
      return reply.status(404).send({
        success: false,
        error: { code: 'HUB_NOT_FOUND', message: error.message },
      });
    }

    return reply.status(500).send({
      success: false,
      error: { code: 'GET_UPCOMING_PAYMENT_FAILED', message: 'Failed to get upcoming payment' },
    });
  }
}

/**
 * Get trial info
 */
export async function getTrialInfoHandler(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { hubId } = request.params;

    const trialInfo = await getTrialInfo(userId, hubId);

    return reply.send({
      success: true,
      data: { trialInfo },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get trial info');

    if (error instanceof Error && error.message === 'Hub not found or access denied') {
      return reply.status(404).send({
        success: false,
        error: { code: 'HUB_NOT_FOUND', message: error.message },
      });
    }

    return reply.status(500).send({
      success: false,
      error: { code: 'GET_TRIAL_INFO_FAILED', message: 'Failed to get trial info' },
    });
  }
}
