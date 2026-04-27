import {
  getPendingPaymentById,
  getPendingPaymentStats,
  listPendingPayments,
  markPendingPaymentFailed,
  retryPendingPayment,
} from '@controllers/admin';
import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import { PendingPaymentStatus } from '@core/models/PendingPayment';
import type { FastifyInstance } from 'fastify';

// Query schema for listing pending payments (JSON Schema)
const listPendingPaymentsQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    status: { type: 'string', enum: Object.values(PendingPaymentStatus) },
    search: { type: 'string' },
    contractId: { type: 'string' },
    sortBy: { type: 'string', default: 'createdAt' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
} as const;

// Mark as failed body schema
const markAsFailedBodySchema = {
  type: 'object',
  required: ['reason'],
  properties: {
    reason: { type: 'string', minLength: 1 },
  },
} as const;

/**
 * Admin pending payment routes
 * Base path: /api/v1/admin/pending-payments
 */
export async function adminPendingPaymentRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require admin auth
  fastify.addHook('preHandler', requireAdminAuth);

  /**
   * Get pending payment statistics
   */
  fastify.get('/stats', {
    schema: {
      tags: ['Admin - Pending Payments'],
      summary: 'Get pending payment statistics',
      description: 'Get statistics about pending payments (total, by status, amounts)',
      security: [{ bearerAuth: [] }],
    },
    handler: getPendingPaymentStats,
  });

  /**
   * List all pending payments
   */
  fastify.get('/', {
    schema: {
      tags: ['Admin - Pending Payments'],
      summary: 'List all pending payments',
      description: 'Get paginated list of pending payments with filtering and sorting',
      querystring: listPendingPaymentsQuerySchema,
      security: [{ bearerAuth: [] }],
    },
    handler: listPendingPayments,
  });

  /**
   * Get pending payment by ID
   */
  fastify.get('/:id', {
    schema: {
      tags: ['Admin - Pending Payments'],
      summary: 'Get pending payment details',
      description: 'Get detailed pending payment information by ID',
      security: [{ bearerAuth: [] }],
    },
    handler: getPendingPaymentById,
  });

  /**
   * Retry a pending payment manually
   */
  fastify.post('/:id/retry', {
    schema: {
      tags: ['Admin - Pending Payments'],
      summary: 'Retry a pending payment',
      description: 'Queue a pending payment for immediate retry',
      security: [{ bearerAuth: [] }],
    },
    handler: retryPendingPayment,
  });

  /**
   * Mark a pending payment as failed
   */
  fastify.post('/:id/fail', {
    schema: {
      tags: ['Admin - Pending Payments'],
      summary: 'Mark payment as failed',
      description: 'Manually mark a pending payment as permanently failed',
      body: markAsFailedBodySchema,
      security: [{ bearerAuth: [] }],
    },
    handler: markPendingPaymentFailed,
  });
}
