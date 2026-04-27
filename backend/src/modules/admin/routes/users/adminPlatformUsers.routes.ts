import { getPlatformUserById, getPlatformUserStats, listPlatformUsers } from '@controllers/admin';
import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import { UserStatus } from '@core/models/User';
import type { FastifyInstance } from 'fastify';

// Query schema for listing platform users (JSON Schema)
const listPlatformUsersQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    status: { type: 'string', enum: Object.values(UserStatus) },
    userType: {
      type: 'string',
      enum: ['all', 'learner', 'hub_owner', 'expert', 'admin', 'member'],
      default: 'all',
    },
    search: { type: 'string' },
    sortBy: {
      type: 'string',
      enum: ['name', 'email', 'createdAt', 'lastLoginAt'],
      default: 'createdAt',
    },
    sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
} as const;

/**
 * Admin platform users management routes
 * Base path: /api/v1/admin/users
 * Manages platform users (learners, experts, hub owners) - NOT admin users
 */
export async function adminPlatformUsersRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require admin auth
  fastify.addHook('preHandler', requireAdminAuth);

  /**
   * Get platform user statistics
   */
  fastify.get('/stats', {
    schema: {
      tags: ['Admin - Platform Users'],
      summary: 'Get platform user statistics',
      description:
        'Get statistics about platform users (total, by status, by type, new this week/month)',
      security: [{ bearerAuth: [] }],
    },
    handler: getPlatformUserStats,
  });

  /**
   * List all platform users
   */
  fastify.get('/', {
    schema: {
      tags: ['Admin - Platform Users'],
      summary: 'List all platform users',
      description:
        'Get paginated list of platform users with filtering by type, status, and search',
      querystring: listPlatformUsersQuerySchema,
      security: [{ bearerAuth: [] }],
    },
    handler: listPlatformUsers,
  });

  /**
   * Get platform user by ID
   */
  fastify.get('/:id', {
    schema: {
      tags: ['Admin - Platform Users'],
      summary: 'Get platform user details',
      description: 'Get detailed platform user information by ID including hub memberships',
      security: [{ bearerAuth: [] }],
    },
    handler: getPlatformUserById,
  });
}
