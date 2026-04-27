import {
  bulkUpdateExperienceStatus,
  deleteExperience,
  getExperienceById,
  getExperienceEvents,
  getExperienceStats,
  listExperiences,
  toggleExperienceFeatured,
  updateExperiencePriority,
  updateExperienceStatus,
} from '@controllers/admin';
import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import type { FastifyInstance } from 'fastify';

// Experience status enum values
const ExperienceStatusValues = ['ACTIVE', 'DRAFTED', 'DELETED', 'EXPIRED'] as const;

// Query schema for listing experiences (JSON Schema)
const listExperiencesQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    status: { type: 'string', enum: ExperienceStatusValues },
    search: { type: 'string' },
    isFeatured: { type: 'boolean' },
    hubId: { type: 'string' },
    experienceType: { type: 'string', enum: ['Physical', 'Virtual', 'Hybrid'] },
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
    status: { type: 'string', enum: ExperienceStatusValues },
    reason: { type: 'string' },
  },
} as const;

// Bulk update schema (JSON Schema)
const bulkUpdateSchema = {
  type: 'object',
  required: ['experienceIds', 'status'],
  properties: {
    experienceIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
    status: { type: 'string', enum: ExperienceStatusValues },
  },
} as const;

// Update priority schema (JSON Schema)
const updatePrioritySchema = {
  type: 'object',
  required: ['priority'],
  properties: {
    priority: { type: 'integer', minimum: 1 },
  },
} as const;

/**
 * Admin experience management routes
 * Base path: /api/v1/admin/experiences
 */
export async function adminExperienceRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require admin auth
  fastify.addHook('preHandler', requireAdminAuth);

  /**
   * Get experience statistics
   */
  fastify.get('/stats', {
    schema: {
      tags: ['Admin - Experiences'],
      summary: 'Get experience statistics',
      description: 'Get statistics about experiences (total, by status, by type, featured, recent)',
      security: [{ bearerAuth: [] }],
    },
    handler: getExperienceStats,
  });

  /**
   * List all experiences
   */
  fastify.get('/', {
    schema: {
      tags: ['Admin - Experiences'],
      summary: 'List all experiences',
      description: 'Get paginated list of experiences with filtering and sorting',
      querystring: listExperiencesQuerySchema,
      security: [{ bearerAuth: [] }],
    },
    handler: listExperiences,
  });

  /**
   * Get experience by ID
   */
  fastify.get('/:id', {
    schema: {
      tags: ['Admin - Experiences'],
      summary: 'Get experience details',
      description: 'Get detailed experience information by ID',
      security: [{ bearerAuth: [] }],
    },
    handler: getExperienceById,
  });

  /**
   * Get experience events (upcoming occurrences)
   */
  fastify.get('/:id/events', {
    schema: {
      tags: ['Admin - Experiences'],
      summary: 'Get experience events',
      description: 'Get upcoming experience events with human-readable schedule information',
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          status: { type: 'string', enum: ['ACTIVE', 'CANCELLED', 'DELETED'] },
          upcoming: { type: 'boolean', default: true },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    handler: getExperienceEvents,
  });

  /**
   * Update experience status
   */
  fastify.patch('/:id/status', {
    schema: {
      tags: ['Admin - Experiences'],
      summary: 'Update experience status',
      description: 'Update experience status (activate, draft, delete, expire)',
      body: updateStatusSchema,
      security: [{ bearerAuth: [] }],
    },
    handler: updateExperienceStatus,
  });

  /**
   * Toggle experience featured status
   */
  fastify.post('/:id/featured', {
    schema: {
      tags: ['Admin - Experiences'],
      summary: 'Toggle featured status',
      description: 'Toggle whether an experience is featured',
      security: [{ bearerAuth: [] }],
    },
    handler: toggleExperienceFeatured,
  });

  /**
   * Update experience priority/order
   */
  fastify.patch('/:id/priority', {
    schema: {
      tags: ['Admin - Experiences'],
      summary: 'Update experience priority',
      description:
        'Update the priority/display order of an experience (lower number = higher priority)',
      body: updatePrioritySchema,
      security: [{ bearerAuth: [] }],
    },
    handler: updateExperiencePriority,
  });

  /**
   * Delete experience
   */
  fastify.delete('/:id', {
    schema: {
      tags: ['Admin - Experiences'],
      summary: 'Delete experience',
      description: 'Soft delete an experience (sets status to DELETED)',
      security: [{ bearerAuth: [] }],
    },
    handler: deleteExperience,
  });

  /**
   * Bulk update experience status
   */
  fastify.post('/bulk-status', {
    schema: {
      tags: ['Admin - Experiences'],
      summary: 'Bulk update experience status',
      description: 'Update status of multiple experiences at once',
      body: bulkUpdateSchema,
      security: [{ bearerAuth: [] }],
    },
    handler: bulkUpdateExperienceStatus,
  });
}
