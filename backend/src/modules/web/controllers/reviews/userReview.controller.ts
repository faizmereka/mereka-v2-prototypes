/**
 * User Review Controller
 * Handles review operations for authenticated users
 */

import type {
  BookingReviewParams,
  CreateReviewBodyInput,
  ListMyReviewsQuery,
  UpdateReviewInput,
} from '@core/schemas/web/reviews/userReview.schema';
import { ReviewError, ReviewErrorCode, reviewService } from '@core/services/reviews/review.service';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Create a review for a booking
 * POST /api/v1/learner/bookings/:bookingId/review
 */
export async function createReview(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as { sub: string }).sub;
  const { bookingId } = request.params as BookingReviewParams;
  const body = request.body as CreateReviewBodyInput;

  try {
    const review = await reviewService.createReview(userId, {
      bookingId,
      rating: body.rating,
      content: body.content,
      photos: body.photos,
    });

    return reply.status(201).send({
      success: true,
      data: review,
    });
  } catch (error) {
    request.log.error({ error, userId, bookingId }, 'Error creating review');

    if (error instanceof ReviewError) {
      const statusCode = getStatusCodeForError(error.code);
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    // Return actual error message in development for debugging
    const errorMessage = error instanceof Error ? error.message : 'Failed to create review';
    return reply.status(500).send({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: errorMessage,
      },
    });
  }
}

/**
 * Get review by booking ID
 * GET /api/v1/learner/bookings/:bookingId/review
 */
export async function getReviewByBookingId(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as { sub: string }).sub;
  const { bookingId } = request.params as BookingReviewParams;

  try {
    const review = await reviewService.getReviewByBookingId(userId, bookingId);

    return reply.send({
      success: true,
      data: review, // Can be null if no review exists
    });
  } catch (error) {
    request.log.error({ error, userId, bookingId }, 'Error fetching review');

    if (error instanceof ReviewError) {
      const statusCode = getStatusCodeForError(error.code);
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch review',
      },
    });
  }
}

/**
 * Update a review by booking ID
 * PUT /api/v1/learner/bookings/:bookingId/review
 */
export async function updateReviewByBookingId(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as { sub: string }).sub;
  const { bookingId } = request.params as BookingReviewParams;
  const input = request.body as UpdateReviewInput;

  try {
    const review = await reviewService.updateReviewByBookingId(userId, bookingId, input);

    return reply.send({
      success: true,
      data: review,
    });
  } catch (error) {
    request.log.error({ error, userId, bookingId }, 'Error updating review');

    if (error instanceof ReviewError) {
      const statusCode = getStatusCodeForError(error.code);
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update review',
      },
    });
  }
}

/**
 * Delete a review by booking ID
 * DELETE /api/v1/learner/bookings/:bookingId/review
 */
export async function deleteReviewByBookingId(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as { sub: string }).sub;
  const { bookingId } = request.params as BookingReviewParams;

  try {
    const result = await reviewService.deleteReviewByBookingId(userId, bookingId);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, userId, bookingId }, 'Error deleting review');

    if (error instanceof ReviewError) {
      const statusCode = getStatusCodeForError(error.code);
      return reply.status(statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete review',
      },
    });
  }
}

/**
 * List user's own reviews
 * GET /api/v1/learner/reviews
 */
export async function listMyReviews(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as { sub: string }).sub;
  const query = request.query as ListMyReviewsQuery;

  try {
    const result = await reviewService.listMyReviews(userId, query);

    return reply.send({
      success: true,
      data: result.reviews,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error({ error, userId }, 'Error listing my reviews');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch reviews',
      },
    });
  }
}

/**
 * List completed bookings that haven't been reviewed yet
 * GET /api/v1/learner/bookings/to-review
 */
export async function listBookingsToReview(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as { sub: string }).sub;
  const query = request.query as ListMyReviewsQuery;

  try {
    const result = await reviewService.listBookingsToReview(userId, query);

    return reply.send({
      success: true,
      data: result.bookings,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error({ error, userId }, 'Error listing bookings to review');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch bookings to review',
      },
    });
  }
}

/**
 * List user's reviews that have hub replies
 * GET /api/v1/learner/reviews/with-replies
 */
export async function listReviewsWithReplies(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as { sub: string }).sub;
  const query = request.query as ListMyReviewsQuery;

  try {
    const result = await reviewService.listReviewsWithReplies(userId, query);

    return reply.send({
      success: true,
      data: result.reviews,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error({ error, userId }, 'Error listing reviews with replies');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch reviews with replies',
      },
    });
  }
}

/**
 * Map error code to HTTP status code
 */
function getStatusCodeForError(code: ReviewErrorCode): number {
  switch (code) {
    case ReviewErrorCode.BOOKING_NOT_FOUND:
    case ReviewErrorCode.REVIEW_NOT_FOUND:
      return 404;

    case ReviewErrorCode.BOOKING_NOT_OWNED:
    case ReviewErrorCode.REVIEW_NOT_OWNED:
      return 403;

    case ReviewErrorCode.BOOKING_NOT_COMPLETED:
    case ReviewErrorCode.SPACE_BOOKING_NOT_REVIEWABLE:
    case ReviewErrorCode.INVALID_BOOKING:
    case ReviewErrorCode.REVIEW_EXISTS:
    case ReviewErrorCode.REVIEW_EDIT_EXPIRED:
    case ReviewErrorCode.INVALID_RATING:
    case ReviewErrorCode.CONTENT_TOO_SHORT:
    case ReviewErrorCode.CONTENT_TOO_LONG:
    case ReviewErrorCode.TOO_MANY_PHOTOS:
      return 400;

    default:
      return 500;
  }
}
