import { CronJobCategory } from '@core/models/CronJobRun';
import { createJobRunner } from '@jobs/helpers/job-runner';
import { cleanupApiLogsHandler } from '@jobs/infrastructure/cleanup-api-logs';
import {
  bookingRemindersHandler,
  reviewRemindersHandler,
  subscriptionExpiringHandler,
} from '@jobs/notifications';
import { autoCompleteBookingsHandler } from '@jobs/payment/auto-complete-bookings';
import { autoReleaseMilestonesHandler } from '@jobs/payment/auto-release-milestones';
import { retryPendingPaymentsHandler } from '@jobs/payment/retry-pending-payments';
import { transferStripeBalanceHandler } from '@jobs/payment/transfer-stripe-balance';
import { weeklyPayoutProcessorHandler } from '@jobs/payment/weekly-payout-processor';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { AsyncTask, SimpleIntervalJob, ToadScheduler } from 'toad-scheduler';

/**
 * Job Definition Interface
 */
interface JobDefinition {
  name: string;
  category: CronJobCategory;
  handler: Parameters<typeof createJobRunner>[1]['handler'];
  /** Cron schedule in hours (for SimpleIntervalJob) */
  intervalHours?: number;
  /** Cron schedule in minutes */
  intervalMinutes?: number;
  /** Run immediately on startup */
  runImmediately?: boolean;
  /** Skip if previous run is still running */
  skipIfRunning?: boolean;
  /** Whether job is enabled */
  enabled?: boolean;
}

/**
 * Registered jobs configuration
 * Add new jobs here to register them with the scheduler
 */
const JOB_DEFINITIONS: JobDefinition[] = [
  {
    name: 'retryPendingPayments',
    category: CronJobCategory.PAYMENT,
    handler: retryPendingPaymentsHandler,
    intervalHours: 1, // Run every hour
    runImmediately: false,
    skipIfRunning: true,
    enabled: true,
  },
  {
    name: 'weeklyPayoutProcessor',
    category: CronJobCategory.PAYMENT,
    handler: weeklyPayoutProcessorHandler,
    intervalHours: 168, // Run weekly (7 * 24 hours) - Actually runs Monday 23:59
    runImmediately: false,
    skipIfRunning: true,
    enabled: true,
  },
  {
    name: 'transferStripeBalance',
    category: CronJobCategory.PAYMENT,
    handler: transferStripeBalanceHandler,
    intervalHours: 12, // Run every 12 hours
    runImmediately: false,
    skipIfRunning: true,
    enabled: true,
  },
  {
    name: 'autoCompleteBookings',
    category: CronJobCategory.PAYMENT,
    handler: autoCompleteBookingsHandler,
    intervalHours: 6, // Run every 6 hours - marks bookings as COMPLETED after end date
    runImmediately: false,
    skipIfRunning: true,
    enabled: true,
  },
  {
    name: 'autoReleaseMilestones',
    category: CronJobCategory.PAYMENT,
    handler: autoReleaseMilestonesHandler,
    intervalHours: 24, // Run daily - auto-releases milestones where work submitted > 7 days ago
    runImmediately: false,
    skipIfRunning: true,
    enabled: true,
  },
  {
    name: 'cleanupApiLogs',
    category: CronJobCategory.CLEANUP,
    handler: cleanupApiLogsHandler,
    intervalHours: 24, // Run daily - cleans up API logs older than 30 days
    runImmediately: false,
    skipIfRunning: true,
    enabled: true,
  },
  // Notification Jobs
  {
    name: 'bookingReminders',
    category: CronJobCategory.NOTIFICATION,
    handler: bookingRemindersHandler,
    intervalHours: 1, // Run every hour - sends 1-day, 1-hour, and host reminders
    runImmediately: false,
    skipIfRunning: true,
    enabled: true,
  },
  {
    name: 'reviewReminders',
    category: CronJobCategory.NOTIFICATION,
    handler: reviewRemindersHandler,
    intervalHours: 1, // Run hourly but only processes at 10 AM UTC
    runImmediately: false,
    skipIfRunning: true,
    enabled: true,
  },
  {
    name: 'subscriptionExpiring',
    category: CronJobCategory.NOTIFICATION,
    handler: subscriptionExpiringHandler,
    intervalHours: 1, // Run hourly but only processes at 8 AM UTC
    runImmediately: false,
    skipIfRunning: true,
    enabled: true,
  },
];

/**
 * Cron Jobs Plugin
 *
 * Initializes and manages scheduled jobs using toad-scheduler
 * with MongoDB-based monitoring via CronJobRun model
 */
const cronJobsPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const scheduler = new ToadScheduler();
  const registeredJobs: Map<string, ReturnType<typeof createJobRunner>> = new Map();

  fastify.log.info('Initializing cron jobs plugin...');

  // Register each job
  for (const jobDef of JOB_DEFINITIONS) {
    if (!jobDef.enabled) {
      fastify.log.info({ jobName: jobDef.name }, 'Job disabled, skipping registration');
      continue;
    }

    // Create wrapped job runner with monitoring
    const jobRunner = createJobRunner(fastify, {
      name: jobDef.name,
      category: jobDef.category,
      handler: jobDef.handler,
      skipIfRunning: jobDef.skipIfRunning,
    });

    registeredJobs.set(jobDef.name, jobRunner);

    // Calculate interval in milliseconds
    let intervalMs: number;
    if (jobDef.intervalHours) {
      intervalMs = jobDef.intervalHours * 60 * 60 * 1000;
    } else if (jobDef.intervalMinutes) {
      intervalMs = jobDef.intervalMinutes * 60 * 1000;
    } else {
      fastify.log.warn({ jobName: jobDef.name }, 'No interval specified, defaulting to 1 hour');
      intervalMs = 60 * 60 * 1000;
    }

    // Create async task for the job
    const task = new AsyncTask(
      jobDef.name,
      async () => {
        await jobRunner('schedule');
      },
      (err) => {
        fastify.log.error({ jobName: jobDef.name, error: err }, 'Job execution error');
      },
    );

    // Create the scheduled job
    const job = new SimpleIntervalJob(
      {
        milliseconds: intervalMs,
        runImmediately: jobDef.runImmediately ?? false,
      },
      task,
      { id: jobDef.name },
    );

    scheduler.addSimpleIntervalJob(job);

    const intervalDescription = jobDef.intervalHours
      ? `${jobDef.intervalHours} hour(s)`
      : `${jobDef.intervalMinutes} minute(s)`;

    fastify.log.info(
      {
        jobName: jobDef.name,
        interval: intervalDescription,
        runImmediately: jobDef.runImmediately,
      },
      'Job registered successfully',
    );
  }

  // Decorate fastify with job utilities
  fastify.decorate('scheduler', scheduler);
  fastify.decorate('registeredJobs', registeredJobs);

  // Method to manually trigger a job
  fastify.decorate('triggerJob', async (jobName: string) => {
    const jobRunner = registeredJobs.get(jobName);
    if (!jobRunner) {
      throw new Error(`Job not found: ${jobName}`);
    }
    await jobRunner('manual');
  });

  // Cleanup on server close
  fastify.addHook('onClose', async () => {
    fastify.log.info('Stopping all scheduled jobs...');
    scheduler.stop();
  });

  fastify.log.info({ jobCount: registeredJobs.size }, 'Cron jobs plugin initialized successfully');
};

export default fp(cronJobsPlugin, {
  name: 'cron-jobs',
  // Note: MongoDB connection is established in app.ts before plugins are loaded
});

// Type augmentation for Fastify
declare module 'fastify' {
  interface FastifyInstance {
    scheduler: ToadScheduler;
    registeredJobs: Map<string, ReturnType<typeof createJobRunner>>;
    triggerJob: (jobName: string) => Promise<void>;
  }
}
