import {
  getContractPaymentById,
  getContractPaymentStats,
  listContractPayments,
} from '@controllers/admin';
import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import { ContractPaymentStatus, ContractPaymentType } from '@core/models/ContractPayment';
import type { FastifyInstance } from 'fastify';

// Query schema for listing contract payments (JSON Schema)
const listContractPaymentsQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    status: { type: 'string', enum: Object.values(ContractPaymentStatus) },
    paymentType: { type: 'string', enum: Object.values(ContractPaymentType) },
    search: { type: 'string' },
    contractId: { type: 'string' },
    sortBy: { type: 'string', default: 'createdAt' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
} as const;

/**
 * Admin contract payment routes
 * Base path: /api/v1/admin/contract-payments
 */
export async function adminContractPaymentRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require admin auth
  fastify.addHook('preHandler', requireAdminAuth);

  /**
   * Get contract payment statistics
   */
  fastify.get('/stats', {
    schema: {
      tags: ['Admin - Contract Payments'],
      summary: 'Get contract payment statistics',
      description: 'Get statistics about contract payments (total, by status, amounts)',
      security: [{ bearerAuth: [] }],
    },
    handler: getContractPaymentStats,
  });

  /**
   * List all contract payments
   */
  fastify.get('/', {
    schema: {
      tags: ['Admin - Contract Payments'],
      summary: 'List all contract payments',
      description: 'Get paginated list of contract payments with filtering and sorting',
      querystring: listContractPaymentsQuerySchema,
      security: [{ bearerAuth: [] }],
    },
    handler: listContractPayments,
  });

  /**
   * Get contract payment by ID
   */
  fastify.get('/:id', {
    schema: {
      tags: ['Admin - Contract Payments'],
      summary: 'Get contract payment details',
      description: 'Get detailed contract payment information by ID',
      security: [{ bearerAuth: [] }],
    },
    handler: getContractPaymentById,
  });
}
