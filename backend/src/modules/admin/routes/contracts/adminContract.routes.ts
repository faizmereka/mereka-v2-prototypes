import {
  getContractById,
  getContractMilestones,
  getContractTimelogs,
  getContractTransactions,
  listContracts,
  updateContractStatus,
} from '@controllers/admin';
import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import { ContractStatus } from '@core/models/Contract';
import type { FastifyInstance } from 'fastify';

// Query schema for listing contracts (JSON Schema)
const listContractsQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    status: { type: 'string', enum: Object.values(ContractStatus) },
    search: { type: 'string' },
    jobId: { type: 'string' },
    sortBy: { type: 'string', default: 'createdAt' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
} as const;

// Update contract status schema (JSON Schema)
const updateContractStatusSchema = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { type: 'string', enum: Object.values(ContractStatus) },
    reason: { type: 'string' },
  },
} as const;

/**
 * Admin contract management routes
 * Base path: /api/v1/admin/contracts
 */
export async function adminContractRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require admin auth
  fastify.addHook('preHandler', requireAdminAuth);

  /**
   * List all contracts
   */
  fastify.get('/', {
    schema: {
      tags: ['Admin - Contracts'],
      summary: 'List all contracts',
      description: 'Get paginated list of contracts with filtering and sorting',
      querystring: listContractsQuerySchema,
      security: [{ bearerAuth: [] }],
    },
    handler: listContracts,
  });

  /**
   * Get contract by ID
   */
  fastify.get('/:id', {
    schema: {
      tags: ['Admin - Contracts'],
      summary: 'Get contract details',
      description: 'Get detailed contract information by ID',
      security: [{ bearerAuth: [] }],
    },
    handler: getContractById,
  });

  /**
   * Update contract status
   */
  fastify.patch('/:id/status', {
    schema: {
      tags: ['Admin - Contracts'],
      summary: 'Update contract status',
      description: 'Update contract status (activate, complete, cancel, pause)',
      body: updateContractStatusSchema,
      security: [{ bearerAuth: [] }],
    },
    handler: updateContractStatus,
  });

  /**
   * Get contract milestones (fixed price contracts only)
   */
  fastify.get('/:id/milestones', {
    schema: {
      tags: ['Admin - Contracts'],
      summary: 'Get contract milestones',
      description:
        'Get all milestones for a fixed price contract. Returns 400 error for hourly contracts.',
      security: [{ bearerAuth: [] }],
    },
    handler: getContractMilestones,
  });

  /**
   * Get contract timelogs (hourly contracts only)
   */
  fastify.get('/:id/timelogs', {
    schema: {
      tags: ['Admin - Contracts'],
      summary: 'Get contract timelogs',
      description:
        'Get all time log entries for an hourly contract. Returns 400 error for fixed price contracts.',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    handler: getContractTimelogs,
  });

  /**
   * Get contract transactions
   */
  fastify.get('/:id/transactions', {
    schema: {
      tags: ['Admin - Contracts'],
      summary: 'Get contract transactions',
      description:
        'Get financial transaction history for a contract (milestone payments for fixed, timelog payments for hourly)',
      security: [{ bearerAuth: [] }],
    },
    handler: getContractTransactions,
  });
}
