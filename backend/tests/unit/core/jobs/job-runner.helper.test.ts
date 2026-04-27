import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the CronJobRun model BEFORE imports
vi.mock('@core/models/CronJobRun', () => ({
  CronJobRun: {
    create: vi.fn(),
    findOne: vi.fn(),
    updateOne: vi.fn(),
    find: vi.fn(),
    aggregate: vi.fn(),
  },
  CronJobStatus: {
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SKIPPED: 'skipped',
  },
  CronJobCategory: {
    PAYMENT: 'payment',
    NOTIFICATION: 'notification',
    CLEANUP: 'cleanup',
  },
}));

import { CronJobRun, CronJobStatus } from '@core/models/CronJobRun';
import {
  createJobRunner,
  getJobStatistics,
  getRecentJobRuns,
  getStuckJobs,
} from '@jobs/helpers/job-runner';
import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

describe('Job Runner Helper', () => {
  const mockRunId = new mongoose.Types.ObjectId();

  const mockFastify = {
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    },
  } as unknown as FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createJobRunner', () => {
    it('should create and execute a job successfully', async () => {
      const mockHandler = vi.fn().mockResolvedValue({
        recordsProcessed: 10,
        recordsSucceeded: 10,
        recordsFailed: 0,
      });

      // Mock no running job
      const mockFindOneQuery = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(CronJobRun.findOne).mockReturnValue(mockFindOneQuery as any);

      // Mock job run creation
      vi.mocked(CronJobRun.create).mockResolvedValue({
        _id: mockRunId,
        jobName: 'test-job',
        status: CronJobStatus.RUNNING,
      } as any);

      // Mock update
      vi.mocked(CronJobRun.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      const runner = createJobRunner(mockFastify, {
        name: 'test-job',
        category: 'payment' as any,
        handler: mockHandler,
      });

      await runner('schedule');

      expect(mockHandler).toHaveBeenCalled();
      expect(CronJobRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          jobName: 'test-job',
          jobCategory: 'payment',
          status: CronJobStatus.RUNNING,
          triggeredBy: 'schedule',
        }),
      );
      expect(CronJobRun.updateOne).toHaveBeenCalledWith(
        { _id: mockRunId },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: CronJobStatus.COMPLETED,
          }),
        }),
      );
    });

    it('should skip job if previous run is still running', async () => {
      const mockHandler = vi.fn();

      // Mock running job found
      const mockFindOneQuery = {
        lean: vi.fn().mockResolvedValue({
          _id: 'running-job-id',
          jobName: 'test-job',
          status: CronJobStatus.RUNNING,
        }),
      };
      vi.mocked(CronJobRun.findOne).mockReturnValue(mockFindOneQuery as any);
      vi.mocked(CronJobRun.create).mockResolvedValue({} as any);

      const runner = createJobRunner(mockFastify, {
        name: 'test-job',
        category: 'payment' as any,
        handler: mockHandler,
        skipIfRunning: true,
      });

      await runner('schedule');

      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockFastify.log.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          jobName: 'test-job',
          runId: 'running-job-id',
        }),
        'Skipping job - already running',
      );
      // Should create skipped record
      expect(CronJobRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: CronJobStatus.SKIPPED,
        }),
      );
    });

    it('should handle job failure and record error', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Job execution failed'));

      // Mock no running job
      const mockFindOneQuery = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(CronJobRun.findOne).mockReturnValue(mockFindOneQuery as any);

      vi.mocked(CronJobRun.create).mockResolvedValue({
        _id: mockRunId,
        jobName: 'failing-job',
        status: CronJobStatus.RUNNING,
      } as any);

      vi.mocked(CronJobRun.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      const runner = createJobRunner(mockFastify, {
        name: 'failing-job',
        category: 'payment' as any,
        handler: mockHandler,
      });

      await runner('schedule');

      expect(CronJobRun.updateOne).toHaveBeenCalledWith(
        { _id: mockRunId },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: CronJobStatus.FAILED,
            error: 'Job execution failed',
          }),
        }),
      );
      expect(mockFastify.log.error).toHaveBeenCalled();
    });

    it('should allow running if skipIfRunning is false', async () => {
      const mockHandler = vi.fn().mockResolvedValue({ recordsProcessed: 5 });

      // Don't mock findOne since skipIfRunning is false
      vi.mocked(CronJobRun.create).mockResolvedValue({
        _id: mockRunId,
        jobName: 'concurrent-job',
        status: CronJobStatus.RUNNING,
      } as any);

      vi.mocked(CronJobRun.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      const runner = createJobRunner(mockFastify, {
        name: 'concurrent-job',
        category: 'payment' as any,
        handler: mockHandler,
        skipIfRunning: false,
      });

      await runner('manual');

      expect(mockHandler).toHaveBeenCalled();
      expect(CronJobRun.findOne).not.toHaveBeenCalled();
    });

    it('should record different trigger types', async () => {
      const mockHandler = vi.fn().mockResolvedValue({});

      const mockFindOneQuery = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(CronJobRun.findOne).mockReturnValue(mockFindOneQuery as any);

      vi.mocked(CronJobRun.create).mockResolvedValue({
        _id: mockRunId,
        jobName: 'manual-job',
      } as any);

      vi.mocked(CronJobRun.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      const runner = createJobRunner(mockFastify, {
        name: 'manual-job',
        category: 'payment' as any,
        handler: mockHandler,
      });

      await runner('manual');

      expect(CronJobRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          triggeredBy: 'manual',
        }),
      );
    });
  });

  describe('getJobStatistics', () => {
    it('should return job statistics for last 24 hours', async () => {
      const mockStats = [
        {
          _id: 'weekly-payout-processor',
          statuses: [
            { status: 'completed', count: 5, avgDuration: 1000 },
            { status: 'failed', count: 1, avgDuration: 500 },
          ],
          totalRuns: 6,
        },
      ];

      vi.mocked(CronJobRun.aggregate).mockResolvedValue(mockStats as any);

      const result = await getJobStatistics();

      expect(CronJobRun.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              startedAt: expect.any(Object),
            }),
          }),
        ]),
      );
      expect(result).toEqual(mockStats);
    });

    it('should filter by job name when provided', async () => {
      vi.mocked(CronJobRun.aggregate).mockResolvedValue([]);

      await getJobStatistics('auto-release-milestones', 48);

      expect(CronJobRun.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: expect.objectContaining({
              jobName: 'auto-release-milestones',
            }),
          }),
        ]),
      );
    });
  });

  describe('getRecentJobRuns', () => {
    it('should return recent job runs with default limit', async () => {
      const mockRuns = [
        { _id: 'run-1', jobName: 'job-1', status: 'completed' },
        { _id: 'run-2', jobName: 'job-2', status: 'failed' },
      ];

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockRuns),
      };
      vi.mocked(CronJobRun.find).mockReturnValue(mockQuery as any);

      const result = await getRecentJobRuns();

      expect(CronJobRun.find).toHaveBeenCalledWith({});
      expect(mockQuery.sort).toHaveBeenCalledWith({ startedAt: -1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
      expect(result).toEqual(mockRuns);
    });

    it('should filter by job name and custom limit', async () => {
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(CronJobRun.find).mockReturnValue(mockQuery as any);

      await getRecentJobRuns(10, 'specific-job');

      expect(CronJobRun.find).toHaveBeenCalledWith({ jobName: 'specific-job' });
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('getStuckJobs', () => {
    it('should return jobs running longer than max execution time', async () => {
      const mockStuckJobs = [
        {
          _id: 'stuck-1',
          jobName: 'stuck-job',
          status: 'running',
          startedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      ];

      const mockQuery = {
        lean: vi.fn().mockResolvedValue(mockStuckJobs),
      };
      vi.mocked(CronJobRun.find).mockReturnValue(mockQuery as any);

      const result = await getStuckJobs(30);

      expect(CronJobRun.find).toHaveBeenCalledWith({
        status: CronJobStatus.RUNNING,
        startedAt: { $lt: expect.any(Date) },
      });
      expect(result).toEqual(mockStuckJobs);
    });

    it('should use default max execution time of 30 minutes', async () => {
      const mockQuery = {
        lean: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(CronJobRun.find).mockReturnValue(mockQuery as any);

      await getStuckJobs();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const calls = vi.mocked(CronJobRun.find).mock.calls as any[];
      expect(calls.length).toBeGreaterThan(0);
      const findCall = calls[0][0];
      const cutoffTime = findCall.startedAt.$lt as Date;
      const minutesAgo = (Date.now() - cutoffTime.getTime()) / (1000 * 60);

      // Should be approximately 30 minutes
      expect(minutesAgo).toBeGreaterThan(29);
      expect(minutesAgo).toBeLessThan(31);
    });
  });
});
