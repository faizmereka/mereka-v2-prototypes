import type {
  AdminFavoriteExportQuery,
  AdminFavoriteOverviewQuery,
  AdminFavoriteTopContentQuery,
  AdminFavoriteUserEngagementQuery,
} from '@core/schemas/admin';
import { adminFavoriteService } from '@core/services/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get favorites overview
 * GET /admin/analytics/favorites/overview
 */
export async function getFavoritesOverview(
  request: FastifyRequest<{ Querystring: AdminFavoriteOverviewQuery }>,
  reply: FastifyReply,
) {
  try {
    const overview = await adminFavoriteService.getOverview(request.query);

    return reply.send({
      success: true,
      data: overview,
    });
  } catch (error) {
    request.log.error({ error }, 'Error fetching favorites overview');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_OVERVIEW_ERROR',
        message: 'Failed to fetch favorites overview',
      },
    });
  }
}

/**
 * Get top favorited content
 * GET /admin/analytics/favorites/top-content
 */
export async function getTopContent(
  request: FastifyRequest<{ Querystring: AdminFavoriteTopContentQuery }>,
  reply: FastifyReply,
) {
  try {
    const items = await adminFavoriteService.getTopContent(request.query);

    return reply.send({
      success: true,
      data: { items },
    });
  } catch (error) {
    request.log.error({ error }, 'Error fetching top content');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_TOP_CONTENT_ERROR',
        message: 'Failed to fetch top content',
      },
    });
  }
}

/**
 * Get user engagement stats
 * GET /admin/analytics/favorites/user-engagement
 */
export async function getUserEngagement(
  request: FastifyRequest<{ Querystring: AdminFavoriteUserEngagementQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await adminFavoriteService.getUserEngagement(request.query);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Error fetching user engagement');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_USER_ENGAGEMENT_ERROR',
        message: 'Failed to fetch user engagement',
      },
    });
  }
}

/**
 * Export favorites data
 * GET /admin/analytics/favorites/export
 */
export async function exportFavorites(
  request: FastifyRequest<{ Querystring: AdminFavoriteExportQuery }>,
  reply: FastifyReply,
) {
  try {
    const period = request.query.period || '30d';
    const exportType = request.query.type || 'overview';

    const { filename, content } = await adminFavoriteService.exportData(exportType, period);

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);

    return reply.send(content);
  } catch (error) {
    request.log.error({ error }, 'Error exporting favorites data');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'EXPORT_ERROR',
        message: 'Failed to export favorites data',
      },
    });
  }
}
