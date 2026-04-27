/**
 * Checkout Proposal Controller
 * Handles proposal submission from checkout.mereka.io
 */

import type { SubmitProposalInput } from '@core/schemas/shared/checkout/checkoutProposal.schema';
import { checkoutProposalService } from '@core/services/shared/checkout/checkoutProposal.service';
import { getUserId } from '@core/utils/auth-helpers';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Initialize proposal checkout
 * GET /checkout/proposal/:jobId
 */
export async function initProposalCheckout(
  request: FastifyRequest<{ Params: { jobId: string } }>,
  reply: FastifyReply,
) {
  try {
    const { jobId } = request.params;
    const userId = getUserId(request);

    const result = await checkoutProposalService.initProposalCheckout(jobId, userId);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Init proposal checkout failed');

    // Job not found
    if (error instanceof Error && error.message.includes('not found')) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: error.message,
        },
      });
    }

    // Job not accepting proposals
    if (error instanceof Error && error.message.includes('no longer accepting')) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'JOB_NOT_ACCEPTING_PROPOSALS',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'INIT_PROPOSAL_CHECKOUT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to initialize proposal checkout',
      },
    });
  }
}

/**
 * Submit proposal
 * POST /checkout/proposal
 */
export async function submitProposal(
  request: FastifyRequest<{ Body: SubmitProposalInput }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);

    const result = await checkoutProposalService.submitProposal(request.body, userId);

    return reply.status(201).send({
      success: true,
      data: result,
      message: 'Proposal submitted successfully',
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Submit proposal failed');

    // Duplicate proposal
    if (error instanceof Error && error.message.includes('already submitted')) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'DUPLICATE_PROPOSAL',
          message: error.message,
        },
      });
    }

    // Job not found
    if (error instanceof Error && error.message.includes('Job not found')) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: error.message,
        },
      });
    }

    // Validation errors
    if (
      error instanceof Error &&
      (error.message.includes('required') ||
        error.message.includes('cannot exceed') ||
        error.message.includes('must be'))
    ) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'SUBMIT_PROPOSAL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to submit proposal',
      },
    });
  }
}

/**
 * Get proposal by ID (for success page)
 * GET /checkout/proposal/success/:proposalId
 */
export async function getProposalSuccess(
  request: FastifyRequest<{ Params: { proposalId: string } }>,
  reply: FastifyReply,
) {
  try {
    const { proposalId } = request.params;
    const userId = getUserId(request);

    const result = await checkoutProposalService.getProposalById(proposalId, userId);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Get proposal success failed');

    // Proposal not found
    if (error instanceof Error && error.message.includes('not found')) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: error.message,
        },
      });
    }

    // Not authorized
    if (error instanceof Error && error.message.includes('Not authorized')) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_PROPOSAL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get proposal',
      },
    });
  }
}
