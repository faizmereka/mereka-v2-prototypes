import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  bookingReviewParamsSchema,
  createReviewBodySchema,
  updateReviewBodySchema,
} from '@core/schemas/web/reviews/userReview.schema';
import {
  cancelBookingBodySchema,
  userBookingParamsSchema,
  userBookingsQuerySchema,
} from '@schemas/web';
import type { FastifyInstance } from 'fastify';
import { cancelBooking, getUserBookingById, getUserBookings } from '../../controllers/bookings';
import {
  createReview,
  deleteReviewByBookingId,
  getReviewByBookingId,
  updateReviewByBookingId,
} from '../../controllers/reviews';

/**
 * User Booking Routes - My Bookings
 * All routes require authentication
 *
 * GET /me/bookings - List user's bookings with filters
 * GET /me/bookings/:bookingId - Get a single booking
 * POST /me/bookings/:bookingId/cancel - Cancel a booking
 */
export async function userBookingRoutes(fastify: FastifyInstance) {
  // Get user's bookings
  fastify.get(
    '/',
    {
      preHandler: [requireAuth],
      schema: {
        querystring: userBookingsQuerySchema,
        tags: ['Web - My Bookings'],
        summary: 'Get user bookings',
        description: 'Returns a paginated list of bookings for the authenticated user',
        security: [{ bearerAuth: [] }],
      },
    },
    getUserBookings,
  );

  // Get a single booking by ID
  fastify.get(
    '/:bookingId',
    {
      preHandler: [requireAuth],
      schema: {
        params: userBookingParamsSchema,
        tags: ['Web - My Bookings'],
        summary: 'Get booking details',
        description: 'Returns detailed information about a specific booking',
        security: [{ bearerAuth: [] }],
      },
    },
    getUserBookingById,
  );

  // Cancel a booking
  fastify.post(
    '/:bookingId/cancel',
    {
      preHandler: [requireAuth],
      schema: {
        params: userBookingParamsSchema,
        body: cancelBookingBodySchema,
        tags: ['Web - My Bookings'],
        summary: 'Cancel booking',
        description: 'Cancels a booking if it is eligible for cancellation',
        security: [{ bearerAuth: [] }],
      },
    },
    cancelBooking,
  );

  // ============================================
  // REVIEW ROUTES
  // ============================================

  // Get review by booking ID
  fastify.get(
    '/:bookingId/review',
    {
      preHandler: [requireAuth],
      schema: {
        params: bookingReviewParamsSchema,
        tags: ['Web - My Bookings'],
        summary: 'Get booking review',
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
        tags: ['Web - My Bookings'],
        summary: 'Create booking review',
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
        tags: ['Web - My Bookings'],
        summary: 'Update booking review',
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
        tags: ['Web - My Bookings'],
        summary: 'Delete booking review',
        description: 'Soft delete own review',
        security: [{ bearerAuth: [] }],
      },
    },
    deleteReviewByBookingId,
  );
}
