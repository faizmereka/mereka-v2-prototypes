import type { HubFavoriteListQuery, HubFavoriteStatsParams } from '@core/schemas/hub';
import { hubFavoriteService } from '@core/services/hub';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get hub favorite stats
 * GET /hub/:hubId/dashboard/favorites/stats
 */
export async function getHubFavoriteStats(
  request: FastifyRequest<{ Params: HubFavoriteStatsParams }>,
  reply: FastifyReply,
) {
  const { hubId } = request.params;

  try {
    const stats = await hubFavoriteService.getStats(hubId);

    return reply.send({
      success: true,
      data: stats,
    });
  } catch (error) {
    const _errorMessage = error instanceof Error ? error.message : 'Unknown error';
    request.log.error({ error, hubId }, 'Error fetching hub favorite stats');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_STATS_ERROR',
        message: 'Failed to fetch favorite stats',
      },
    });
  }
}

/**
 * List users who favorited hub content
 * GET /hub/:hubId/dashboard/favorites
 */
export async function listHubFavorites(
  request: FastifyRequest<{ Params: HubFavoriteStatsParams; Querystring: HubFavoriteListQuery }>,
  reply: FastifyReply,
) {
  const { hubId } = request.params;

  try {
    const result = await hubFavoriteService.listFavorites(hubId, request.query);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, hubId }, 'Error listing hub favorites');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_FAVORITES_ERROR',
        message: 'Failed to list favorites',
      },
    });
  }
}
