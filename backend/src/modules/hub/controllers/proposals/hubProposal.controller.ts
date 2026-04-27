import type {
  HubCreateProposalInput,
  HubGetProposalsQuery,
  HubUpdateProposalInput,
} from '@schemas/hub';

import { hubProposalService } from '@services/hub';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Create a new proposal
 */
export async function createProposal(
  request: FastifyRequest<{ Body: HubCreateProposalInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.sub || request.user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User ID not found in token' },
      });
    }

    const proposal = await hubProposalService.createProposal(request.body, userId);

    return reply.status(201).send({
      success: true,
      data: proposal,
      message: 'Proposal created successfully',
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Error creating proposal');
    const statusCode =
      error instanceof Error && error.message.includes('already submitted') ? 409 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'PROPOSAL_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create proposal',
      },
    });
  }
}

/**
 * Get proposals with filters
 */
export async function getProposals(
  request: FastifyRequest<{ Querystring: HubGetProposalsQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await hubProposalService.getProposals(request.query);

    return reply.send({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error fetching proposals');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'PROPOSAL_LIST_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch proposals',
      },
    });
  }
}

/**
 * List proposals for a hub (hubId from path params)
 * Used in scoped hub routes: /hub/:hubId/proposals
 *
 * Default: Returns proposals where this hub is the CLIENT (job poster/employer)
 * With expertHubId query param: Returns proposals submitted by experts from this hub
 */
export async function listHubProposals(
  request: FastifyRequest<{
    Params: { hubId: string };
    Querystring: Omit<HubGetProposalsQuery, 'clientHubId' | 'expertHubId'> & {
      expertHubId?: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const { expertHubId, ...restQuery } = request.query;

    // If expertHubId is passed, filter by expert's hub
    // Otherwise, default to clientHubId (employer perspective)
    const query = expertHubId
      ? { ...restQuery, expertHubId }
      : { ...restQuery, clientHubId: hubId };

    const result = await hubProposalService.getProposals(query);

    return reply.send({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error(
      { error, params: request.params, query: request.query },
      'Error fetching hub proposals',
    );
    return reply.status(400).send({
      success: false,
      error: {
        code: 'PROPOSAL_LIST_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch proposals',
      },
    });
  }
}

/**
 * Get proposal by ID
 * Supports both hub-scoped routes (/hub/:hubId/proposals/:proposalId)
 * and general routes (/proposals/:proposalId)
 */
export async function getProposal(
  request: FastifyRequest<{ Params: { proposalId: string; hubId?: string } }>,
  reply: FastifyReply,
) {
  try {
    // Get hubId from params (hub-scoped route) or from request context
    const hubId = request.params.hubId || request.hubContext?.hubId;
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.id;

    const proposal = await hubProposalService.getProposalById(
      request.params.proposalId,
      hubId,
      userId,
    );

    return reply.send({
      success: true,
      data: proposal,
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error fetching proposal');
    const statusCode =
      error instanceof Error && error.message === 'Proposal not found'
        ? 404
        : error instanceof Error && error.message.includes('Not authorized')
          ? 403
          : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'PROPOSAL_GET_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch proposal',
      },
    });
  }
}

/**
 * Update proposal (status/contractId)
 */
export async function updateProposal(
  request: FastifyRequest<{ Params: { proposalId: string }; Body: HubUpdateProposalInput }>,
  reply: FastifyReply,
) {
  try {
    const proposal = await hubProposalService.updateProposal(
      request.params.proposalId,
      request.body,
    );

    return reply.send({
      success: true,
      data: proposal,
      message: 'Proposal updated successfully',
    });
  } catch (error) {
    request.log.error(
      { error, params: request.params, body: request.body },
      'Error updating proposal',
    );
    const statusCode = error instanceof Error && error.message === 'Proposal not found' ? 404 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'PROPOSAL_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update proposal',
      },
    });
  }
}

/**
 * Withdraw proposal (expert)
 */
export async function withdrawProposal(
  request: FastifyRequest<{ Params: { proposalId: string } }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.sub || request.user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User ID not found in token' },
      });
    }

    const proposal = await hubProposalService.withdrawProposal(request.params.proposalId, userId);

    return reply.send({
      success: true,
      data: proposal,
      message: 'Proposal withdrawn successfully',
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error withdrawing proposal');
    const statusCode = error instanceof Error && error.message === 'Proposal not found' ? 404 : 403;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'PROPOSAL_WITHDRAW_ERROR',
        message: error instanceof Error ? error.message : 'Failed to withdraw proposal',
      },
    });
  }
}

/**
 * Reject proposal (client)
 * Supports both hub-scoped routes (/hub/:hubId/proposals/:proposalId/reject)
 * and general routes (/proposals/:proposalId/reject)
 */
export async function rejectProposal(
  request: FastifyRequest<{ Params: { proposalId: string; hubId?: string } }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.sub || request.user?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User ID not found in token' },
      });
    }

    // Get hubId from params (hub-scoped route) or from request context
    const hubId = request.params.hubId || request.hubContext?.hubId;

    const proposal = await hubProposalService.rejectProposal(
      request.params.proposalId,
      userId,
      hubId,
    );

    return reply.send({
      success: true,
      data: proposal,
      message: 'Proposal rejected successfully',
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error rejecting proposal');
    const statusCode =
      error instanceof Error && error.message === 'Proposal not found'
        ? 404
        : error instanceof Error && error.message.includes('Not authorized')
          ? 403
          : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'PROPOSAL_REJECT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to reject proposal',
      },
    });
  }
}
