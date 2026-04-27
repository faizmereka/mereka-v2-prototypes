import {
  approveMilestone,
  calculateTotalAmount,
  createMilestone,
  createMultipleMilestones,
  deleteMilestone,
  fundMilestones,
  getMilestone,
  getMilestones,
  getOverdueMilestones,
  getUpcomingMilestones,
  refundContractMilestones,
  releasePayment,
  submitWork,
  updateMilestone,
  updateMilestoneWithTracking,
} from '@controllers/hub';
import {
  hubApproveMilestoneSchema,
  hubCreateMilestoneSchema,
  hubCreateMultipleMilestonesSchema,
  hubDeleteMilestoneSchema,
  hubFundMilestonesSchema,
  hubGetMilestoneSchema,
  hubGetMilestonesSchema,
  hubGetOverdueMilestonesSchema,
  hubGetUpcomingMilestonesSchema,
  hubRefundMilestonesSchema,
  hubReleasePaymentSchema,
  hubSubmitWorkSchema,
  hubUpdateMilestoneSchema,
  hubUpdateMilestoneWithTrackingSchema,
} from '@schemas/hub';
import type { FastifyInstance } from 'fastify';

export async function hubMilestoneRoutes(fastify: FastifyInstance) {
  // Create Milestone
  fastify.post('/', {
    schema: {
      tags: ['Milestones'],
      summary: 'Create a milestone',
      description: 'Create a single milestone for a proposal or contract',
      body: hubCreateMilestoneSchema.body,
    },
    handler: createMilestone,
  });

  // Create Multiple Milestones (Bulk)
  fastify.post('/bulk', {
    schema: {
      tags: ['Milestones'],
      summary: 'Create multiple milestones',
      description: 'Create multiple milestones at once',
      body: hubCreateMultipleMilestonesSchema.body,
    },
    handler: createMultipleMilestones,
  });

  // List Milestones
  fastify.get('/', {
    schema: {
      tags: ['Milestones'],
      summary: 'List milestones',
      description: 'Get milestones with filters (proposalId, contractId, jobId, status)',
      querystring: hubGetMilestonesSchema.querystring,
    },
    handler: getMilestones,
  });

  // Get Upcoming Milestones
  fastify.get('/upcoming', {
    schema: {
      tags: ['Milestones'],
      summary: 'Get upcoming milestones',
      description: 'Get milestones due within the next N days',
      querystring: hubGetUpcomingMilestonesSchema.querystring,
    },
    handler: getUpcomingMilestones,
  });

  // Get Overdue Milestones
  fastify.get('/overdue', {
    schema: {
      tags: ['Milestones'],
      summary: 'Get overdue milestones',
      description: 'Get milestones that are past their due date',
      querystring: hubGetOverdueMilestonesSchema.querystring,
    },
    handler: getOverdueMilestones,
  });

  // Calculate Total Amount for Proposal
  fastify.get('/total-amount/:jobProposalId', {
    schema: {
      tags: ['Milestones'],
      summary: 'Calculate total milestone amount',
      description: 'Calculate total amount from all milestones for a proposal',
      params: {
        type: 'object',
        properties: {
          jobProposalId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
        },
        required: ['jobProposalId'],
      },
    },
    handler: calculateTotalAmount,
  });

  // Get Milestone by ID
  fastify.get('/:milestoneId', {
    schema: {
      tags: ['Milestones'],
      summary: 'Get milestone details',
      params: hubGetMilestoneSchema.params,
    },
    handler: getMilestone,
  });

  // Update Milestone (Simple)
  fastify.patch('/:milestoneId', {
    schema: {
      tags: ['Milestones'],
      summary: 'Update milestone',
      description: 'Update milestone details (simple update)',
      params: hubUpdateMilestoneSchema.params,
      body: hubUpdateMilestoneSchema.body,
    },
    handler: updateMilestone,
  });

  // Update Milestone with Change Tracking
  fastify.patch('/:milestoneId/tracked', {
    schema: {
      tags: ['Milestones'],
      summary: 'Update milestone with tracking',
      description: 'Update milestone with change history tracking',
      params: hubUpdateMilestoneWithTrackingSchema.params,
      body: hubUpdateMilestoneWithTrackingSchema.body,
    },
    handler: updateMilestoneWithTracking,
  });

  // Delete Milestone
  fastify.delete('/:milestoneId', {
    schema: {
      tags: ['Milestones'],
      summary: 'Delete milestone',
      description: 'Delete a milestone (only if in active status with no submitted work)',
      params: hubDeleteMilestoneSchema.params,
    },
    handler: deleteMilestone,
  });

  // Submit Work for Milestone
  fastify.post('/:milestoneId/submit-work', {
    schema: {
      tags: ['Milestones'],
      summary: 'Submit work',
      description: 'Expert submits work for milestone approval',
      params: hubSubmitWorkSchema.params,
      body: hubSubmitWorkSchema.body,
    },
    handler: submitWork,
  });

  // Approve Milestone
  fastify.post('/:milestoneId/approve', {
    schema: {
      tags: ['Milestones'],
      summary: 'Approve milestone',
      description: 'Client approves submitted work and processes payment',
      params: hubApproveMilestoneSchema.params,
      body: hubApproveMilestoneSchema.body,
    },
    handler: approveMilestone,
  });

  // ============================================================
  // Payment Processing Routes
  // ============================================================

  // Fund Milestone(s)
  fastify.post('/fund', {
    schema: {
      tags: ['Milestones'],
      summary: 'Fund milestone(s)',
      description:
        'Fund milestone(s) by creating payment intent. Funds held in escrow until work is approved.',
      body: hubFundMilestonesSchema.body,
    },
    handler: fundMilestones,
  });

  // Release Payment for Milestone(s)
  fastify.post('/release-payment', {
    schema: {
      tags: ['Milestones'],
      summary: 'Release payment',
      description: 'Release payment for milestone(s) after work is submitted',
      body: hubReleasePaymentSchema.body,
    },
    handler: releasePayment,
  });

  // Refund Contract Milestones (on offer decline)
  fastify.post('/contract/:contractId/refund', {
    schema: {
      tags: ['Milestones'],
      summary: 'Refund contract milestones',
      description: 'Refund all funded milestones when offer is declined',
      params: hubRefundMilestonesSchema.params,
    },
    handler: refundContractMilestones,
  });
}
