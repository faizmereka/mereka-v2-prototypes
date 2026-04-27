import type { GetTransactionByIdParams, ListTransactionsQuery } from '@core/schemas/admin/finance';
import { adminTransactionService } from '@core/services/admin/finance';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * List all transactions with filtering and pagination
 */
export async function listTransactions(
  request: FastifyRequest<{ Querystring: ListTransactionsQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await adminTransactionService.listTransactions(request.query);
    return reply.send({ success: true, data: result });
  } catch (error) {
    request.log.error({ error }, 'Error listing transactions');
    return reply.status(500).send({
      success: false,
      error: { code: 'LIST_TRANSACTIONS_ERROR', message: (error as Error).message },
    });
  }
}

/**
 * Get transaction statistics
 */
export async function getTransactionStats(request: FastifyRequest, reply: FastifyReply) {
  try {
    const stats = await adminTransactionService.getTransactionStats();
    return reply.send({ success: true, data: stats });
  } catch (error) {
    request.log.error({ error }, 'Error getting transaction stats');
    return reply.status(500).send({
      success: false,
      error: { code: 'GET_TRANSACTION_STATS_ERROR', message: (error as Error).message },
    });
  }
}

/**
 * Get transaction by ID
 */
export async function getTransactionById(
  request: FastifyRequest<{ Params: GetTransactionByIdParams }>,
  reply: FastifyReply,
) {
  try {
    const transaction = await adminTransactionService.getTransactionById(request.params.id);
    return reply.send({ success: true, data: transaction });
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage === 'Transaction not found') {
      return reply.status(404).send({
        success: false,
        error: { code: 'TRANSACTION_NOT_FOUND', message: errorMessage },
      });
    }
    request.log.error({ error }, 'Error getting transaction');
    return reply.status(500).send({
      success: false,
      error: { code: 'GET_TRANSACTION_ERROR', message: errorMessage },
    });
  }
}
