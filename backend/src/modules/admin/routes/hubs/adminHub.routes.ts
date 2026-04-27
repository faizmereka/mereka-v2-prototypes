import {
  bulkUpdateHubStatus,
  deleteHub,
  getHubById,
  getHubStats,
  listHubs,
  toggleHubFeatured,
  updateHubOrder,
  updateHubStatus,
} from '@controllers/admin';
import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import { HubStatus } from '@core/models/Hub';
import type { FastifyInstance } from 'fastify';

// Query schema for listing hubs (JSON Schema)
const listHubsQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    status: { type: 'string', enum: Object.values(HubStatus) },
    search: { type: 'string' },
    isFeatured: { type: 'boolean' },
    plan: { type: 'string' }, // Filter by plan code (e.g., 'scale', 'soar', 'free')
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
    status: { type: 'string', enum: Object.values(HubStatus) },
    reason: { type: 'string' },
  },
} as const;

// Bulk update schema (JSON Schema)
const bulkUpdateSchema = {
  type: 'object',
  required: ['hubIds', 'status'],
  properties: {
    hubIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
    status: { type: 'string', enum: Object.values(HubStatus) },
  },
} as const;

// Update order schema (JSON Schema)
const updateOrderSchema = {
  type: 'object',
  required: ['displayOrder'],
  properties: {
    displayOrder: { type: 'integer', minimum: 1 },
  },
} as const;

/**
 * Admin hub management routes
 * Base path: /api/v1/admin/hubs
 */
export async function adminHubRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require admin auth
  fastify.addHook('preHandler', requireAdminAuth);

  /**
   * Get hub statistics
   */
  fastify.get('/stats', {
    schema: {
      tags: ['Admin - Hubs'],
      summary: 'Get hub statistics',
      description: 'Get statistics about hubs (total, by status, featured, recent)',
      security: [{ bearerAuth: [] }],
    },
    handler: getHubStats,
  });

  /**
   * List all hubs
   */
  fastify.get('/', {
    schema: {
      tags: ['Admin - Hubs'],
      summary: 'List all hubs',
      description: 'Get paginated list of hubs with filtering and sorting',
      querystring: listHubsQuerySchema,
      security: [{ bearerAuth: [] }],
    },
    handler: listHubs,
  });

  /**
   * Get hub by ID
   */
  fastify.get('/:id', {
    schema: {
      tags: ['Admin - Hubs'],
      summary: 'Get hub details',
      description: 'Get detailed hub information by ID',
      security: [{ bearerAuth: [] }],
    },
    handler: getHubById,
  });

  /**
   * Update hub status
   */
  fastify.patch('/:id/status', {
    schema: {
      tags: ['Admin - Hubs'],
      summary: 'Update hub status',
      description: 'Update hub status (approve, reject, activate, etc.)',
      body: updateStatusSchema,
      security: [{ bearerAuth: [] }],
    },
    handler: updateHubStatus,
  });

  /**
   * Toggle hub featured status
   */
  fastify.post('/:id/featured', {
    schema: {
      tags: ['Admin - Hubs'],
      summary: 'Toggle featured status',
      description: 'Toggle whether a hub is featured',
      security: [{ bearerAuth: [] }],
    },
    handler: toggleHubFeatured,
  });

  /**
   * Update hub display order
   */
  fastify.patch('/:id/order', {
    schema: {
      tags: ['Admin - Hubs'],
      summary: 'Update hub display order',
      description: 'Update the display order of a hub (lower number = higher priority)',
      body: updateOrderSchema,
      security: [{ bearerAuth: [] }],
    },
    handler: updateHubOrder,
  });

  /**
   * Delete hub
   */
  fastify.delete('/:id', {
    schema: {
      tags: ['Admin - Hubs'],
      summary: 'Delete hub',
      description: 'Soft delete a hub (sets to inactive)',
      security: [{ bearerAuth: [] }],
    },
    handler: deleteHub,
  });

  /**
   * Bulk update hub status
   */
  fastify.post('/bulk-status', {
    schema: {
      tags: ['Admin - Hubs'],
      summary: 'Bulk update hub status',
      description: 'Update status of multiple hubs at once',
      body: bulkUpdateSchema,
      security: [{ bearerAuth: [] }],
    },
    handler: bulkUpdateHubStatus,
  });
}
