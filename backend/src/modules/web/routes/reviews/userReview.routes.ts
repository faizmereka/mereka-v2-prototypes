/**
 * User Review Routes
 * Routes for authenticated user review operations
 *
 * GET /api/v1/learner/reviews - List user's reviews
 * GET /api/v1/learner/reviews/with-replies - List reviews with hub replies
 *
 * GET /api/v1/learner/bookings/to-review - List completed bookings to review
 * GET /api/v1/learner/bookings/:bookingId/review - Get review by booking
 * POST /api/v1/learner/bookings/:bookingId/review - Create a review
 * PUT /api/v1/learner/bookings/:bookingId/review - Update a review
 * DELETE /api/v1/learner/bookings/:bookingId/review - Delete a review
 */
import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  bookingReviewParamsSchema,
  createReviewBodySchema,
  listMyReviewsQuerySchema,
  updateReviewBodySchema,
} from '@core/schemas/web/reviews/userReview.schema';
import type { FastifyInstance } from 'fastify';
import {
  createReview,
  deleteReviewByBookingId,
  getReviewByBookingId,
  listBookingsToReview,
  listMyReviews,
  listReviewsWithReplies,
  updateReviewByBookingId,
} from '../../controllers/reviews';

/**
 * User Review Routes - /api/v1/learner/reviews
 * List all reviews by current user
 */
export async function userReviewRoutes(fastify: FastifyInstance) {
  // List my reviews
  fastify.get(
    '/',
    {
      preHandler: [requireAuth],
      schema: {
        querystring: listMyReviewsQuerySchema,
        tags: ['Web - User Reviews'],
        summary: 'List my reviews',
        description: 'List all reviews written by the current user',
        security: [{ bearerAuth: [] }],
      },
    },
    listMyReviews,
  );

  // List reviews with hub replies
  fastify.get(
    '/with-replies',
    {
      preHandler: [requireAuth],
      schema: {
        querystring: listMyReviewsQuerySchema,
        tags: ['Web - User Reviews'],
        summary: 'List reviews with hub replies',
        description: 'List all reviews that have received replies from hubs',
        security: [{ bearerAuth: [] }],
      },
    },
    listReviewsWithReplies,
  );
}

/**
 * User Booking Review Routes - /api/v1/learner/bookings
 * CRUD operations for reviews by booking ID
 */
export async function userBookingReviewRoutes(fastify: FastifyInstance) {
  // List bookings to review (must be before :bookingId routes)
  fastify.get(
    '/to-review',
    {
      preHandler: [requireAuth],
      schema: {
        querystring: listMyReviewsQuerySchema,
        tags: ['Web - User Reviews'],
        summary: 'List bookings to review',
        description: 'List completed bookings that have not been reviewed yet',
        security: [{ bearerAuth: [] }],
      },
    },
    listBookingsToReview,
  );

  // Get review by booking ID
  fastify.get(
    '/:bookingId/review',
    {
      preHandler: [requireAuth],
      schema: {
        params: bookingReviewParamsSchema,
        tags: ['Web - User Reviews'],
        summary: 'Get review by booking',
        description: 'Get the review for a specific booking (if exists)',
        security: [{ bearerAuth: [] }],
      },
    },
    getReviewByBookingId,
  );

  // Create a review for a booking
  fastify.post(
    '/:bookingId/review',
    {
      preHandler: [requireAuth],
      schema: {
        params: bookingReviewParamsSchema,
        body: createReviewBodySchema,
        tags: ['Web - User Reviews'],
        summary: 'Create a review',
        description: 'Create a review for a completed booking',
        security: [{ bearerAuth: [] }],
      },
    },
    createReview,
  );

  // Update a review by booking ID
  fastify.put(
    '/:bookingId/review',
    {
      preHandler: [requireAuth],
      schema: {
        params: bookingReviewParamsSchema,
        body: updateReviewBodySchema,
        tags: ['Web - User Reviews'],
        summary: 'Update a review',
        description: 'Update own review (within 30 days)',
        security: [{ bearerAuth: [] }],
      },
    },
    updateReviewByBookingId,
  );

  // Delete a review by booking ID
  fastify.delete(
    '/:bookingId/review',
    {
      preHandler: [requireAuth],
      schema: {
        params: bookingReviewParamsSchema,
        tags: ['Web - User Reviews'],
        summary: 'Delete a review',
        description: 'Soft delete own review',
        security: [{ bearerAuth: [] }],
      },
    },
    deleteReviewByBookingId,
  );
}
