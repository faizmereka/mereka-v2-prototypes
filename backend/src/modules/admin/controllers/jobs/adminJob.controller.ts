import type { JobStatus } from '@core/models/Job';
import { type AdminListJobsQuery, adminJobService } from '@core/services/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get job statistics for admin dashboard
 */
export async function getJobStats(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const stats = await adminJobService.getJobStats();

    return reply.status(200).send({
      success: true,
      data: stats,
    });
  } catch (error) {
    _request.log.error({ error }, 'Failed to get job stats');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'JOB_STATS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get job stats',
      },
    });
  }
}

/**
 * List all jobs with filtering and pagination
 */
export async function listJobs(
  request: FastifyRequest<{
    Querystring: AdminListJobsQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const result = await adminJobService.listJobs(request.query);

    return reply.status(200).send({
      success: true,
      data: result.items,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to list jobs');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_JOBS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list jobs',
      },
    });
  }
}

/**
 * Get job by ID with full details
 */
export async function getJobById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const job = await adminJobService.getJobById(request.params.id);

    return reply.status(200).send({
      success: true,
      data: job,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get job');

    if (error instanceof Error && error.message === 'Job not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found',
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_JOB_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get job',
      },
    });
  }
}

/**
 * Update job status
 */
export async function updateJobStatus(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { status: JobStatus; reason?: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { status } = request.body;
    const job = await adminJobService.updateJobStatus(request.params.id, status);

    return reply.status(200).send({
      success: true,
      data: job,
      message: `Job status updated to ${status}`,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to update job status');

    if (error instanceof Error && error.message === 'Job not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found',
        },
      });
    }

    return reply.status(400).send({
      success: false,
      error: {
        code: 'UPDATE_JOB_STATUS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update job status',
      },
    });
  }
}

/**
 * Delete job (soft delete - set status to CANCELLED)
 */
export async function deleteJob(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    await adminJobService.deleteJob(request.params.id);

    return reply.status(200).send({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to delete job');

    if (error instanceof Error && error.message === 'Job not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found',
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'DELETE_JOB_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete job',
      },
    });
  }
}

/**
 * Bulk update job status
 */
export async function bulkUpdateJobStatus(
  request: FastifyRequest<{
    Body: { jobIds: string[]; status: JobStatus };
  }>,
  reply: FastifyReply,
) {
  try {
    const { jobIds, status } = request.body;
    const result = await adminJobService.bulkUpdateJobStatus(jobIds, status);

    return reply.status(200).send({
      success: true,
      data: result,
      message: `${result.modifiedCount} jobs updated to ${status}`,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to bulk update job status');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'BULK_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to bulk update jobs',
      },
    });
  }
}
