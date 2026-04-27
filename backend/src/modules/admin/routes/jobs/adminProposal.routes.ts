import { getProposalById, listProposals, updateProposalStatus } from '@controllers/admin';
import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import { ProposalStatus } from '@core/models/JobProposal';
import type { FastifyInstance } from 'fastify';

// Query schema for listing proposals (JSON Schema)
const listProposalsQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    status: { type: 'string', enum: Object.values(ProposalStatus) },
    search: { type: 'string' },
    jobId: { type: 'string' },
    sortBy: { type: 'string', default: 'createdAt' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
} as const;

// Update proposal status schema (JSON Schema)
const updateProposalStatusSchema = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { type: 'string', enum: Object.values(ProposalStatus) },
    reason: { type: 'string' },
  },
} as const;

/**
 * Admin proposal management routes
 * Base path: /api/v1/admin/proposals
 */
export async function adminProposalRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require admin auth
  fastify.addHook('preHandler', requireAdminAuth);

  /**
   * List all proposals
   */
  fastify.get('/', {
    schema: {
      tags: ['Admin - Proposals'],
      summary: 'List all proposals',
      description: 'Get paginated list of proposals with filtering and sorting',
      querystring: listProposalsQuerySchema,
      security: [{ bearerAuth: [] }],
    },
    handler: listProposals,
  });

  /**
   * Get proposal by ID
   */
  fastify.get('/:id', {
    schema: {
      tags: ['Admin - Proposals'],
      summary: 'Get proposal details',
      description: 'Get detailed proposal information by ID',
      security: [{ bearerAuth: [] }],
    },
    handler: getProposalById,
  });

  /**
   * Update proposal status
   */
  fastify.patch('/:id/status', {
    schema: {
      tags: ['Admin - Proposals'],
      summary: 'Update proposal status',
      description: 'Update proposal status (accept, reject, etc.)',
      body: updateProposalStatusSchema,
      security: [{ bearerAuth: [] }],
    },
    handler: updateProposalStatus,
  });
}
