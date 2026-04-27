import type {
  HubApproveMilestoneInput,
  HubCreateMilestoneInput,
  HubCreateMultipleMilestonesInput,
  HubGetMilestonesQuery,
  HubGetOverdueMilestonesQuery,
  HubGetUpcomingMilestonesQuery,
  HubSubmitWorkInput,
  HubUpdateMilestoneInput,
  HubUpdateMilestoneWithTrackingInput,
} from '@schemas/hub';

import { hubMilestoneService } from '@services/hub';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Create a single milestone
 */
export async function createMilestone(
  request: FastifyRequest<{ Body: HubCreateMilestoneInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.id || '507f1f77bcf86cd799439011'; // Valid test ObjectId;

    const milestone = await hubMilestoneService.createMilestone(request.body, userId);

    return reply.status(201).send({
      success: true,
      data: milestone,
      message: 'Milestone created successfully',
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Error creating milestone');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'MILESTONE_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create milestone',
      },
    });
  }
}

/**
 * Create multiple milestones (bulk)
 */
export async function createMultipleMilestones(
  request: FastifyRequest<{ Body: HubCreateMultipleMilestonesInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.id || '507f1f77bcf86cd799439011'; // Valid test ObjectId;

    const milestones = await hubMilestoneService.createMultipleMilestones(request.body, userId);

    return reply.status(201).send({
      success: true,
      data: milestones,
      message: `${milestones.length} milestones created successfully`,
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Error creating milestones');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'MILESTONE_BULK_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create milestones',
      },
    });
  }
}

/**
 * Get milestones with filters
 */
export async function getMilestones(
  request: FastifyRequest<{ Querystring: HubGetMilestonesQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await hubMilestoneService.getMilestones(request.query);

    return reply.send({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error fetching milestones');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'MILESTONE_LIST_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch milestones',
      },
    });
  }
}

/**
 * Get milestone by ID
 */
export async function getMilestone(
  request: FastifyRequest<{ Params: { milestoneId: string } }>,
  reply: FastifyReply,
) {
  try {
    const milestone = await hubMilestoneService.getMilestoneById(request.params.milestoneId);

    return reply.send({
      success: true,
      data: milestone,
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error fetching milestone');
    const statusCode =
      error instanceof Error && error.message === 'Milestone not found' ? 404 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'MILESTONE_GET_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch milestone',
      },
    });
  }
}

/**
 * Update milestone (simple)
 */
export async function updateMilestone(
  request: FastifyRequest<{ Params: { milestoneId: string }; Body: HubUpdateMilestoneInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.id || '507f1f77bcf86cd799439011'; // Valid test ObjectId;

    const milestone = await hubMilestoneService.updateMilestone(
      request.params.milestoneId,
      request.body,
      userId,
    );

    return reply.send({
      success: true,
      data: milestone,
      message: 'Milestone updated successfully',
    });
  } catch (error) {
    request.log.error(
      { error, params: request.params, body: request.body },
      'Error updating milestone',
    );
    const statusCode =
      error instanceof Error && error.message === 'Milestone not found' ? 404 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'MILESTONE_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update milestone',
      },
    });
  }
}

/**
 * Update milestone with change tracking
 */
export async function updateMilestoneWithTracking(
  request: FastifyRequest<{
    Params: { milestoneId: string };
    Body: HubUpdateMilestoneWithTrackingInput;
  }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.id || '507f1f77bcf86cd799439011'; // Valid test ObjectId;

    const milestone = await hubMilestoneService.updateMilestoneWithTracking(
      request.params.milestoneId,
      request.body,
      userId,
    );

    return reply.send({
      success: true,
      data: milestone,
      message: 'Milestone updated with change history',
    });
  } catch (error) {
    request.log.error(
      { error, params: request.params, body: request.body },
      'Error updating milestone',
    );
    const statusCode =
      error instanceof Error && error.message === 'Milestone not found' ? 404 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'MILESTONE_UPDATE_TRACKED_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update milestone',
      },
    });
  }
}

/**
 * Delete milestone
 */
export async function deleteMilestone(
  request: FastifyRequest<{ Params: { milestoneId: string } }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.id || '507f1f77bcf86cd799439011'; // Valid test ObjectId;

    const result = await hubMilestoneService.deleteMilestone(request.params.milestoneId, userId);

    return reply.send({
      success: true,
      message: result.message,
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error deleting milestone');
    const statusCode =
      error instanceof Error && error.message === 'Milestone not found' ? 404 : 403;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'MILESTONE_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete milestone',
      },
    });
  }
}

/**
 * Submit work for milestone (expert)
 */
export async function submitWork(
  request: FastifyRequest<{ Params: { milestoneId: string }; Body: HubSubmitWorkInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.id || '507f1f77bcf86cd799439011'; // Valid test ObjectId;

    const milestone = await hubMilestoneService.submitWork(
      request.params.milestoneId,
      request.body,
      userId,
    );

    return reply.send({
      success: true,
      data: milestone,
      message: 'Work submitted successfully',
    });
  } catch (error) {
    request.log.error(
      { error, params: request.params, body: request.body },
      'Error submitting work',
    );
    const statusCode =
      error instanceof Error && error.message === 'Milestone not found' ? 404 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'MILESTONE_SUBMIT_WORK_ERROR',
        message: error instanceof Error ? error.message : 'Failed to submit work',
      },
    });
  }
}

/**
 * Approve milestone work (client)
 */
export async function approveMilestone(
  request: FastifyRequest<{ Params: { milestoneId: string }; Body: HubApproveMilestoneInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.id || '507f1f77bcf86cd799439011'; // Valid test ObjectId;

    const milestone = await hubMilestoneService.approveMilestone(
      request.params.milestoneId,
      request.body,
      userId,
    );

    return reply.send({
      success: true,
      data: milestone,
      message: 'Milestone approved successfully',
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error approving milestone');
    const statusCode =
      error instanceof Error && error.message === 'Milestone not found' ? 404 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'MILESTONE_APPROVE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to approve milestone',
      },
    });
  }
}

/**
 * Get upcoming milestones
 */
export async function getUpcomingMilestones(
  request: FastifyRequest<{ Querystring: HubGetUpcomingMilestonesQuery }>,
  reply: FastifyReply,
) {
  try {
    const milestones = await hubMilestoneService.getUpcomingMilestones(request.query);

    return reply.send({
      success: true,
      data: milestones,
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error fetching upcoming milestones');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'MILESTONE_UPCOMING_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch upcoming milestones',
      },
    });
  }
}

/**
 * Get overdue milestones
 */
export async function getOverdueMilestones(
  request: FastifyRequest<{ Querystring: HubGetOverdueMilestonesQuery }>,
  reply: FastifyReply,
) {
  try {
    const milestones = await hubMilestoneService.getOverdueMilestones(request.query);

    return reply.send({
      success: true,
      data: milestones,
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error fetching overdue milestones');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'MILESTONE_OVERDUE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch overdue milestones',
      },
    });
  }
}

/**
 * Calculate total amount for a proposal
 */
export async function calculateTotalAmount(
  request: FastifyRequest<{ Params: { jobProposalId: string } }>,
  reply: FastifyReply,
) {
  try {
    const totalAmount = await hubMilestoneService.calculateTotalAmount(
      request.params.jobProposalId,
    );

    return reply.send({
      success: true,
      data: {
        jobProposalId: request.params.jobProposalId,
        totalAmount,
      },
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error calculating total amount');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'MILESTONE_CALCULATE_TOTAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to calculate total amount',
      },
    });
  }
}

// ============================================================
// Payment Processing Endpoints
// ============================================================

/**
 * Fund milestone(s) - Creates payment intent and updates milestone status
 */
export async function fundMilestones(
  request: FastifyRequest<{
    Body: {
      milestoneIds: string[];
      customerId: string;
      paymentMethodId: string;
      currency: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const result = await hubMilestoneService.fundMilestones(request.body);

    return reply.status(201).send({
      success: true,
      data: result,
      message: 'Milestone(s) funded successfully and held in escrow',
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Error funding milestones');

    return reply.status(400).send({
      success: false,
      error: {
        code: 'MILESTONE_FUND_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fund milestones',
      },
    });
  }
}

/**
 * Release payment for milestone(s) - Updates status to released
 */
export async function releasePayment(
  request: FastifyRequest<{
    Body: {
      milestoneIds: string[];
    };
  }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.id || '507f1f77bcf86cd799439011';

    const result = await hubMilestoneService.releaseMilestonePayment(
      request.body.milestoneIds,
      userId,
    );

    return reply.send({
      success: true,
      data: result,
      message: 'Payment released successfully',
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Error releasing payment');

    return reply.status(400).send({
      success: false,
      error: {
        code: 'MILESTONE_RELEASE_PAYMENT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to release payment',
      },
    });
  }
}

/**
 * Refund milestones for a contract (on offer decline)
 */
export async function refundContractMilestones(
  request: FastifyRequest<{
    Params: { contractId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const result = await hubMilestoneService.refundMilestones(request.params.contractId);

    return reply.send({
      success: result.success,
      data: result,
      message: result.message || 'Milestones refunded successfully',
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error refunding milestones');

    return reply.status(400).send({
      success: false,
      error: {
        code: 'MILESTONE_REFUND_ERROR',
        message: error instanceof Error ? error.message : 'Failed to refund milestones',
      },
    });
  }
}
