import { adminSettingsStatsService as settingsStatsService } from '@services/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get all settings stats
 * GET /api/v1/admin/settings/stats
 */
export async function getSettingsStats(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const stats = await settingsStatsService.getAllStats();

    return reply.send({
      success: true,
      data: stats,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get settings stats');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'SETTINGS_STATS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get settings stats',
      },
    });
  }
}
