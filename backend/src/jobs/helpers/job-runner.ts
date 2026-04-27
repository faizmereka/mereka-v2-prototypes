import os from 'node:os';
import {
  type CronJobCategory,
  CronJobRun,
  CronJobStatus,
  type ICronJobRun,
  type IJobMetadata,
} from '@core/models/CronJobRun';
import type { FastifyInstance } from 'fastify';

// Re-export IJobMetadata for use in job handlers
export type { IJobMetadata };

/**
 * Job Handler Function Type
 */
export type JobHandler = (context: JobContext) => Promise<IJobMetadata | undefined>;

/**
 * Job Context - Passed to job handlers
 */
export interface JobContext {
  fastify: FastifyInstance;
  runId: string;
  jobName: string;
  triggeredBy: 'schedule' | 'manual' | 'retry';
  log: FastifyInstance['log'];
  updateMetadata: (metadata: Partial<IJobMetadata>) => Promise<void>;
}

/**
 * Job Configuration
 */
export interface JobConfig {
  name: string;
  category: CronJobCategory;
  handler: JobHandler;
  /** Skip if previous run is still running */
  skipIfRunning?: boolean;
  /** Max execution time in milliseconds before considering job stuck */
  maxExecutionTime?: number;
}

/**
 * Creates a wrapped job handler with monitoring
 */
export function createJobRunner(fastify: FastifyInstance, config: JobConfig) {
  const {
    name,
    category,
    handler,
    skipIfRunning = true,
    maxExecutionTime = 5 * 60 * 1000,
  } = config;

  return async (triggeredBy: 'schedule' | 'manual' | 'retry' = 'schedule'): Promise<void> => {
    const startTime = Date.now();
    let jobRun: ICronJobRun | null = null;

    try {
      // Check if job is already running
      if (skipIfRunning) {
        const runningJob = await CronJobRun.findOne({
          jobName: name,
          status: CronJobStatus.RUNNING,
          startedAt: { $gte: new Date(Date.now() - maxExecutionTime) },
        }).lean();

        if (runningJob) {
          fastify.log.warn(
            { jobName: name, runId: runningJob._id },
            'Skipping job - already running',
          );

          // Log skipped run
          await CronJobRun.create({
            jobName: name,
            jobCategory: category,
            status: CronJobStatus.SKIPPED,
            startedAt: new Date(),
            completedAt: new Date(),
            duration: 0,
            triggeredBy,
            serverInstance: os.hostname(),
            metadata: { reason: 'Previous run still in progress' },
          });

          return;
        }
      }

      // Create job run record
      jobRun = await CronJobRun.create({
        jobName: name,
        jobCategory: category,
        status: CronJobStatus.RUNNING,
        startedAt: new Date(),
        triggeredBy,
        serverInstance: os.hostname(),
      });

      fastify.log.info({ jobName: name, runId: jobRun._id, triggeredBy }, 'Job started');

      // Create job context
      const context: JobContext = {
        fastify,
        runId: jobRun._id.toString(),
        jobName: name,
        triggeredBy,
        log: fastify.log.child({ jobName: name, runId: jobRun._id }),
        updateMetadata: async (metadata: Partial<IJobMetadata>) => {
          if (jobRun) {
            await CronJobRun.updateOne(
              { _id: jobRun._id },
              { $set: { metadata: { ...jobRun.metadata, ...metadata } } },
            );
          }
        },
      };

      // Execute job handler
      const result = await handler(context);

      // Calculate duration
      const duration = Date.now() - startTime;

      // Update job run as completed
      await CronJobRun.updateOne(
        { _id: jobRun._id },
        {
          $set: {
            status: CronJobStatus.COMPLETED,
            completedAt: new Date(),
            duration,
            metadata: result || {},
          },
        },
      );

      fastify.log.info(
        { jobName: name, runId: jobRun._id, duration, metadata: result },
        'Job completed successfully',
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      fastify.log.error(
        { jobName: name, runId: jobRun?._id, error, duration },
        'Job failed with error',
      );

      // Update job run as failed
      if (jobRun) {
        await CronJobRun.updateOne(
          { _id: jobRun._id },
          {
            $set: {
              status: CronJobStatus.FAILED,
              completedAt: new Date(),
              duration,
              error: errorMessage,
              errorStack,
            },
          },
        );
      } else {
        // Create failed job run record if initial creation failed
        await CronJobRun.create({
          jobName: name,
          jobCategory: category,
          status: CronJobStatus.FAILED,
          startedAt: new Date(startTime),
          completedAt: new Date(),
          duration,
          error: errorMessage,
          errorStack,
          triggeredBy,
          serverInstance: os.hostname(),
        });
      }
    }
  };
}

/**
 * Get job statistics for monitoring dashboard
 */
export async function getJobStatistics(jobName?: string, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const matchStage: Record<string, unknown> = {
    startedAt: { $gte: since },
  };

  if (jobName) {
    matchStage.jobName = jobName;
  }

  const stats = await CronJobRun.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { jobName: '$jobName', status: '$status' },
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
        maxDuration: { $max: '$duration' },
        minDuration: { $min: '$duration' },
      },
    },
    {
      $group: {
        _id: '$_id.jobName',
        statuses: {
          $push: {
            status: '$_id.status',
            count: '$count',
            avgDuration: '$avgDuration',
            maxDuration: '$maxDuration',
            minDuration: '$minDuration',
          },
        },
        totalRuns: { $sum: '$count' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return stats;
}

/**
 * Get recent job runs for monitoring
 */
export async function getRecentJobRuns(limit = 50, jobName?: string) {
  const query = jobName ? { jobName } : {};

  return CronJobRun.find(query).sort({ startedAt: -1 }).limit(limit).lean();
}

/**
 * Get jobs that may be stuck (running for too long)
 */
export async function getStuckJobs(maxExecutionMinutes = 5) {
  const cutoff = new Date(Date.now() - maxExecutionMinutes * 60 * 1000);

  return CronJobRun.find({
    status: CronJobStatus.RUNNING,
    startedAt: { $lt: cutoff },
  }).lean();
}

/**
 * Mark stuck jobs as failed (cleanup)
 * Call this to unstick jobs that crashed without updating their status
 */
export async function markStuckJobsAsFailed(maxExecutionMinutes = 5) {
  const cutoff = new Date(Date.now() - maxExecutionMinutes * 60 * 1000);

  const result = await CronJobRun.updateMany(
    {
      status: CronJobStatus.RUNNING,
      startedAt: { $lt: cutoff },
    },
    {
      $set: {
        status: CronJobStatus.FAILED,
        completedAt: new Date(),
        error: 'Job marked as failed - exceeded max execution time (likely crashed)',
      },
    },
  );

  return {
    markedAsFailed: result.modifiedCount,
  };
}

/**
 * Reset a specific stuck job by ID
 */
export async function resetStuckJob(jobRunId: string) {
  const result = await CronJobRun.updateOne(
    {
      _id: jobRunId,
      status: CronJobStatus.RUNNING,
    },
    {
      $set: {
        status: CronJobStatus.FAILED,
        completedAt: new Date(),
        error: 'Job manually marked as failed - was stuck',
      },
    },
  );

  return {
    reset: result.modifiedCount > 0,
  };
}
