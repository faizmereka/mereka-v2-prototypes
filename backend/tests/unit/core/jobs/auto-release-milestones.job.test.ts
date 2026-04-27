import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock services BEFORE imports
vi.mock('@services/hub', () => ({
  hubMilestoneService: {
    getMilestonesForAutoRelease: vi.fn(),
    releaseMilestonePayment: vi.fn(),
  },
}));

import type { JobContext } from '@jobs/helpers/job-runner';
import { autoReleaseMilestonesHandler } from '@jobs/payment/auto-release-milestones';
import { hubMilestoneService as milestoneService } from '@services/hub';

describe('Auto-Release Milestones Job', () => {
  const mockLog = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };

  const mockContext: JobContext = {
    fastify: {} as any,
    runId: 'run-123',
    jobName: 'auto-release-milestones',
    triggeredBy: 'schedule',
    log: mockLog as any,
    updateMetadata: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('autoReleaseMilestonesHandler', () => {
    it('should return zero counts when no milestones eligible', async () => {
      vi.mocked(milestoneService.getMilestonesForAutoRelease).mockResolvedValue([]);

      const result = await autoReleaseMilestonesHandler(mockContext);

      expect(result).toEqual({
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
      });
      expect(mockLog.info).toHaveBeenCalledWith('No milestones eligible for auto-release');
    });

    it('should process eligible milestones successfully', async () => {
      const mockMilestones = [
        {
          _id: 'milestone-1',
          contractId: 'contract-1',
          taskName: 'Phase 1',
          workSubmittedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          amount: 5000,
        },
        {
          _id: 'milestone-2',
          contractId: 'contract-2',
          taskName: 'Phase 2',
          workSubmittedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          amount: 3000,
        },
      ];

      vi.mocked(milestoneService.getMilestonesForAutoRelease).mockResolvedValue(
        mockMilestones as any,
      );
      vi.mocked(milestoneService.releaseMilestonePayment).mockResolvedValue({} as any);

      const result = await autoReleaseMilestonesHandler(mockContext);

      expect(result).toEqual({
        recordsProcessed: 2,
        recordsSucceeded: 2,
        recordsFailed: 0,
      });
      expect(milestoneService.releaseMilestonePayment).toHaveBeenCalledTimes(2);
      expect(milestoneService.releaseMilestonePayment).toHaveBeenCalledWith(
        ['milestone-1'],
        'system-auto-release',
      );
      expect(milestoneService.releaseMilestonePayment).toHaveBeenCalledWith(
        ['milestone-2'],
        'system-auto-release',
      );
    });

    it('should handle partial failures gracefully', async () => {
      const mockMilestones = [
        {
          _id: 'milestone-1',
          contractId: 'contract-1',
          taskName: 'Phase 1',
          workSubmittedDate: new Date(),
          amount: 5000,
        },
        {
          _id: 'milestone-2',
          contractId: 'contract-2',
          taskName: 'Phase 2',
          workSubmittedDate: new Date(),
          amount: 3000,
        },
        {
          _id: 'milestone-3',
          contractId: 'contract-3',
          taskName: 'Phase 3',
          workSubmittedDate: new Date(),
          amount: 2000,
        },
      ];

      vi.mocked(milestoneService.getMilestonesForAutoRelease).mockResolvedValue(
        mockMilestones as any,
      );
      vi.mocked(milestoneService.releaseMilestonePayment)
        .mockResolvedValueOnce({} as any) // First succeeds
        .mockRejectedValueOnce(new Error('Payment failed')) // Second fails
        .mockResolvedValueOnce({} as any); // Third succeeds

      const result = await autoReleaseMilestonesHandler(mockContext);

      expect(result).toEqual({
        recordsProcessed: 3,
        recordsSucceeded: 2,
        recordsFailed: 1,
      });
      expect(mockLog.error).toHaveBeenCalledWith(
        expect.objectContaining({
          milestoneId: 'milestone-2',
          error: 'Payment failed',
        }),
        'Failed to auto-release milestone',
      );
    });

    it('should log milestone details before processing', async () => {
      const mockMilestone = {
        _id: 'milestone-1',
        contractId: 'contract-1',
        taskName: 'Important Milestone',
        workSubmittedDate: new Date('2025-01-15'),
        amount: 10000,
      };

      vi.mocked(milestoneService.getMilestonesForAutoRelease).mockResolvedValue([
        mockMilestone as any,
      ]);
      vi.mocked(milestoneService.releaseMilestonePayment).mockResolvedValue({} as any);

      await autoReleaseMilestonesHandler(mockContext);

      expect(mockLog.info).toHaveBeenCalledWith(
        expect.objectContaining({
          milestoneId: 'milestone-1',
          contractId: 'contract-1',
          taskName: 'Important Milestone',
        }),
        'Auto-releasing milestone payment',
      );
    });

    it('should throw error when getMilestonesForAutoRelease fails', async () => {
      vi.mocked(milestoneService.getMilestonesForAutoRelease).mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(autoReleaseMilestonesHandler(mockContext)).rejects.toThrow(
        'Database connection failed',
      );
      expect(mockLog.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
        'Error in auto-release milestones job',
      );
    });

    it('should log success with amount for each released milestone', async () => {
      const mockMilestone = {
        _id: 'milestone-1',
        contractId: 'contract-1',
        taskName: 'Phase 1',
        workSubmittedDate: new Date(),
        amount: 7500,
      };

      vi.mocked(milestoneService.getMilestonesForAutoRelease).mockResolvedValue([
        mockMilestone as any,
      ]);
      vi.mocked(milestoneService.releaseMilestonePayment).mockResolvedValue({} as any);

      await autoReleaseMilestonesHandler(mockContext);

      expect(mockLog.info).toHaveBeenCalledWith(
        expect.objectContaining({
          milestoneId: 'milestone-1',
          amount: 7500,
        }),
        'Milestone auto-released successfully',
      );
    });
  });
});
