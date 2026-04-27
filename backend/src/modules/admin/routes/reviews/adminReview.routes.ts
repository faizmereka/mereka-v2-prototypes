/**
 * Admin Review Routes
 * Routes for admin review management
 */

import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import {
  getReviewQuerySchema,
  listReviewsQuerySchema,
  moderateReviewBodySchema,
  reviewIdParamsSchema,
  reviewTrendsQuerySchema,
} from '@core/schemas/admin/reviews/adminReview.schema';
import type { FastifyInstance } from 'fastify';
import {
  getReview,
  getReviewStats,
  getReviewTrends,
  listBookingReviews,
  listContractReviews,
  listReviews,
  moderateReview,
} from '../../controllers/reviews';

export async function adminReviewRoutes(fastify: FastifyInstance) {
  // Get review statistics (must be before /:reviewId route)
  fastify.get(
    '/stats',
    {
      preHandler: [requireAdminAuth],
      schema: {
        tags: ['Admin - Reviews'],
        summary: 'Get review statistics',
        description: 'Get platform-wide review statistics',
        security: [{ bearerAuth: [] }],
      },
    },
    getReviewStats,
  );

  // Get review trends (must be before /:reviewId route)
  fastify.get(
    '/trends',
    {
      preHandler: [requireAdminAuth],
      schema: {
        querystring: reviewTrendsQuerySchema,
        tags: ['Admin - Reviews'],
        summary: 'Get review trends',
        description: 'Get review trends over time',
        security: [{ bearerAuth: [] }],
      },
    },
    getReviewTrends,
  );

  // List booking reviews only (must be before /:reviewId route)
  fastify.get(
    '/bookings',
    {
      preHandler: [requireAdminAuth],
      schema: {
        querystring: listReviewsQuerySchema,
        tags: ['Admin - Reviews'],
        summary: 'List booking reviews',
        description: 'List booking reviews with filters and pagination',
        security: [{ bearerAuth: [] }],
      },
    },
    listBookingReviews,
  );

  // List contract reviews only (must be before /:reviewId route)
  fastify.get(
    '/contracts',
    {
      preHandler: [requireAdminAuth],
      schema: {
        querystring: listReviewsQuerySchema,
        tags: ['Admin - Reviews'],
        summary: 'List contract reviews',
        description: 'List contract reviews with filters and pagination',
        security: [{ bearerAuth: [] }],
      },
    },
    listContractReviews,
  );

  // List all reviews (combined)
  fastify.get(
    '/',
    {
      preHandler: [requireAdminAuth],
      schema: {
        querystring: listReviewsQuerySchema,
        tags: ['Admin - Reviews'],
        summary: 'List all reviews',
        description: 'List combined booking and contract reviews with filters',
        security: [{ bearerAuth: [] }],
      },
    },
    listReviews,
  );

  // Get review by ID
  fastify.get(
    '/:reviewId',
    {
      preHandler: [requireAdminAuth],
      schema: {
        params: reviewIdParamsSchema,
        querystring: getReviewQuerySchema,
        tags: ['Admin - Reviews'],
        summary: 'Get review details',
        description: 'Get full details of a review by ID',
        security: [{ bearerAuth: [] }],
      },
    },
    getReview,
  );

  // Moderate review
  fastify.patch(
    '/:reviewId/moderate',
    {
      preHandler: [requireAdminAuth],
      schema: {
        params: reviewIdParamsSchema,
        body: moderateReviewBodySchema,
        tags: ['Admin - Reviews'],
        summary: 'Moderate a review',
        description: 'Hide, unhide, or delete a review',
        security: [{ bearerAuth: [] }],
      },
    },
    moderateReview,
  );
}
