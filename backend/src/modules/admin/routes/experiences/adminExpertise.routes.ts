import {
  bulkUpdateExpertiseStatus,
  deleteExpertise,
  getExpertiseById,
  getExpertiseStats,
  listExpertises,
  updateExpertiseStatus,
} from '@controllers/admin';
import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import type { FastifyInstance } from 'fastify';

// Expertise status enum values
const ExpertiseStatusValues = ['draft', 'published', 'archived'] as const;

// Query schema for listing expertises (JSON Schema)
const listExpertisesQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    status: { type: 'string', enum: ExpertiseStatusValues },
    search: { type: 'string' },
    hubId: { type: 'string' },
    dateFrom: { type: 'string' }, // ISO date string for start of range
    dateTo: { type: 'string' }, // ISO date string for end of range
    sortBy: { type: 'string', default: 'createdAt' },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
} as const;

// Update status schema (JSON Schema)
const updateStatusSchema = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { type: 'string', enum: ExpertiseStatusValues },
    reason: { type: 'string' },
  },
} as const;

// Bulk update schema (JSON Schema)
const bulkUpdateSchema = {
  type: 'object',
  required: ['expertiseIds', 'status'],
  properties: {
    expertiseIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
    status: { type: 'string', enum: ExpertiseStatusValues },
  },
} as const;

/**
 * Admin expertise management routes
 * Base path: /api/v1/admin/expertises
 */
export async function adminExpertiseRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require admin auth
  fastify.addHook('preHandler', requireAdminAuth);

  /**
   * Get expertise statistics
   */
  fastify.get('/stats', {
    schema: {
      tags: ['Admin - Expertises'],
      summary: 'Get expertise statistics',
      description: 'Get statistics about expertises (total, by status, disabled, recent)',
      security: [{ bearerAuth: [] }],
    },
    handler: getExpertiseStats,
  });

  /**
   * List all expertises
   */
  fastify.get('/', {
    schema: {
      tags: ['Admin - Expertises'],
      summary: 'List all expertises',
      description: 'Get paginated list of expertises with filtering and sorting',
      querystring: listExpertisesQuerySchema,
      security: [{ bearerAuth: [] }],
    },
    handler: listExpertises,
  });

  /**
   * Get expertise by ID
   */
  fastify.get('/:id', {
    schema: {
      tags: ['Admin - Expertises'],
      summary: 'Get expertise details',
      description: 'Get detailed expertise information by ID',
      security: [{ bearerAuth: [] }],
    },
    handler: getExpertiseById,
  });

  /**
   * Update expertise status
   */
  fastify.patch('/:id/status', {
    schema: {
      tags: ['Admin - Expertises'],
      summary: 'Update expertise status',
      description: 'Update expertise status (draft, publish, archive)',
      body: updateStatusSchema,
      security: [{ bearerAuth: [] }],
    },
    handler: updateExpertiseStatus,
  });

  /**
   * Delete expertise
   */
  fastify.delete('/:id', {
    schema: {
      tags: ['Admin - Expertises'],
      summary: 'Delete expertise',
      description: 'Permanently delete an expertise',
      security: [{ bearerAuth: [] }],
    },
    handler: deleteExpertise,
  });

  /**
   * Bulk update expertise status
   */
  fastify.post('/bulk-status', {
    schema: {
      tags: ['Admin - Expertises'],
      summary: 'Bulk update expertise status',
      description: 'Update status of multiple expertises at once',
      body: bulkUpdateSchema,
      security: [{ bearerAuth: [] }],
    },
    handler: bulkUpdateExpertiseStatus,
  });
}
