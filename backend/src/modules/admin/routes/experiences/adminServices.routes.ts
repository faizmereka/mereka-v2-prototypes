import { getServicesTabStats } from '@controllers/admin';
import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import type { FastifyInstance } from 'fastify';

/**
 * Admin services routes - combined stats for experiences and expertise
 * Base path: /api/v1/admin/services
 */
export async function adminServicesRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require admin auth
  fastify.addHook('preHandler', requireAdminAuth);

  /**
   * Get combined tab stats for services page
   * Returns counts for experiences and expertise tabs
   */
  fastify.get('/stats', {
    schema: {
      tags: ['Admin - Services'],
      summary: 'Get services tab statistics',
      description: 'Get combined statistics for experiences and expertise to display in tabs',
      security: [{ bearerAuth: [] }],
    },
    handler: getServicesTabStats,
  });
}
