import type {
  HubApproveTimelogInput,
  HubCreateTimelogInput,
  HubGetTimelogsQuery,
  HubGetWeeklySummaryQuery,
  HubRejectTimelogInput,
  HubUpdateTimelogInput,
} from '@schemas/hub';

import { hubTimelogService } from '@services/hub';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Create a new timelog entry
 */
export async function createTimelog(
  request: FastifyRequest<{ Body: HubCreateTimelogInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.sub || '507f1f77bcf86cd799439011'; // Valid test ObjectId;

    const timelog = await hubTimelogService.createTimelog(request.body, userId);

    return reply.status(201).send({
      success: true,
      data: timelog,
      message: 'Timelog entry created successfully',
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Error creating timelog');
    const statusCode =
      error instanceof Error && error.message.includes('already exists') ? 409 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'TIMELOG_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create timelog entry',
      },
    });
  }
}

/**
 * Get timelog entries with filters
 */
export async function getTimelogs(
  request: FastifyRequest<{ Querystring: HubGetTimelogsQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await hubTimelogService.getTimelogs(request.query);

    return reply.send({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error fetching timelogs');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'TIMELOG_LIST_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch timelog entries',
      },
    });
  }
}

/**
 * Get timelog entry by ID
 */
export async function getTimelog(
  request: FastifyRequest<{ Params: { timelogId: string } }>,
  reply: FastifyReply,
) {
  try {
    const timelog = await hubTimelogService.getTimelogById(request.params.timelogId);

    return reply.send({
      success: true,
      data: timelog,
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error fetching timelog');
    const statusCode =
      error instanceof Error && error.message === 'Timelog entry not found' ? 404 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'TIMELOG_GET_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch timelog entry',
      },
    });
  }
}

/**
 * Update timelog entry
 */
export async function updateTimelog(
  request: FastifyRequest<{ Params: { timelogId: string }; Body: HubUpdateTimelogInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.sub || '507f1f77bcf86cd799439011'; // Valid test ObjectId;

    const timelog = await hubTimelogService.updateTimelog(
      request.params.timelogId,
      request.body,
      userId,
    );

    return reply.send({
      success: true,
      data: timelog,
      message: 'Timelog entry updated successfully',
    });
  } catch (error) {
    request.log.error(
      { error, params: request.params, body: request.body },
      'Error updating timelog',
    );
    const statusCode =
      error instanceof Error && error.message === 'Timelog entry not found' ? 404 : 403;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'TIMELOG_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update timelog entry',
      },
    });
  }
}

/**
 * Delete timelog entry
 */
export async function deleteTimelog(
  request: FastifyRequest<{ Params: { timelogId: string } }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.sub || '507f1f77bcf86cd799439011'; // Valid test ObjectId;

    const result = await hubTimelogService.deleteTimelog(request.params.timelogId, userId);

    return reply.send({
      success: true,
      message: result.message,
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error deleting timelog');
    const statusCode =
      error instanceof Error && error.message === 'Timelog entry not found' ? 404 : 403;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'TIMELOG_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete timelog entry',
      },
    });
  }
}

/**
 * Submit timelog for approval
 */
export async function submitTimelog(
  request: FastifyRequest<{ Params: { timelogId: string } }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.sub || '507f1f77bcf86cd799439011'; // Valid test ObjectId;

    const timelog = await hubTimelogService.submitTimelog(request.params.timelogId, userId);

    return reply.send({
      success: true,
      data: timelog,
      message: 'Timelog entry submitted successfully',
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error submitting timelog');
    const statusCode =
      error instanceof Error && error.message === 'Timelog entry not found' ? 404 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'TIMELOG_SUBMIT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to submit timelog entry',
      },
    });
  }
}

/**
 * Approve timelog entry (client)
 */
export async function approveTimelog(
  request: FastifyRequest<{ Params: { timelogId: string }; Body: HubApproveTimelogInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.sub || '507f1f77bcf86cd799439011'; // Valid test ObjectId;

    const timelog = await hubTimelogService.approveTimelog(
      request.params.timelogId,
      request.body,
      userId,
    );

    return reply.send({
      success: true,
      data: timelog,
      message: 'Timelog entry approved successfully',
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error approving timelog');
    const statusCode =
      error instanceof Error && error.message === 'Timelog entry not found' ? 404 : 403;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'TIMELOG_APPROVE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to approve timelog entry',
      },
    });
  }
}

/**
 * Reject timelog entry (client)
 */
export async function rejectTimelog(
  request: FastifyRequest<{ Params: { timelogId: string }; Body: HubRejectTimelogInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.sub || '507f1f77bcf86cd799439011'; // Valid test ObjectId;

    const timelog = await hubTimelogService.rejectTimelog(
      request.params.timelogId,
      request.body,
      userId,
    );

    return reply.send({
      success: true,
      data: timelog,
      message: 'Timelog entry rejected',
    });
  } catch (error) {
    request.log.error(
      { error, params: request.params, body: request.body },
      'Error rejecting timelog',
    );
    const statusCode =
      error instanceof Error && error.message === 'Timelog entry not found' ? 404 : 403;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'TIMELOG_REJECT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to reject timelog entry',
      },
    });
  }
}

/**
 * Get weekly summary
 */
export async function getWeeklySummary(
  request: FastifyRequest<{ Querystring: HubGetWeeklySummaryQuery }>,
  reply: FastifyReply,
) {
  try {
    const summary = await hubTimelogService.getWeeklySummary(request.query);

    return reply.send({
      success: true,
      data: summary,
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error fetching weekly summary');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'TIMELOG_WEEKLY_SUMMARY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch weekly summary',
      },
    });
  }
}
