import { PERMISSIONS } from '@core/constants';
import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  loadHubContext,
  requireHubAccess,
  requireHubPermission,
} from '@core/middlewares/hubPermission.middleware';
import {
  hubFavoriteListQuerySchema,
  hubFavoriteListResponseSchema,
  hubFavoriteStatsParamsSchema,
  hubFavoriteStatsResponseSchema,
} from '@core/schemas/hub';
import type { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { getHubFavoriteStats, listHubFavorites } from '../../controllers/favorites';

/**
 * Hub Favorites routes - Engagement data for hub dashboard
 * Base path: /hub/:hubId/dashboard/favorites
 */
export async function hubFavoriteRoutes(fastify: FastifyInstance): Promise<void> {
  // Common preHandlers for all favorite routes
  const favoritePreHandlers = [requireAuth, loadHubContext, requireHubAccess];

  /**
   * Get hub favorite stats
   * GET /hub/:hubId/dashboard/favorites/stats
   */
  fastify.get('/stats', {
    preHandler: [...favoritePreHandlers, requireHubPermission(PERMISSIONS.ANALYTICS_VIEW)],
    schema: {
      tags: ['Hub Dashboard - Favorites'],
      summary: 'Get hub favorite stats',
      description: 'Get statistics about users who favorited hub content',
      params: hubFavoriteStatsParamsSchema,
      security: [{ bearerAuth: [] }],
      response: {
        200: hubFavoriteStatsResponseSchema,
      },
    },
    handler: getHubFavoriteStats as RouteHandlerMethod,
  });

  /**
   * List users who favorited hub content
   * GET /hub/:hubId/dashboard/favorites
   */
  fastify.get('/', {
    preHandler: [...favoritePreHandlers, requireHubPermission(PERMISSIONS.ANALYTICS_VIEW)],
    schema: {
      tags: ['Hub Dashboard - Favorites'],
      summary: 'List who favorited',
      description: 'List users who favorited hub content (name and photo only for privacy)',
      params: hubFavoriteStatsParamsSchema,
      querystring: hubFavoriteListQuerySchema,
      security: [{ bearerAuth: [] }],
      response: {
        200: hubFavoriteListResponseSchema,
      },
    },
    handler: listHubFavorites as RouteHandlerMethod,
  });
}
