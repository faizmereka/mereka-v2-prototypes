import {
  type AdminListPendingPaymentsQuery,
  adminPendingPaymentService,
} from '@core/services/admin/jobs';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * List all pending payments with filtering and pagination
 */
export async function listPendingPayments(
  request: FastifyRequest<{ Querystring: AdminListPendingPaymentsQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await adminPendingPaymentService.listPendingPayments(request.query);
    return reply.send({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing pending payments');
    return reply.status(500).send({
      success: false,
      error: { code: 'LIST_PENDING_PAYMENTS_ERROR', message: (error as Error).message },
    });
  }
}

/**
 * Get pending payment statistics
 */
export async function getPendingPaymentStats(request: FastifyRequest, reply: FastifyReply) {
  try {
    const stats = await adminPendingPaymentService.getPendingPaymentStats();
    return reply.send({
      success: true,
      data: stats,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting pending payment stats');
    return reply.status(500).send({
      success: false,
      error: { code: 'PENDING_PAYMENT_STATS_ERROR', message: (error as Error).message },
    });
  }
}

/**
 * Get pending payment by ID
 */
export async function getPendingPaymentById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const payment = await adminPendingPaymentService.getPendingPaymentById(request.params.id);
    return reply.send({
      success: true,
      data: payment,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage === 'Pending payment not found') {
      return reply.status(404).send({
        success: false,
        error: { code: 'PENDING_PAYMENT_NOT_FOUND', message: errorMessage },
      });
    }
    request.log.error({ error }, 'Error getting pending payment');
    return reply.status(500).send({
      success: false,
      error: { code: 'GET_PENDING_PAYMENT_ERROR', message: errorMessage },
    });
  }
}

/**
 * Retry a pending payment manually
 */
export async function retryPendingPayment(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const payment = await adminPendingPaymentService.retryPendingPayment(request.params.id);
    return reply.send({
      success: true,
      data: payment,
      message: 'Payment queued for retry',
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage === 'Pending payment not found') {
      return reply.status(404).send({
        success: false,
        error: { code: 'PENDING_PAYMENT_NOT_FOUND', message: errorMessage },
      });
    }
    if (errorMessage === 'Payment cannot be retried in current status') {
      return reply.status(400).send({
        success: false,
        error: { code: 'RETRY_NOT_ALLOWED', message: errorMessage },
      });
    }
    request.log.error({ error }, 'Error retrying pending payment');
    return reply.status(500).send({
      success: false,
      error: { code: 'RETRY_PENDING_PAYMENT_ERROR', message: errorMessage },
    });
  }
}

/**
 * Mark a pending payment as failed
 */
export async function markPendingPaymentFailed(
  request: FastifyRequest<{ Params: { id: string }; Body: { reason: string } }>,
  reply: FastifyReply,
) {
  try {
    const payment = await adminPendingPaymentService.markAsFailed(
      request.params.id,
      request.body.reason,
    );
    return reply.send({
      success: true,
      data: payment,
      message: 'Payment marked as failed',
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage === 'Pending payment not found') {
      return reply.status(404).send({
        success: false,
        error: { code: 'PENDING_PAYMENT_NOT_FOUND', message: errorMessage },
      });
    }
    request.log.error({ error }, 'Error marking pending payment as failed');
    return reply.status(500).send({
      success: false,
      error: { code: 'MARK_FAILED_ERROR', message: errorMessage },
    });
  }
}
