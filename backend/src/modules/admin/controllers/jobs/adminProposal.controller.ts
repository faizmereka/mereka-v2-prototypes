import type { ProposalStatus } from '@core/models/JobProposal';
import { type AdminListProposalsQuery, adminProposalService } from '@core/services/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * List proposals with filtering and pagination
 */
export async function listProposals(
  request: FastifyRequest<{
    Querystring: AdminListProposalsQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const result = await adminProposalService.listProposals(request.query);

    return reply.status(200).send({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to list proposals');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_PROPOSALS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list proposals',
      },
    });
  }
}

/**
 * Get proposal by ID
 */
export async function getProposalById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const proposal = await adminProposalService.getProposalById(request.params.id);

    return reply.status(200).send({
      success: true,
      data: proposal,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get proposal');

    if (error instanceof Error && error.message === 'Proposal not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: 'Proposal not found',
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_PROPOSAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get proposal',
      },
    });
  }
}

/**
 * Update proposal status
 */
export async function updateProposalStatus(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { status: ProposalStatus; reason?: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { status } = request.body;
    const proposal = await adminProposalService.updateProposalStatus(request.params.id, status);

    return reply.status(200).send({
      success: true,
      data: proposal,
      message: `Proposal status updated to ${status}`,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to update proposal status');

    if (error instanceof Error && error.message === 'Proposal not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'PROPOSAL_NOT_FOUND',
          message: 'Proposal not found',
        },
      });
    }

    return reply.status(400).send({
      success: false,
      error: {
        code: 'UPDATE_PROPOSAL_STATUS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update proposal status',
      },
    });
  }
}
