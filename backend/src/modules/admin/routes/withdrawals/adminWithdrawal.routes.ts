import {
  approveWithdrawal,
  getWithdrawalById,
  getWithdrawalStats,
  listWithdrawals,
  rejectWithdrawal,
} from '@controllers/admin';
import {
  approveWithdrawalBodySchema,
  listWithdrawalsQuerySchema,
  rejectWithdrawalBodySchema,
  withdrawalIdParamSchema,
} from '@core/schemas/admin/withdrawals';
import type { FastifyInstance } from 'fastify';

/**
 * Admin Withdrawal Routes
 *
 * Prefix: /api/v1/admin/withdrawals
 */
export async function adminWithdrawalRoutes(fastify: FastifyInstance): Promise<void> {
  // Get withdrawal statistics
  fastify.get('/stats', {
    schema: {
      tags: ['Admin Withdrawals'],
      summary: 'Get withdrawal statistics',
      description: 'Get aggregated withdrawal statistics',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                totalAmount: { type: 'number' },
                pendingAmount: { type: 'number' },
                completedAmount: { type: 'number' },
                byStatus: { type: 'object' },
                bySourceType: { type: 'object' },
                currency: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: getWithdrawalStats,
  });

  // List withdrawals
  fastify.get('/', {
    schema: {
      tags: ['Admin Withdrawals'],
      summary: 'List withdrawals',
      description: 'List all withdrawals with filtering and pagination',
      querystring: listWithdrawalsQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                items: { type: 'array' },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'number' },
                    limit: { type: 'number' },
                    total: { type: 'number' },
                    totalPages: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: listWithdrawals,
  });

  // Get withdrawal by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Admin Withdrawals'],
      summary: 'Get withdrawal by ID',
      description: 'Get a single withdrawal by its ID',
      params: withdrawalIdParamSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: getWithdrawalById,
  });

  // Approve withdrawal
  fastify.post('/:id/approve', {
    schema: {
      tags: ['Admin Withdrawals'],
      summary: 'Approve withdrawal',
      description: 'Approve a pending withdrawal request',
      params: withdrawalIdParamSchema,
      body: approveWithdrawalBodySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: approveWithdrawal,
  });

  // Reject withdrawal
  fastify.post('/:id/reject', {
    schema: {
      tags: ['Admin Withdrawals'],
      summary: 'Reject withdrawal',
      description: 'Reject a pending withdrawal request',
      params: withdrawalIdParamSchema,
      body: rejectWithdrawalBodySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: rejectWithdrawal,
  });
}
