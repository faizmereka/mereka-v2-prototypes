/**
 * Admin Review Controller
 * HTTP handlers for admin review management
 */

import type {
  GetReviewQuery,
  ListReviewsQuery,
  ModerateReviewBody,
  ReviewIdParams,
  ReviewTrendsQuery,
} from '@core/schemas/admin/reviews/adminReview.schema';
import { adminReviewService } from '@core/services/admin/reviews/adminReview.service';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * List all reviews
 * GET /admin/reviews
 */
export async function listReviews(request: FastifyRequest, reply: FastifyReply) {
  try {
    const query = request.query as ListReviewsQuery;
    const result = await adminReviewService.listReviews(query);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error listing reviews');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_ERROR',
        message: 'Failed to list reviews',
      },
    });
  }
}

/**
 * List booking reviews only
 * GET /admin/reviews/bookings
 */
export async function listBookingReviews(request: FastifyRequest, reply: FastifyReply) {
  try {
    const query = request.query as ListReviewsQuery;
    const result = await adminReviewService.listReviews({ ...query, type: 'booking' });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error listing booking reviews');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_ERROR',
        message: 'Failed to list booking reviews',
      },
    });
  }
}

/**
 * List contract reviews only
 * GET /admin/reviews/contracts
 */
export async function listContractReviews(request: FastifyRequest, reply: FastifyReply) {
  try {
    const query = request.query as ListReviewsQuery;
    const result = await adminReviewService.listReviews({ ...query, type: 'contract' });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error listing contract reviews');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_ERROR',
        message: 'Failed to list contract reviews',
      },
    });
  }
}

/**
 * Get review by ID
 * GET /admin/reviews/:reviewId
 */
export async function getReview(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { reviewId } = request.params as ReviewIdParams;
    const { type } = request.query as GetReviewQuery;

    const review = await adminReviewService.getReviewById(reviewId, type);

    if (!review) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Review not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: review,
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error getting review');
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
 * Moderate a review
 * PATCH /admin/reviews/:reviewId/moderate
 */
export async function moderateReview(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { reviewId } = request.params as ReviewIdParams;
    const body = request.body as ModerateReviewBody;

    // Get admin ID from auth
    // @ts-expect-error - user is defined by auth middleware
    const adminId = request.user?.sub || request.user?.id;
    if (!adminId) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin ID not found',
        },
      });
    }

    const result = await adminReviewService.moderateReview(reviewId, adminId, body);

    if (!result) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Review not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: result,
      message: `Review ${body.action === 'delete' ? 'deleted' : body.action === 'hide' ? 'hidden' : 'restored'} successfully`,
    });
  } catch (error) {
    request.log.error(
      { error, params: request.params, body: request.body },
      'Error moderating review',
    );
    return reply.status(500).send({
      success: false,
      error: {
        code: 'MODERATION_ERROR',
        message: 'Failed to moderate review',
      },
    });
  }
}

/**
 * Get review statistics
 * GET /admin/reviews/stats
 */
export async function getReviewStats(request: FastifyRequest, reply: FastifyReply) {
  try {
    const stats = await adminReviewService.getStats();

    return reply.send({
      success: true,
      data: stats,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting review stats');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: 'Failed to fetch review statistics',
      },
    });
  }
}

/**
 * Get review trends
 * GET /admin/reviews/trends
 */
export async function getReviewTrends(request: FastifyRequest, reply: FastifyReply) {
  try {
    const query = request.query as ReviewTrendsQuery;
    const trends = await adminReviewService.getTrends(query);

    return reply.send({
      success: true,
      data: trends,
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error getting review trends');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'TRENDS_ERROR',
        message: 'Failed to fetch review trends',
      },
    });
  }
}
