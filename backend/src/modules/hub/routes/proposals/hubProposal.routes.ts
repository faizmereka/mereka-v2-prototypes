import {
  createProposal,
  getProposal,
  getProposals,
  listHubProposals,
  rejectProposal,
  updateProposal,
  withdrawProposal,
} from '@controllers/hub';
import { requireAuth } from '@core/middlewares/auth.middleware';
import { loadHubContext, requireHubAccess } from '@core/middlewares/hubPermission.middleware';
import {
  hubCreateProposalSchema,
  hubGetProposalSchema,
  hubGetProposalsSchema,
  hubListProposalsSchema,
  hubRejectProposalSchema,
  hubScopedGetProposalSchema,
  hubUpdateProposalSchema,
  hubWithdrawProposalSchema,
} from '@schemas/hub';
import type { FastifyInstance } from 'fastify';

export async function hubProposalRoutes(fastify: FastifyInstance) {
  // Create Proposal
  fastify.post('/', {
    schema: {
      tags: ['Proposals'],
      summary: 'Create a new proposal',
      description: 'Expert submits a proposal for a job posting',
      body: hubCreateProposalSchema.body,
    },
    preHandler: [requireAuth],
    handler: createProposal,
  });

  // List Proposals
  fastify.get('/', {
    schema: {
      tags: ['Proposals'],
      summary: 'List proposals',
      description: 'Get proposals with filters (jobId, createdBy, expertId, status)',
      querystring: hubGetProposalsSchema.querystring,
    },
    handler: getProposals,
  });

  // Get Proposal by ID
  fastify.get('/:proposalId', {
    schema: {
      tags: ['Proposals'],
      summary: 'Get proposal details',
      params: hubGetProposalSchema.params,
    },
    handler: getProposal,
  });

  // Update Proposal
  fastify.patch('/:proposalId', {
    schema: {
      tags: ['Proposals'],
      summary: 'Update proposal',
      description: 'Update proposal status or contractId',
      params: hubUpdateProposalSchema.params,
      body: hubUpdateProposalSchema.body,
    },
    handler: updateProposal,
  });

  // Withdraw Proposal
  fastify.post('/:proposalId/withdraw', {
    schema: {
      tags: ['Proposals'],
      summary: 'Withdraw proposal',
      description: 'Expert withdraws their submitted proposal',
      params: hubWithdrawProposalSchema.params,
    },
    handler: withdrawProposal,
  });

  // Reject Proposal
  fastify.post('/:proposalId/reject', {
    schema: {
      tags: ['Proposals'],
      summary: 'Reject proposal',
      description: 'Client rejects a proposal',
      params: hubRejectProposalSchema.params,
    },
    handler: rejectProposal,
  });
}

/**
 * Hub Scoped Proposal Routes
 * Prefix: /api/v1/hub/:hubId/proposals
 */
export async function hubScopedProposalRoutes(fastify: FastifyInstance) {
  // Common preHandlers for hub-scoped routes
  const proposalPreHandlers = [requireAuth, loadHubContext, requireHubAccess];

  // List all proposals for this hub
  fastify.get('/', {
    schema: {
      tags: ['Hub Proposals'],
      summary: 'List proposals for hub',
      description: 'Get all proposals for jobs posted by this hub',
      ...hubListProposalsSchema,
    },
    preHandler: proposalPreHandlers,
    handler: listHubProposals,
  });

  // Get single proposal
  fastify.get('/:proposalId', {
    schema: {
      tags: ['Hub Proposals'],
      summary: 'Get proposal details',
      params: hubScopedGetProposalSchema.params,
    },
    preHandler: proposalPreHandlers,
    handler: getProposal,
  });

  // Reject Proposal
  fastify.post('/:proposalId/reject', {
    schema: {
      tags: ['Hub Proposals'],
      summary: 'Reject proposal',
      description: 'Hub rejects a proposal',
      params: hubRejectProposalSchema.params,
    },
    preHandler: proposalPreHandlers,
    handler: rejectProposal,
  });
}
