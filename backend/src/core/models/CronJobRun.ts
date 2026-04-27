import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

/**
 * Cron Job Run Status
 */
export enum CronJobStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

/**
 * Cron Job Category - Groups related jobs
 */
export enum CronJobCategory {
  PAYMENT = 'payment',
  NOTIFICATION = 'notification',
  MAINTENANCE = 'maintenance',
  DATA_SYNC = 'data_sync',
  CLEANUP = 'cleanup',
}

/**
 * Job Metadata Interface
 */
export interface IJobMetadata {
  recordsProcessed?: number;
  recordsSucceeded?: number;
  recordsFailed?: number;
  duration?: number;
  [key: string]: unknown;
}

/**
 * Cron Job Run Interface
 */
export interface ICronJobRun extends Document {
  _id: Types.ObjectId;
  jobName: string;
  jobCategory: CronJobCategory;
  status: CronJobStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // in milliseconds
  error?: string;
  errorStack?: string;
  metadata: IJobMetadata;
  retryCount: number;
  triggeredBy: 'schedule' | 'manual' | 'retry';
  serverInstance?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cron Job Run Schema
 */
const cronJobRunSchema = new Schema<ICronJobRun>(
  {
    jobName: {
      type: String,
      required: true,
      index: true,
    },
    jobCategory: {
      type: String,
      enum: Object.values(CronJobCategory),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(CronJobStatus),
      default: CronJobStatus.RUNNING,
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    completedAt: {
      type: Date,
    },
    duration: {
      type: Number,
    },
    error: {
      type: String,
    },
    errorStack: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    triggeredBy: {
      type: String,
      enum: ['schedule', 'manual', 'retry'],
      default: 'schedule',
    },
    serverInstance: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'cronJobRuns',
  },
);

// Compound indexes for efficient querying
cronJobRunSchema.index({ jobName: 1, startedAt: -1 });
cronJobRunSchema.index({ status: 1, startedAt: -1 });
cronJobRunSchema.index({ jobCategory: 1, status: 1 });

// TTL index - auto-delete logs older than 30 days
cronJobRunSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const CronJobRun: Model<ICronJobRun> = mongoose.model<ICronJobRun>(
  'CronJobRun',
  cronJobRunSchema,
);
