/**
 * Hub Contract Reviews Routes
 * Routes for listing contract reviews received by a hub (dashboard view)
 *
 * GET /api/v1/hub/:hubId/contract-reviews - List contract reviews for hub
 */
import { requireAuth } from '@core/middlewares/auth.middleware';
import { requireHubMember } from '@core/middlewares/hubMember.middleware';
import { hubReviewParamsSchema } from '@core/schemas/hub/reviews/hubReview.schema';
import type { FastifyInstance } from 'fastify';
import { listHubContractReviews } from '../../controllers/contracts';

const hubContractReviewsQuerySchema = {
  type: 'object',
  properties: {
    page: {
      type: 'integer',
      minimum: 1,
      default: 1,
      description: 'Page number for pagination',
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 50,
      default: 20,
      description: 'Number of items per page',
    },
    asReviewer: {
      type: 'boolean',
      description: 'Filter by reviews given by the hub (true) or received by the hub (false)',
    },
  },
} as const;

export async function hubContractReviewsRoutes(fastify: FastifyInstance) {
  // List contract reviews for hub (dashboard)
  fastify.get(
    '/',
    {
      preHandler: [requireAuth, requireHubMember],
      schema: {
        params: hubReviewParamsSchema,
        querystring: hubContractReviewsQuerySchema,
        tags: ['Hub - Reviews'],
        summary: 'List hub contract reviews',
        description: 'Get contract reviews for the hub with filters and pagination',
        security: [{ bearerAuth: [] }],
      },
    },
    listHubContractReviews,
  );
}
