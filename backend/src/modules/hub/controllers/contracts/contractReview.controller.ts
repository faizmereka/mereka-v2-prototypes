/**
 * Contract Review Controller
 * HTTP handlers for contract review operations
 */

import type {
  ContractReviewParams,
  ContractReviewUpdateParams,
  CreateContractReviewInput,
  HubContractReviewsParams,
  HubContractReviewsQuery,
  UpdateContractReviewInput,
} from '@core/schemas/hub/contracts/contractReview.schema';
import {
  ContractReviewError,
  ContractReviewErrorCode,
  contractReviewService,
} from '@core/services/reviews/contractReview.service';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Map error codes to HTTP status codes
 */
function getStatusCode(code: ContractReviewErrorCode): number {
  switch (code) {
    case ContractReviewErrorCode.CONTRACT_NOT_FOUND:
    case ContractReviewErrorCode.REVIEW_NOT_FOUND:
      return 404;
    case ContractReviewErrorCode.NOT_CONTRACT_PARTY:
    case ContractReviewErrorCode.REVIEW_NOT_OWNED:
      return 403;
    case ContractReviewErrorCode.REVIEW_EXISTS:
      return 409;
    case ContractReviewErrorCode.CONTRACT_NOT_COMPLETED:
    case ContractReviewErrorCode.REVIEW_EDIT_EXPIRED:
    case ContractReviewErrorCode.INVALID_RATING:
    case ContractReviewErrorCode.INVALID_CRITERIA:
      return 400;
    default:
      return 400;
  }
}

/**
 * Create a contract review
 * POST /hub/:hubId/contracts/:contractId/reviews
 */
export async function createContractReview(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { hubId, contractId } = request.params as ContractReviewParams;
    const body = request.body as CreateContractReviewInput;

    const review = await contractReviewService.createReview(hubId, contractId, body);

    return reply.status(201).send({
      success: true,
      data: review,
      message: 'Review created successfully',
    });
  } catch (error) {
    request.log.error(
      { error, params: request.params, body: request.body },
      'Error creating contract review',
    );

    if (error instanceof ContractReviewError) {
      return reply.status(getStatusCode(error.code)).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    return reply.status(400).send({
      success: false,
      error: {
        code: 'REVIEW_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create review',
      },
    });
  }
}

/**
 * Get contract reviews (my review + received review)
 * GET /hub/:hubId/contracts/:contractId/reviews
 */
export async function getContractReviews(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { hubId, contractId } = request.params as ContractReviewParams;

    const reviews = await contractReviewService.getContractReviews(hubId, contractId);

    return reply.send({
      success: true,
      data: reviews,
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error fetching contract reviews');

    if (error instanceof ContractReviewError) {
      return reply.status(getStatusCode(error.code)).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    return reply.status(400).send({
      success: false,
      error: {
        code: 'REVIEW_FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch reviews',
      },
    });
  }
}

/**
 * Update a contract review
 * PUT /hub/:hubId/contracts/:contractId/reviews/:reviewId
 */
export async function updateContractReview(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { hubId, contractId, reviewId } = request.params as ContractReviewUpdateParams;
    const body = request.body as UpdateContractReviewInput;

    const review = await contractReviewService.updateReview(hubId, contractId, reviewId, body);

    return reply.send({
      success: true,
      data: review,
      message: 'Review updated successfully',
    });
  } catch (error) {
    request.log.error(
      { error, params: request.params, body: request.body },
      'Error updating contract review',
    );

    if (error instanceof ContractReviewError) {
      return reply.status(getStatusCode(error.code)).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    return reply.status(400).send({
      success: false,
      error: {
        code: 'REVIEW_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update review',
      },
    });
  }
}

/**
 * Get review status for a contract
 * GET /hub/:hubId/contracts/:contractId/reviews/status
 */
export async function getContractReviewStatus(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { hubId, contractId } = request.params as ContractReviewParams;

    const status = await contractReviewService.getReviewStatus(hubId, contractId);

    return reply.send({
      success: true,
      data: status,
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error fetching review status');

    if (error instanceof ContractReviewError) {
      return reply.status(getStatusCode(error.code)).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    return reply.status(400).send({
      success: false,
      error: {
        code: 'STATUS_FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch review status',
      },
    });
  }
}

/**
 * List contract reviews received by a hub (public endpoint)
 * GET /hubs/:hubId/contract-reviews
 */
export async function listHubContractReviews(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { hubId } = request.params as HubContractReviewsParams;
    const query = request.query as HubContractReviewsQuery;

    const result = await contractReviewService.listHubContractReviews(hubId, query);

    return reply.send({
      success: true,
      data: result.reviews,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error(
      { error, params: request.params, query: request.query },
      'Error listing hub contract reviews',
    );

    return reply.status(400).send({
      success: false,
      error: {
        code: 'REVIEW_LIST_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list reviews',
      },
    });
  }
}
