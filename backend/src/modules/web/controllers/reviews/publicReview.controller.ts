/**
 * Public Review Controller
 * Handles public review endpoints (no authentication required)
 */

import type {
  HubContractReviewsParams,
  HubContractReviewsQuery,
} from '@core/schemas/hub/contracts/contractReview.schema';
import type {
  ExperienceReviewsParams,
  ExpertiseReviewsParams,
  HubReviewsParams,
  HubReviewsQuery,
  ListReviewsQuery,
} from '@core/schemas/web/reviews/userReview.schema';
import { contractReviewService } from '@core/services/reviews/contractReview.service';
import { reviewService } from '@core/services/reviews/review.service';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * List reviews for an experience
 * GET /api/v1/experiences/:experienceId/reviews
 */
export async function listExperienceReviews(request: FastifyRequest, reply: FastifyReply) {
  const { experienceId } = request.params as ExperienceReviewsParams;
  const query = request.query as ListReviewsQuery;

  try {
    const result = await reviewService.listExperienceReviews(experienceId, query);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, experienceId }, 'Error listing experience reviews');

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
 * List reviews for an expertise
 * GET /api/v1/expertises/:expertiseId/reviews
 */
export async function listExpertiseReviews(request: FastifyRequest, reply: FastifyReply) {
  const { expertiseId } = request.params as ExpertiseReviewsParams;
  const query = request.query as ListReviewsQuery;

  try {
    const result = await reviewService.listExpertiseReviews(expertiseId, query);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, expertiseId }, 'Error listing expertise reviews');

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
 * List reviews for a hub (public)
 * GET /api/v1/hubs/:hubId/reviews
 */
export async function listHubReviews(request: FastifyRequest, reply: FastifyReply) {
  const { hubId } = request.params as HubReviewsParams;
  const query = request.query as HubReviewsQuery;

  try {
    const result = await reviewService.listHubReviews(hubId, query);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, hubId }, 'Error listing hub reviews');

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
 * List contract reviews for a hub (public)
 * GET /api/v1/hubs/:hubId/contract-reviews
 */
export async function listPublicHubContractReviews(request: FastifyRequest, reply: FastifyReply) {
  const { hubId } = request.params as HubContractReviewsParams;
  const query = request.query as HubContractReviewsQuery;

  try {
    const result = await contractReviewService.listHubContractReviews(hubId, query);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, hubId }, 'Error listing hub contract reviews');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch contract reviews',
      },
    });
  }
}
