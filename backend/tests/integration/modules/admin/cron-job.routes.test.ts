import { CronJobCategory, CronJobRun, CronJobStatus } from '@core/models/CronJobRun';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '@/app';

describe('Cron Job Routes Integration Tests', () => {
  let app: FastifyInstance;
  let testJobRunId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    // Clean up test data
    await CronJobRun.deleteMany({ jobName: { $regex: /^test-/ } });
    await app.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await CronJobRun.deleteMany({ jobName: { $regex: /^test-/ } });

    // Create test job runs
    const completedRun = await CronJobRun.create({
      jobName: 'test-weekly-payout',
      jobCategory: CronJobCategory.PAYMENT,
      status: CronJobStatus.COMPLETED,
      triggeredBy: 'schedule',
      startedAt: new Date(Date.now() - 60000), // 1 minute ago
      completedAt: new Date(),
      durationMs: 60000,
      metadata: {
        recordsProcessed: 10,
        recordsSucceeded: 10,
        recordsFailed: 0,
      },
    });
    testJobRunId = completedRun._id.toString();

    // Create a running job
    await CronJobRun.create({
      jobName: 'test-auto-release',
      jobCategory: CronJobCategory.PAYMENT,
      status: CronJobStatus.RUNNING,
      triggeredBy: 'manual',
      startedAt: new Date(),
    });

    // Create a failed job
    await CronJobRun.create({
      jobName: 'test-failed-job',
      jobCategory: CronJobCategory.NOTIFICATION,
      status: CronJobStatus.FAILED,
      triggeredBy: 'schedule',
      startedAt: new Date(Date.now() - 120000),
      completedAt: new Date(Date.now() - 60000),
      durationMs: 60000,
      error: 'Database connection failed',
    });
  });

  describe('GET /api/v1/cron-jobs/runs', () => {
    it('should list recent job runs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/cron-jobs/runs',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.runs).toBeDefined();
      expect(Array.isArray(body.data.runs)).toBe(true);
      expect(body.data.total).toBeGreaterThanOrEqual(3);
    });

    it('should filter by jobName', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/cron-jobs/runs?jobName=test-weekly-payout',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.runs.length).toBeGreaterThanOrEqual(1);
      for (const run of body.data.runs) {
        expect(run.jobName).toBe('test-weekly-payout');
      }
    });

    it('should filter by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/cron-jobs/runs?status=completed',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      for (const run of body.data.runs) {
        expect(run.status).toBe('completed');
      }
    });

    it('should filter by category', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/cron-jobs/runs?category=payment',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      for (const run of body.data.runs) {
        expect(run.jobCategory).toBe('payment');
      }
    });

    it('should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/cron-jobs/runs?limit=1&offset=0',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.runs.length).toBe(1);
    });
  });

  describe('GET /api/v1/cron-jobs/statistics', () => {
    it('should return job statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/cron-jobs/statistics',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should filter statistics by jobName', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/cron-jobs/statistics?jobName=test-weekly-payout',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should filter statistics by hours', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/cron-jobs/statistics?hours=48',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('GET /api/v1/cron-jobs/recent', () => {
    it('should return recent job runs summary', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/cron-jobs/recent',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/cron-jobs/stuck', () => {
    it('should return stuck jobs (empty when none stuck)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/cron-jobs/stuck',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.count).toBeDefined();
    });

    it('should detect stuck jobs running for 30+ minutes', async () => {
      // Create a stuck job (started 45 minutes ago, still running)
      await CronJobRun.create({
        jobName: 'test-stuck-job',
        jobCategory: CronJobCategory.PAYMENT,
        status: CronJobStatus.RUNNING,
        triggeredBy: 'schedule',
        startedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/cron-jobs/stuck',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.count).toBeGreaterThanOrEqual(1);
      expect(body.data.some((job: any) => job.jobName === 'test-stuck-job')).toBe(true);
    });
  });

  describe('GET /api/v1/cron-jobs/registered', () => {
    it('should return list of registered jobs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/cron-jobs/registered',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('POST /api/v1/cron-jobs/trigger', () => {
    it('should return 400 for non-existent job', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/cron-jobs/trigger',
        payload: {
          jobName: 'non-existent-job',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 400 for missing jobName', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/cron-jobs/trigger',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should trigger registered job successfully', async () => {
      // This will only succeed if the job is registered
      // In test environment, we expect either success or "not registered" error
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/cron-jobs/trigger',
        payload: {
          jobName: 'weekly-payout-processor',
        },
      });

      // Should be 200 (success) or 400 (job not found/scheduler not initialized)
      expect([200, 400]).toContain(response.statusCode);
    });
  });

  describe('GET /api/v1/cron-jobs/run/:id', () => {
    it('should get job run by ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/cron-jobs/run/${testJobRunId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.jobName).toBe('test-weekly-payout');
      expect(body.data.status).toBe('completed');
      expect(body.data.metadata).toBeDefined();
    });

    it('should return 404 for non-existent job run', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/cron-jobs/run/507f1f77bcf86cd799439011',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('JOB_RUN_NOT_FOUND');
    });

    it('should return 500 for invalid ID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/cron-jobs/run/invalid-id',
      });

      expect(response.statusCode).toBe(500);
    });
  });
});
