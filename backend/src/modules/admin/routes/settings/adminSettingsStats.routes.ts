import { getSettingsStats } from '@controllers/admin';
import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import type { FastifyInstance } from 'fastify';

/**
 * Admin Settings Stats Routes
 * GET /api/v1/admin/settings/stats
 */
export async function adminSettingsStatsRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/admin/settings/stats
  fastify.get('/stats', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Settings'],
      summary: 'Get statistics for all reference data collections',
      description: 'Returns counts (total, active, inactive) for all settings collections',
      security: [{ cookieAuth: [] }],
    },
    handler: getSettingsStats,
  });
}
