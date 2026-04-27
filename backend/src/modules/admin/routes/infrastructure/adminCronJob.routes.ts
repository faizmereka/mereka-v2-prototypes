import { CronJobRun } from '@core/models/CronJobRun';
import {
  getJobStatistics,
  getRecentJobRuns,
  getStuckJobs,
  markStuckJobsAsFailed,
  resetStuckJob,
} from '@jobs/helpers/job-runner';
import {
  type JobStatisticsQuery,
  jobStatisticsQuerySchema,
  type ListJobRunsQuery,
  listJobRunsQuerySchema,
  type TriggerJobBody,
  triggerJobBodySchema,
} from '@schemas/shared';
import type { FastifyInstance } from 'fastify';

/**
 * Cron Job Monitoring Routes
 *
 * Provides endpoints for monitoring and managing scheduled jobs:
 * - List recent job runs
 * - View job statistics
 * - Manually trigger jobs
 * - Monitor stuck jobs
 */
export async function adminCronJobRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /cron-jobs/runs - List recent job runs
   */
  fastify.get('/runs', {
    schema: {
      tags: ['Cron Jobs'],
      summary: 'List recent cron job runs',
      description: 'Returns a paginated list of recent job runs with optional filtering',
      querystring: listJobRunsQuerySchema,
    },
    handler: async (request, reply) => {
      const query = request.query as ListJobRunsQuery;

      const filter: Record<string, unknown> = {};

      if (query.jobName) {
        filter.jobName = query.jobName;
      }
      if (query.status) {
        filter.status = query.status;
      }
      if (query.category) {
        filter.jobCategory = query.category;
      }

      const [runs, total] = await Promise.all([
        CronJobRun.find(filter)
          .sort({ startedAt: -1 })
          .skip(query.offset ?? 0)
          .limit(query.limit ?? 50)
          .lean(),
        CronJobRun.countDocuments(filter),
      ]);

      return reply.send({
        success: true,
        data: { runs, total },
      });
    },
  });

  /**
   * GET /cron-jobs/statistics - Get job run statistics
   */
  fastify.get('/statistics', {
    schema: {
      tags: ['Cron Jobs'],
      summary: 'Get job run statistics',
      description: 'Returns aggregated statistics for job runs',
      querystring: jobStatisticsQuerySchema,
    },
    handler: async (request, reply) => {
      const query = request.query as JobStatisticsQuery;

      const stats = await getJobStatistics(query.jobName, query.hours ?? 24);

      return reply.send({
        success: true,
        data: stats,
      });
    },
  });

  /**
   * GET /cron-jobs/recent - Get most recent run for each job
   */
  fastify.get('/recent', {
    schema: {
      tags: ['Cron Jobs'],
      summary: 'Get recent job runs summary',
      description: 'Returns the most recent run for each registered job',
    },
    handler: async (_request, reply) => {
      const runs = await getRecentJobRuns(50);

      return reply.send({
        success: true,
        data: runs,
      });
    },
  });

  /**
   * GET /cron-jobs/stuck - Get potentially stuck jobs
   */
  fastify.get('/stuck', {
    schema: {
      tags: ['Cron Jobs'],
      summary: 'Get stuck jobs',
      description: 'Returns jobs that have been running for longer than expected (5+ minutes)',
    },
    handler: async (_request, reply) => {
      const stuckJobs = await getStuckJobs(5);

      return reply.send({
        success: true,
        data: stuckJobs,
        count: stuckJobs.length,
      });
    },
  });

  /**
   * GET /cron-jobs/registered - List all registered jobs
   */
  fastify.get('/registered', {
    schema: {
      tags: ['Cron Jobs'],
      summary: 'List registered jobs',
      description: 'Returns a list of all jobs registered with the scheduler',
    },
    handler: async (_request, reply) => {
      const registeredJobs = fastify.registeredJobs;
      const jobNames = registeredJobs ? Array.from(registeredJobs.keys()) : [];

      return reply.send({
        success: true,
        data: jobNames.map((name) => ({ name })),
      });
    },
  });

  /**
   * POST /cron-jobs/trigger - Manually trigger a job
   */
  fastify.post('/trigger', {
    schema: {
      tags: ['Cron Jobs'],
      summary: 'Manually trigger a job',
      description: 'Triggers a registered job to run immediately (outside of schedule)',
      body: triggerJobBodySchema,
    },
    handler: async (request, reply) => {
      const { jobName } = request.body as TriggerJobBody;

      try {
        if (!fastify.triggerJob) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'SCHEDULER_NOT_INITIALIZED',
              message: 'Cron job scheduler is not initialized',
            },
          });
        }

        await fastify.triggerJob(jobName);

        return reply.send({
          success: true,
          message: `Job '${jobName}' triggered successfully`,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        return reply.status(400).send({
          success: false,
          error: {
            code: 'JOB_TRIGGER_FAILED',
            message: errorMessage,
          },
        });
      }
    },
  });

  /**
   * GET /cron-jobs/run/:id - Get a specific job run
   */
  fastify.get<{ Params: { id: string } }>('/run/:id', {
    schema: {
      tags: ['Cron Jobs'],
      summary: 'Get job run details',
      description: 'Returns detailed information about a specific job run',
    },
    handler: async (request, reply) => {
      const { id } = request.params;

      const jobRun = await CronJobRun.findById(id).lean();

      if (!jobRun) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'JOB_RUN_NOT_FOUND',
            message: `Job run with ID ${id} not found`,
          },
        });
      }

      return reply.send({
        success: true,
        data: jobRun,
      });
    },
  });

  /**
   * POST /cron-jobs/reset-stuck - Mark all stuck jobs as failed
   */
  fastify.post('/reset-stuck', {
    schema: {
      tags: ['Cron Jobs'],
      summary: 'Reset all stuck jobs',
      description:
        'Marks all jobs that have been running for 5+ minutes as failed so they can be re-triggered',
    },
    handler: async (_request, reply) => {
      const result = await markStuckJobsAsFailed(5);

      return reply.send({
        success: true,
        message: `Marked ${result.markedAsFailed} stuck job(s) as failed`,
        data: result,
      });
    },
  });

  /**
   * POST /cron-jobs/reset/:id - Reset a specific stuck job
   */
  fastify.post<{ Params: { id: string } }>('/reset/:id', {
    schema: {
      tags: ['Cron Jobs'],
      summary: 'Reset a specific stuck job',
      description: 'Marks a specific running job as failed so it can be re-triggered',
    },
    handler: async (request, reply) => {
      const { id } = request.params;

      const result = await resetStuckJob(id);

      if (!result.reset) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'JOB_NOT_FOUND_OR_NOT_RUNNING',
            message: 'Job run not found or not in running status',
          },
        });
      }

      return reply.send({
        success: true,
        message: 'Job marked as failed and can now be re-triggered',
      });
    },
  });
}
