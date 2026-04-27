import { CronJobCategory, CronJobStatus } from '@core/models/CronJobRun';

/**
 * Cron Job schemas - Native JSON Schema
 */

/**
 * Query parameters for listing job runs
 */
export const listJobRunsQuerySchema = {
  type: 'object',
  properties: {
    jobName: {
      type: 'string',
      description: 'Job name filter',
    },
    status: {
      type: 'string',
      enum: Object.values(CronJobStatus),
      description: 'Job status filter',
    },
    category: {
      type: 'string',
      enum: Object.values(CronJobCategory),
      description: 'Job category filter',
    },
    limit: {
      type: 'number',
      minimum: 1,
      maximum: 100,
      default: 50,
      description: 'Items per page',
    },
    offset: {
      type: 'number',
      minimum: 0,
      default: 0,
      description: 'Offset for pagination',
    },
  },
} as const;

/**
 * Query parameters for job statistics
 */
export const jobStatisticsQuerySchema = {
  type: 'object',
  properties: {
    jobName: {
      type: 'string',
      description: 'Job name filter',
    },
    hours: {
      type: 'number',
      minimum: 1,
      maximum: 168,
      default: 24,
      description: 'Time window in hours (max 7 days)',
    },
  },
} as const;

/**
 * Trigger job request body
 */
export const triggerJobBodySchema = {
  type: 'object',
  required: ['jobName'],
  properties: {
    jobName: {
      type: 'string',
      minLength: 1,
      description: 'Job name to trigger',
    },
  },
} as const;

/**
 * Job run response schema
 */
export const jobRunResponseSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    jobName: { type: 'string' },
    jobCategory: {
      type: 'string',
      enum: Object.values(CronJobCategory),
    },
    status: {
      type: 'string',
      enum: Object.values(CronJobStatus),
    },
    startedAt: { type: 'string' },
    completedAt: { type: 'string' },
    duration: { type: 'number' },
    error: { type: 'string' },
    metadata: {
      type: 'object',
      additionalProperties: true,
    },
    retryCount: { type: 'number' },
    triggeredBy: {
      type: 'string',
      enum: ['schedule', 'manual', 'retry'],
    },
    serverInstance: { type: 'string' },
    createdAt: { type: 'string' },
  },
} as const;

/**
 * Statistics response schema
 */
export const jobStatisticsResponseSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    totalRuns: { type: 'number' },
    statuses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          count: { type: 'number' },
          avgDuration: { type: 'number' },
          maxDuration: { type: 'number' },
          minDuration: { type: 'number' },
        },
      },
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface ListJobRunsQuery {
  jobName?: string;
  status?: CronJobStatus;
  category?: CronJobCategory;
  limit?: number;
  offset?: number;
}

export interface JobStatisticsQuery {
  jobName?: string;
  hours?: number;
}

export interface TriggerJobBody {
  jobName: string;
}
