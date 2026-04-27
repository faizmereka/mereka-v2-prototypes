import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import {
  adminFavoriteExportQuerySchema,
  adminFavoriteOverviewQuerySchema,
  adminFavoriteOverviewResponseSchema,
  adminFavoriteTopContentQuerySchema,
  adminFavoriteTopContentResponseSchema,
  adminFavoriteUserEngagementQuerySchema,
  adminFavoriteUserEngagementResponseSchema,
} from '@core/schemas/admin';
import type { FastifyInstance, RouteHandlerMethod } from 'fastify';
import {
  exportFavorites,
  getFavoritesOverview,
  getTopContent,
  getUserEngagement,
} from '../../controllers/favorites';

/**
 * Admin Favorites Analytics Routes
 * Base path: /api/v1/admin/analytics/favorites
 */
export async function adminFavoriteRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Get favorites overview statistics
   * GET /api/v1/admin/analytics/favorites/overview
   */
  fastify.get('/overview', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Analytics - Favorites'],
      summary: 'Get favorites overview',
      description:
        'Returns comprehensive favorites statistics including totals, trends, and period comparison',
      security: [{ cookieAuth: [] }],
      querystring: adminFavoriteOverviewQuerySchema,
      response: {
        200: adminFavoriteOverviewResponseSchema,
      },
    },
    handler: getFavoritesOverview as RouteHandlerMethod,
  });

  /**
   * Get top favorited content
   * GET /api/v1/admin/analytics/favorites/top-content
   */
  fastify.get('/top-content', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Analytics - Favorites'],
      summary: 'Get top favorited content',
      description: 'Returns the most favorited content items with details',
      security: [{ cookieAuth: [] }],
      querystring: adminFavoriteTopContentQuerySchema,
      response: {
        200: adminFavoriteTopContentResponseSchema,
      },
    },
    handler: getTopContent as RouteHandlerMethod,
  });

  /**
   * Get user engagement statistics
   * GET /api/v1/admin/analytics/favorites/user-engagement
   */
  fastify.get('/user-engagement', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Analytics - Favorites'],
      summary: 'Get user engagement stats',
      description: 'Returns user engagement statistics sorted by favorite count',
      security: [{ cookieAuth: [] }],
      querystring: adminFavoriteUserEngagementQuerySchema,
      response: {
        200: adminFavoriteUserEngagementResponseSchema,
      },
    },
    handler: getUserEngagement as RouteHandlerMethod,
  });

  /**
   * Export favorites data as CSV
   * GET /api/v1/admin/analytics/favorites/export
   */
  fastify.get('/export', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Analytics - Favorites'],
      summary: 'Export favorites data',
      description: 'Export favorites data as CSV file',
      security: [{ cookieAuth: [] }],
      querystring: adminFavoriteExportQuerySchema,
      produces: ['text/csv'],
    },
    handler: exportFavorites as RouteHandlerMethod,
  });
}
