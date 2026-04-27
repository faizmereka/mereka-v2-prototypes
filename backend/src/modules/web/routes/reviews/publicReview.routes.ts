/**
 * Public Review Routes
 * Routes for public review endpoints (no authentication required)
 *
 * GET /api/v1/experiences/:experienceId/reviews - List experience reviews
 * GET /api/v1/expertises/:expertiseId/reviews - List expertise reviews
 * GET /api/v1/hubs/:hubId/reviews - List hub reviews
 * GET /api/v1/hubs/:hubId/contract-reviews - List hub contract reviews
 */

import {
  hubContractReviewsParamsSchema,
  hubContractReviewsQuerySchema,
} from '@core/schemas/hub/contracts/contractReview.schema';
import {
  experienceReviewsParamsSchema,
  expertiseReviewsParamsSchema,
  hubReviewsParamsSchema,
  hubReviewsQuerySchema,
  listReviewsQuerySchema,
} from '@core/schemas/web/reviews/userReview.schema';
import type { FastifyInstance } from 'fastify';
import {
  listExperienceReviews,
  listExpertiseReviews,
  listHubReviews,
  listPublicHubContractReviews,
} from '../../controllers/reviews';

/**
 * Experience Reviews Routes
 * Nested under /experiences/:experienceId
 */
export async function experienceReviewsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/:experienceId/reviews',
    {
      schema: {
        params: experienceReviewsParamsSchema,
        querystring: listReviewsQuerySchema,
        tags: ['Web - Public Reviews'],
        summary: 'List experience reviews',
        description: 'Get public reviews for an experience with pagination',
      },
    },
    listExperienceReviews,
  );
}

/**
 * Expertise Reviews Routes
 * Nested under /expertises/:expertiseId
 */
export async function expertiseReviewsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/:expertiseId/reviews',
    {
      schema: {
        params: expertiseReviewsParamsSchema,
        querystring: listReviewsQuerySchema,
        tags: ['Web - Public Reviews'],
        summary: 'List expertise reviews',
        description: 'Get public reviews for an expertise with pagination',
      },
    },
    listExpertiseReviews,
  );
}

/**
 * Hub Reviews Routes (Public)
 * Nested under /hubs/:hubId
 */
export async function hubPublicReviewsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/:hubId/reviews',
    {
      schema: {
        params: hubReviewsParamsSchema,
        querystring: hubReviewsQuerySchema,
        tags: ['Web - Public Reviews'],
        summary: 'List hub reviews',
        description: 'Get public reviews for a hub (booking and contract reviews)',
      },
    },
    listHubReviews,
  );

  // Contract reviews endpoint
  fastify.get(
    '/:hubId/contract-reviews',
    {
      schema: {
        params: hubContractReviewsParamsSchema,
        querystring: hubContractReviewsQuerySchema,
        tags: ['Web - Public Reviews'],
        summary: 'List hub contract reviews',
        description: 'Get public contract reviews received by a hub',
      },
    },
    listPublicHubContractReviews,
  );
}
