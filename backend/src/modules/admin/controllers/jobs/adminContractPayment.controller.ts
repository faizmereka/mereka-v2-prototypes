import {
  type AdminListContractPaymentsQuery,
  adminContractPaymentService,
} from '@core/services/admin/jobs';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * List all contract payments with filtering and pagination
 */
export async function listContractPayments(
  request: FastifyRequest<{ Querystring: AdminListContractPaymentsQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await adminContractPaymentService.listContractPayments(request.query);
    return reply.send({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing contract payments');
    return reply.status(500).send({
      success: false,
      error: { code: 'LIST_CONTRACT_PAYMENTS_ERROR', message: (error as Error).message },
    });
  }
}

/**
 * Get contract payment statistics
 */
export async function getContractPaymentStats(request: FastifyRequest, reply: FastifyReply) {
  try {
    const stats = await adminContractPaymentService.getContractPaymentStats();
    return reply.send({
      success: true,
      data: stats,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting contract payment stats');
    return reply.status(500).send({
      success: false,
      error: { code: 'CONTRACT_PAYMENT_STATS_ERROR', message: (error as Error).message },
    });
  }
}

/**
 * Get contract payment by ID
 */
export async function getContractPaymentById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const payment = await adminContractPaymentService.getContractPaymentById(request.params.id);
    return reply.send({
      success: true,
      data: payment,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage === 'Contract payment not found') {
      return reply.status(404).send({
        success: false,
        error: { code: 'CONTRACT_PAYMENT_NOT_FOUND', message: errorMessage },
      });
    }
    request.log.error({ error }, 'Error getting contract payment');
    return reply.status(500).send({
      success: false,
      error: { code: 'GET_CONTRACT_PAYMENT_ERROR', message: errorMessage },
    });
  }
}
