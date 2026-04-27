import type {
  HubCreateJobInput,
  HubGenerateSummaryInput,
  HubGetJobParams,
  HubGetJobsQuery,
  HubGetStatsParams,
  HubUpdateJobInput,
  HubUpsertJobInput,
} from '@schemas/hub';
import { hubJobService } from '@services/hub';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Create job (POST /hub/jobs)
 */
export async function createJob(
  request: FastifyRequest<{ Body: HubCreateJobInput }>,
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

    const job = await hubJobService.createJob(request.body, userId);

    return reply.status(201).send({
      success: true,
      data: job,
      message: 'Job created successfully',
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Error creating job');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'JOB_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create job',
      },
    });
  }
}

/**
 * Update job (PATCH /hub/jobs/:id)
 */
export async function updateJob(
  request: FastifyRequest<{ Params: HubGetJobParams; Body: HubUpdateJobInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.sub || request.user?.id || '';

    const job = await hubJobService.updateJob(request.params.id, request.body, userId);

    if (!job) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found',
        },
      });
    }

    return reply.status(200).send({
      success: true,
      data: job,
      message: 'Job updated successfully',
    });
  } catch (error) {
    request.log.error({ error, params: request.params, body: request.body }, 'Error updating job');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'JOB_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update job',
      },
    });
  }
}

/**
 * Generate AI summary for job description (POST /hub/jobs/generate-summary)
 */
export async function generateJobSummary(
  request: FastifyRequest<{ Body: HubGenerateSummaryInput }>,
  reply: FastifyReply,
) {
  try {
    const summary = await hubJobService.generateSummary(request.body.description);

    return reply.send({
      success: true,
      data: { summary },
    });
  } catch (error) {
    request.log.error({ error }, 'Error generating job summary');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'SUMMARY_GENERATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate summary',
      },
    });
  }
}

/**
 * @deprecated Use createJob + updateJob instead
 * Upsert job (Create or Update)
 */
export async function upsertJob(
  request: FastifyRequest<{ Body: HubUpsertJobInput }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.sub || request.user?.id || '';

    const job = await hubJobService.upsertJob(request.body, userId);

    const isUpdate = !!request.body.id;
    const message = isUpdate ? 'Job updated successfully' : 'Job created successfully';
    const statusCode = isUpdate ? 200 : 201;

    return reply.status(statusCode).send({
      success: true,
      data: job,
      message,
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Error upserting job');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'JOB_UPSERT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to save job',
      },
    });
  }
}

/**
 * Get list of jobs
 */
export async function getJobs(
  request: FastifyRequest<{ Querystring: HubGetJobsQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await hubJobService.getJobs(request.query);

    return reply.send({
      success: true,
      data: result.jobs,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error fetching jobs');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'JOB_LIST_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch jobs',
      },
    });
  }
}

/**
 * Get single job by ID
 */
export async function getJob(
  request: FastifyRequest<{ Params: HubGetJobParams }>,
  reply: FastifyReply,
) {
  try {
    const job = await hubJobService.getJobById(request.params.id);

    if (!job) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: 'Job not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: job,
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error fetching job');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'JOB_GET_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch job',
      },
    });
  }
}

/**
 * Delete job
 */
export async function deleteJob(
  request: FastifyRequest<{ Params: HubGetJobParams }>,
  reply: FastifyReply,
) {
  try {
    // @ts-expect-error - user is not yet defined in FastifyRequest type
    const userId = request.user?.sub || request.user?.id || ''; // Valid test ObjectId;
    await hubJobService.deleteJob(request.params.id, userId);

    return reply.send({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error deleting job');
    const statusCode = error instanceof Error && error.message === 'Job not found' ? 404 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'JOB_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete job',
      },
    });
  }
}

/**
 * Get stats for hub jobs page (counts) - Employer/Client perspective
 * GET /hub/:hubId/stats
 */
export async function getJobStats(
  request: FastifyRequest<{ Params: HubGetStatsParams }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;

    const stats = await hubJobService.getStats(hubId);

    return reply.send({
      success: true,
      data: stats,
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error fetching job stats');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch stats',
      },
    });
  }
}

/**
 * Get stats for applications page (counts) - Expert perspective
 * GET /hub/:hubId/stats/expert
 */
export async function getExpertStats(
  request: FastifyRequest<{ Params: HubGetStatsParams }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;

    const stats = await hubJobService.getExpertStats(hubId);

    return reply.send({
      success: true,
      data: stats,
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Error fetching expert stats');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'STATS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch stats',
      },
    });
  }
}
