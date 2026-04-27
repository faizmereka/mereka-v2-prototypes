import { getTransactionById, getTransactionStats, listTransactions } from '@controllers/admin';
import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import {
  getTransactionByIdSchema,
  getTransactionStatsSchema,
  listTransactionsSchema,
} from '@core/schemas/admin/finance';
import type { FastifyInstance } from 'fastify';

export async function adminTransactionRoutes(fastify: FastifyInstance) {
  // All routes require admin auth
  fastify.addHook('preHandler', requireAdminAuth);

  // Get transaction statistics
  fastify.get('/stats', {
    schema: getTransactionStatsSchema,
    handler: getTransactionStats,
  });

  // List all transactions
  fastify.get('/', {
    schema: listTransactionsSchema,
    handler: listTransactions,
  });

  // Get transaction by ID
  fastify.get('/:id', {
    schema: getTransactionByIdSchema,
    handler: getTransactionById,
  });
}
