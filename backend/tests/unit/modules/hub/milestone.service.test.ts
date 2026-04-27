import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Mongoose models BEFORE imports
vi.mock('@core/models/Milestone');

// Mock Stripe service to avoid STRIPE_ATLAS_SECRET_KEY requirement
vi.mock('@services/payments', () => ({
  stripeService: {
    createPaymentIntent: vi.fn(),
    capturePaymentIntent: vi.fn(),
    cancelPaymentIntent: vi.fn(),
    createRefund: vi.fn(),
  },
  contractPaymentService: {
    fundMilestone: vi.fn(),
    releaseMilestone: vi.fn(),
  },
}));

// Import after mocks
import { Milestone, MilestoneStatus } from '@core/models/Milestone';
import { hubMilestoneService as milestoneService } from '@services/hub';
import mongoose from 'mongoose';

describe('MilestoneService', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockMilestoneId = '507f1f77bcf86cd799439012';
  const mockProposalId = '507f1f77bcf86cd799439013';
  const mockContractId = '507f1f77bcf86cd799439014';
  const mockJobId = '507f1f77bcf86cd799439015';
  const mockHubId = '507f1f77bcf86cd799439016';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validMilestoneData = {
    jobId: mockJobId,
    jobProposalId: mockProposalId,
    hubId: mockHubId,
    taskName: 'Phase 1: Design',
    taskDescription: 'UI/UX Design phase',
    amount: 2000,
    dueDate: '2025-12-01',
    currency: 'MYR',
  };

  describe('createMilestone', () => {
    it('should create milestone successfully', async () => {
      const mockMilestone = {
        _id: mockMilestoneId,
        ...validMilestoneData,
        createdBy: new mongoose.Types.ObjectId(mockUserId),
        status: MilestoneStatus.FUNDED,
      };

      vi.mocked(Milestone.create).mockResolvedValue(mockMilestone as any);

      const result = await milestoneService.createMilestone(validMilestoneData, mockUserId);

      expect(Milestone.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validMilestoneData,
          createdBy: expect.any(mongoose.Types.ObjectId),
          status: MilestoneStatus.FUNDED,
        }),
      );
      expect(result).toEqual(mockMilestone);
    });

    it('should create milestone with custom status', async () => {
      const dataWithStatus = { ...validMilestoneData, status: MilestoneStatus.WORK_SUBMITTED };
      const mockMilestone = {
        _id: mockMilestoneId,
        ...validMilestoneData,
        status: MilestoneStatus.WORK_SUBMITTED,
        createdBy: new mongoose.Types.ObjectId(mockUserId),
      };

      vi.mocked(Milestone.create).mockResolvedValue(mockMilestone as any);

      const result = await milestoneService.createMilestone(dataWithStatus, mockUserId);

      expect(Milestone.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: MilestoneStatus.WORK_SUBMITTED,
          taskName: validMilestoneData.taskName,
        }),
      );
      expect(result).toEqual(mockMilestone);
    });
  });

  describe('createMultipleMilestones', () => {
    it('should create multiple milestones successfully', async () => {
      const milestonesData = {
        milestones: [
          { ...validMilestoneData, taskName: 'Phase 1' },
          { ...validMilestoneData, taskName: 'Phase 2', amount: 3000 },
        ],
      };

      const mockCreatedMilestones = [
        { _id: 'milestone1', ...milestonesData.milestones[0], status: MilestoneStatus.FUNDED },
        { _id: 'milestone2', ...milestonesData.milestones[1], status: MilestoneStatus.FUNDED },
      ];

      vi.mocked(Milestone.insertMany).mockResolvedValue(mockCreatedMilestones as any);

      const result = await milestoneService.createMultipleMilestones(milestonesData, mockUserId);

      expect(Milestone.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            taskName: 'Phase 1',
            createdBy: expect.any(mongoose.Types.ObjectId),
            status: MilestoneStatus.FUNDED,
          }),
          expect.objectContaining({
            taskName: 'Phase 2',
            amount: 3000,
            createdBy: expect.any(mongoose.Types.ObjectId),
            status: MilestoneStatus.FUNDED,
          }),
        ]),
      );
      expect(result).toEqual(mockCreatedMilestones);
    });
  });

  describe('getMilestones', () => {
    it('should get milestones with filters and pagination', async () => {
      const mockMilestones = [
        { _id: '1', taskName: 'Milestone 1', status: MilestoneStatus.FUNDED },
        { _id: '2', taskName: 'Milestone 2', status: MilestoneStatus.FUNDED },
      ];

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockMilestones),
      };

      vi.mocked(Milestone.find).mockReturnValue(mockQuery as any);
      vi.mocked(Milestone.countDocuments).mockResolvedValue(2);

      const result = await milestoneService.getMilestones({
        jobProposalId: mockProposalId,
        page: 1,
        limit: 20,
      });

      expect(Milestone.find).toHaveBeenCalledWith(
        expect.objectContaining({
          jobProposalId: mockProposalId,
        }),
      );
      expect(result.items).toEqual(mockMilestones);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by status and contractId', async () => {
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(Milestone.find).mockReturnValue(mockQuery as any);
      vi.mocked(Milestone.countDocuments).mockResolvedValue(0);

      await milestoneService.getMilestones({
        contractId: mockContractId,
        status: MilestoneStatus.RELEASED,
        page: 1,
        limit: 20,
      });

      expect(Milestone.find).toHaveBeenCalledWith(
        expect.objectContaining({
          contractId: mockContractId,
          status: MilestoneStatus.RELEASED,
        }),
      );
    });
  });

  describe('getMilestoneById', () => {
    it('should get milestone by id successfully', async () => {
      const mockMilestone = {
        _id: mockMilestoneId,
        taskName: 'Test Milestone',
        status: MilestoneStatus.FUNDED,
      };

      const mockQuery = {
        lean: vi.fn().mockResolvedValue(mockMilestone),
      };
      vi.mocked(Milestone.findById).mockReturnValue(mockQuery as any);

      const result = await milestoneService.getMilestoneById(mockMilestoneId);

      expect(Milestone.findById).toHaveBeenCalledWith(mockMilestoneId);
      expect(result).toEqual(mockMilestone);
    });

    it('should throw error if milestone not found', async () => {
      const mockQuery = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(Milestone.findById).mockReturnValue(mockQuery as any);

      await expect(milestoneService.getMilestoneById(mockMilestoneId)).rejects.toThrow(
        'Milestone not found',
      );
    });
  });

  describe('updateMilestone', () => {
    it('should update milestone successfully', async () => {
      const mockMilestone = {
        _id: mockMilestoneId,
        status: MilestoneStatus.FUNDED,
        taskName: 'Old Name',
        amount: 1000,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Milestone.findById).mockResolvedValue(mockMilestone as any);

      const updateData = {
        taskName: 'Updated Name',
        amount: 2000,
      };

      await milestoneService.updateMilestone(mockMilestoneId, updateData, mockUserId);

      expect(mockMilestone.taskName).toBe('Updated Name');
      expect(mockMilestone.amount).toBe(2000);
      expect(mockMilestone.save).toHaveBeenCalled();
    });

    it('should throw error if milestone not found', async () => {
      vi.mocked(Milestone.findById).mockResolvedValue(null);

      await expect(
        milestoneService.updateMilestone(mockMilestoneId, { taskName: 'New' }, mockUserId),
      ).rejects.toThrow('Milestone not found');
    });

    it('should throw error if milestone cannot be edited', async () => {
      const mockMilestone = {
        _id: mockMilestoneId,
        status: MilestoneStatus.RELEASED,
      };

      vi.mocked(Milestone.findById).mockResolvedValue(mockMilestone as any);

      await expect(
        milestoneService.updateMilestone(mockMilestoneId, { taskName: 'New' }, mockUserId),
      ).rejects.toThrow('Milestone cannot be edited');
    });
  });

  describe('updateMilestoneWithTracking', () => {
    it('should update milestone with change tracking', async () => {
      const mockMilestone = {
        _id: mockMilestoneId,
        status: MilestoneStatus.FUNDED,
        taskName: 'Old Name',
        taskDescription: 'Old Description',
        amount: 1000,
        dueDate: new Date('2025-12-01'),
        changeHistory: [] as any,
        oldValues: undefined as any,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Milestone.findById).mockResolvedValue(mockMilestone as any);

      const updateData = {
        taskName: 'Updated Name',
        amount: 2000,
        changeReason: 'Scope change requested by client',
      };

      await milestoneService.updateMilestoneWithTracking(mockMilestoneId, updateData, mockUserId);

      expect(mockMilestone.taskName).toBe('Updated Name');
      expect(mockMilestone.amount).toBe(2000);
      expect(mockMilestone.oldValues).toEqual(
        expect.objectContaining({
          taskName: 'Old Name',
          amount: 1000,
        }),
      );
      expect(mockMilestone.changeHistory.length).toBeGreaterThan(0);
      expect(mockMilestone.changeHistory[0]?.changeReason).toBe('Scope change requested by client');
      expect(mockMilestone.save).toHaveBeenCalled();
    });

    it('should only track fields that changed', async () => {
      const mockMilestone = {
        _id: mockMilestoneId,
        status: MilestoneStatus.FUNDED,
        taskName: 'Same Name',
        amount: 1000,
        changeHistory: [] as any,
        oldValues: undefined as any,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Milestone.findById).mockResolvedValue(mockMilestone as any);

      await milestoneService.updateMilestoneWithTracking(
        mockMilestoneId,
        { taskName: 'Same Name', amount: 2000 },
        mockUserId,
      );

      // Only amount should have changed
      expect(mockMilestone.changeHistory.length).toBe(1);
      expect(mockMilestone.changeHistory[0]?.fieldName).toBe('amount');
    });
  });

  describe('deleteMilestone', () => {
    it('should delete milestone successfully', async () => {
      const mockMilestone = {
        _id: mockMilestoneId,
        status: MilestoneStatus.FUNDED,
        workSubmittedDate: undefined,
        createdBy: { toString: () => mockUserId },
      };

      vi.mocked(Milestone.findById).mockResolvedValue(mockMilestone as any);
      vi.mocked(Milestone.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

      const result = await milestoneService.deleteMilestone(mockMilestoneId, mockUserId);

      expect(Milestone.deleteOne).toHaveBeenCalledWith({ _id: mockMilestoneId });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Milestone deleted successfully');
    });

    it('should throw error if milestone not found', async () => {
      vi.mocked(Milestone.findById).mockResolvedValue(null);

      await expect(milestoneService.deleteMilestone(mockMilestoneId, mockUserId)).rejects.toThrow(
        'Milestone not found',
      );
    });

    it('should throw error if milestone cannot be deleted (wrong status)', async () => {
      const mockMilestone = {
        _id: mockMilestoneId,
        status: MilestoneStatus.RELEASED,
        createdBy: { toString: () => mockUserId },
      };

      vi.mocked(Milestone.findById).mockResolvedValue(mockMilestone as any);

      await expect(milestoneService.deleteMilestone(mockMilestoneId, mockUserId)).rejects.toThrow(
        'Milestone cannot be deleted',
      );
    });

    it('should throw error if milestone has work submitted', async () => {
      const mockMilestone = {
        _id: mockMilestoneId,
        status: MilestoneStatus.FUNDED,
        workSubmittedDate: new Date(),
        createdBy: { toString: () => mockUserId },
      };

      vi.mocked(Milestone.findById).mockResolvedValue(mockMilestone as any);

      await expect(milestoneService.deleteMilestone(mockMilestoneId, mockUserId)).rejects.toThrow(
        'Milestone cannot be deleted',
      );
    });

    it('should throw error if user is not authorized', async () => {
      const mockMilestone = {
        _id: mockMilestoneId,
        status: MilestoneStatus.FUNDED,
        workSubmittedDate: undefined,
        createdBy: { toString: () => 'different-user-id' },
      };

      vi.mocked(Milestone.findById).mockResolvedValue(mockMilestone as any);

      await expect(milestoneService.deleteMilestone(mockMilestoneId, mockUserId)).rejects.toThrow(
        'Not authorized to delete this milestone',
      );
    });
  });

  describe('submitWork', () => {
    it('should submit work successfully', async () => {
      const mockMilestone = {
        _id: mockMilestoneId,
        status: MilestoneStatus.FUNDED,
        workLogDescription: undefined,
        workLogFilesUrl: undefined as any,
        workSubmittedDate: undefined,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Milestone.findById).mockResolvedValue(mockMilestone as any);

      const workData = {
        workLogDescription: 'Completed the design phase with all deliverables',
        workLogFilesUrl: ['https://example.com/design.pdf'],
      };

      await milestoneService.submitWork(mockMilestoneId, workData, mockUserId);

      expect(mockMilestone.workLogDescription).toBe(workData.workLogDescription);
      expect(mockMilestone.workLogFilesUrl).toEqual(workData.workLogFilesUrl);
      expect(mockMilestone.workSubmittedDate).toBeInstanceOf(Date);
      expect(mockMilestone.status).toBe(MilestoneStatus.WORK_SUBMITTED);
      expect(mockMilestone.save).toHaveBeenCalled();
    });

    it('should throw error if milestone not found', async () => {
      vi.mocked(Milestone.findById).mockResolvedValue(null);

      await expect(
        milestoneService.submitWork(
          mockMilestoneId,
          { workLogDescription: 'Work done', workLogFilesUrl: [] },
          mockUserId,
        ),
      ).rejects.toThrow('Milestone not found');
    });

    it('should throw error if milestone is not active', async () => {
      const mockMilestone = {
        _id: mockMilestoneId,
        status: MilestoneStatus.RELEASED,
      };

      vi.mocked(Milestone.findById).mockResolvedValue(mockMilestone as any);

      await expect(
        milestoneService.submitWork(
          mockMilestoneId,
          { workLogDescription: 'Work done', workLogFilesUrl: [] },
          mockUserId,
        ),
      ).rejects.toThrow('Work can only be submitted for active milestones');
    });
  });

  describe('approveMilestone', () => {
    it('should approve milestone successfully', async () => {
      const mockMilestone = {
        _id: mockMilestoneId,
        status: MilestoneStatus.WORK_SUBMITTED,
        paymentIntentId: undefined,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Milestone.findById).mockResolvedValue(mockMilestone as any);

      const approvalData = {
        paymentIntentId: 'pi_test_123',
      };

      await milestoneService.approveMilestone(mockMilestoneId, approvalData, mockUserId);

      expect(mockMilestone.status).toBe(MilestoneStatus.RELEASED);
      expect(mockMilestone.paymentIntentId).toBe('pi_test_123');
      expect(mockMilestone.save).toHaveBeenCalled();
    });

    it('should throw error if milestone not found', async () => {
      vi.mocked(Milestone.findById).mockResolvedValue(null);

      await expect(
        milestoneService.approveMilestone(mockMilestoneId, {}, mockUserId),
      ).rejects.toThrow('Milestone not found');
    });

    it('should throw error if work not submitted', async () => {
      const mockMilestone = {
        _id: mockMilestoneId,
        status: MilestoneStatus.FUNDED,
      };

      vi.mocked(Milestone.findById).mockResolvedValue(mockMilestone as any);

      await expect(
        milestoneService.approveMilestone(mockMilestoneId, {}, mockUserId),
      ).rejects.toThrow('Only submitted work can be approved');
    });
  });

  describe('getUpcomingMilestones', () => {
    it('should get upcoming milestones', async () => {
      const mockMilestones = [
        { _id: '1', taskName: 'Milestone 1', dueDate: new Date('2025-12-05') },
        { _id: '2', taskName: 'Milestone 2', dueDate: new Date('2025-12-10') },
      ];

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockMilestones),
      };
      vi.mocked(Milestone.find).mockReturnValue(mockQuery as any);

      const result = await milestoneService.getUpcomingMilestones({
        jobProposalId: mockProposalId,
        daysAhead: 7,
      });

      expect(Milestone.find).toHaveBeenCalledWith(
        expect.objectContaining({
          jobProposalId: mockProposalId,
          status: MilestoneStatus.FUNDED,
          dueDate: expect.objectContaining({ $lte: expect.any(Date) }),
        }),
      );
      expect(result).toEqual(mockMilestones);
    });
  });

  describe('getOverdueMilestones', () => {
    it('should get overdue milestones', async () => {
      const mockMilestones = [
        { _id: '1', taskName: 'Overdue 1', dueDate: new Date('2025-11-01') },
        { _id: '2', taskName: 'Overdue 2', dueDate: new Date('2025-11-15') },
      ];

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockMilestones),
      };
      vi.mocked(Milestone.find).mockReturnValue(mockQuery as any);

      const result = await milestoneService.getOverdueMilestones({
        jobProposalId: mockProposalId,
      });

      expect(Milestone.find).toHaveBeenCalledWith(
        expect.objectContaining({
          jobProposalId: mockProposalId,
          status: MilestoneStatus.FUNDED,
          dueDate: expect.objectContaining({ $lt: expect.any(Date) }),
        }),
      );
      expect(result).toEqual(mockMilestones);
    });
  });

  describe('calculateTotalAmount', () => {
    it('should calculate total milestone amount', async () => {
      const mockAggregateResult = [{ totalAmount: 5000 }];

      vi.mocked(Milestone.aggregate).mockResolvedValue(mockAggregateResult as any);

      const result = await milestoneService.calculateTotalAmount(mockProposalId);

      expect(Milestone.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            jobProposalId: expect.any(mongoose.Types.ObjectId),
            status: { $ne: MilestoneStatus.CANCELLED },
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
          },
        },
      ]);
      expect(result).toBe(5000);
    });

    it('should return 0 if no milestones exist', async () => {
      vi.mocked(Milestone.aggregate).mockResolvedValue([]);

      const result = await milestoneService.calculateTotalAmount(mockProposalId);

      expect(result).toBe(0);
    });
  });
});
