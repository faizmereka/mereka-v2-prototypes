import { adminDashboardService } from '@services/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get dashboard statistics
 * GET /api/v1/admin/dashboard/stats
 */
export async function getDashboardStats(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const stats = await adminDashboardService.getDashboardStats();

    return reply.send({
      success: true,
      data: stats,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get dashboard stats');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'DASHBOARD_STATS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get dashboard stats',
      },
    });
  }
}
