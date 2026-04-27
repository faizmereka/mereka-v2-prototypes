/**
 * Hub Review Controller
 * Handles review operations for hub dashboard
 */

import type { HubReviewParams, HubReviewsQuery } from '@core/schemas/hub/reviews/hubReview.schema';
import { hubReviewService } from '@core/services/reviews/hubReview.service';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * List reviews for a hub (dashboard view)
 * GET /api/v1/hub/:hubId/reviews
 */
export async function listHubReviews(request: FastifyRequest, reply: FastifyReply) {
  const { hubId } = request.params as HubReviewParams;
  const query = request.query as HubReviewsQuery;

  try {
    const result = await hubReviewService.listHubReviews(hubId, query);

    return reply.send({
      success: true,
      data: result.reviews,
      meta: result.pagination,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    request.log.error({ error, hubId }, 'Error listing hub reviews');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: errorMessage || 'Failed to fetch reviews',
      },
    });
  }
}

/**
 * Get hub review statistics
 * GET /api/v1/hub/:hubId/reviews/stats
 */
export async function getHubReviewStats(request: FastifyRequest, reply: FastifyReply) {
  const { hubId } = request.params as HubReviewParams;

  try {
    const stats = await hubReviewService.getHubReviewStats(hubId);

    return reply.send({
      success: true,
      data: stats,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    request.log.error({ error, hubId }, 'Error fetching hub review stats');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: errorMessage || 'Failed to fetch review stats',
      },
    });
  }
}
