/**
 * Contract Review Routes
 * Routes for contract review operations
 *
 * Hub-authenticated routes:
 * POST   /hub/:hubId/contracts/:contractId/reviews - Create a review
 * GET    /hub/:hubId/contracts/:contractId/reviews - Get contract reviews
 * PUT    /hub/:hubId/contracts/:contractId/reviews/:reviewId - Update a review
 * GET    /hub/:hubId/contracts/:contractId/reviews/status - Get review status
 */
import { requireAuth } from '@core/middlewares/auth.middleware';
import { requireHubMember } from '@core/middlewares/hubMember.middleware';
import {
  contractReviewParamsSchema,
  contractReviewUpdateParamsSchema,
  createContractReviewBodySchema,
  updateContractReviewBodySchema,
} from '@core/schemas/hub/contracts/contractReview.schema';
import type { FastifyInstance } from 'fastify';
import {
  createContractReview,
  getContractReviewStatus,
  getContractReviews,
  updateContractReview,
} from '../../controllers/contracts';

export async function contractReviewRoutes(fastify: FastifyInstance) {
  // Create a contract review
  fastify.post(
    '/',
    {
      preHandler: [requireAuth, requireHubMember],
      schema: {
        params: contractReviewParamsSchema,
        body: createContractReviewBodySchema,
        tags: ['Hub - Contract Reviews'],
        summary: 'Create a contract review',
        description: 'Submit a review for a completed contract',
        security: [{ bearerAuth: [] }],
      },
    },
    createContractReview,
  );

  // Get contract reviews (my review + received review)
  fastify.get(
    '/',
    {
      preHandler: [requireAuth, requireHubMember],
      schema: {
        params: contractReviewParamsSchema,
        tags: ['Hub - Contract Reviews'],
        summary: 'Get contract reviews',
        description: 'Get both my review and received review for a contract',
        security: [{ bearerAuth: [] }],
      },
    },
    getContractReviews,
  );

  // Get review status for a contract
  fastify.get(
    '/status',
    {
      preHandler: [requireAuth, requireHubMember],
      schema: {
        params: contractReviewParamsSchema,
        tags: ['Hub - Contract Reviews'],
        summary: 'Get review status',
        description: 'Check if user can review and if reviews exist',
        security: [{ bearerAuth: [] }],
      },
    },
    getContractReviewStatus,
  );

  // Update a contract review
  fastify.put(
    '/:reviewId',
    {
      preHandler: [requireAuth, requireHubMember],
      schema: {
        params: contractReviewUpdateParamsSchema,
        body: updateContractReviewBodySchema,
        tags: ['Hub - Contract Reviews'],
        summary: 'Update a contract review',
        description: 'Update an existing review (within 30 days of creation)',
        security: [{ bearerAuth: [] }],
      },
    },
    updateContractReview,
  );
}
