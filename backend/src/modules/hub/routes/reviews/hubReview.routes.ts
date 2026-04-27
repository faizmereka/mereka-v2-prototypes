/**
 * Hub Review Routes
 * Routes for hub dashboard review operations
 *
 * GET /api/v1/hub/:hubId/reviews - List reviews for hub
 * GET /api/v1/hub/:hubId/reviews/stats - Get hub review statistics
 */
import { requireAuth } from '@core/middlewares/auth.middleware';
import { requireHubMember } from '@core/middlewares/hubMember.middleware';
import {
  hubReviewParamsSchema,
  hubReviewsQuerySchema,
} from '@core/schemas/hub/reviews/hubReview.schema';
import type { FastifyInstance } from 'fastify';
import { getHubReviewStats, listHubReviews } from '../../controllers/reviews';

export async function hubReviewRoutes(fastify: FastifyInstance) {
  // Get hub review statistics (must be before / to avoid route conflicts)
  fastify.get(
    '/stats',
    {
      preHandler: [requireAuth, requireHubMember],
      schema: {
        params: hubReviewParamsSchema,
        tags: ['Hub - Reviews'],
        summary: 'Get hub review stats',
        description:
          'Get review statistics for the hub including rating distribution and response rate',
        security: [{ bearerAuth: [] }],
      },
    },
    getHubReviewStats,
  );

  // List reviews for hub (dashboard)
  fastify.get(
    '/',
    {
      preHandler: [requireAuth, requireHubMember],
      schema: {
        params: hubReviewParamsSchema,
        querystring: hubReviewsQuerySchema,
        tags: ['Hub - Reviews'],
        summary: 'List hub reviews',
        description: 'Get reviews for the hub with filters and pagination',
        security: [{ bearerAuth: [] }],
      },
    },
    listHubReviews,
  );
}
