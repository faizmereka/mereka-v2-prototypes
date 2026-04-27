import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Mongoose models BEFORE imports
vi.mock('@core/models/Contract');
vi.mock('@core/models/TimelogEntry');

// Import after mocks
import { Contract } from '@core/models/Contract';
import { TimelogEntry, TimelogStatus } from '@core/models/TimelogEntry';
import { hubTimelogService as timelogService } from '@services/hub';
import mongoose from 'mongoose';

describe('TimelogService', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockContractId = '507f1f77bcf86cd799439012';
  const mockTimelogId = '507f1f77bcf86cd799439013';
  const mockJobId = '507f1f77bcf86cd799439014';
  const mockClientId = '507f1f77bcf86cd799439015';
  const mockClientHubId = '507f1f77bcf86cd799439016';
  const mockExpertHubId = '507f1f77bcf86cd799439017';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockContract = {
    _id: mockContractId,
    jobId: new mongoose.Types.ObjectId(mockJobId),
    asssignedExpertId: new mongoose.Types.ObjectId(mockUserId),
    createdBy: new mongoose.Types.ObjectId(mockClientId),
    clientHubId: new mongoose.Types.ObjectId(mockClientHubId),
    expertHubId: new mongoose.Types.ObjectId(mockExpertHubId),
    priceType: 'hourly',
    hourlyProposedPrice: 50,
    weeklyLimit: 40,
    selectedCurrency: 'MYR',
  };

  const validTimelogData = {
    contractId: mockContractId,
    workDate: '2025-12-01',
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 1,
    description: 'Worked on backend API development and bug fixes',
    tasks: ['API development', 'Bug fixes', 'Code review'],
  };

  describe('createTimelog', () => {
    it('should create timelog entry successfully', async () => {
      const mockTimelog = {
        _id: mockTimelogId,
        ...validTimelogData,
        jobId: mockContract.jobId,
        clientHubId: mockContract.clientHubId,
        expertHubId: mockContract.expertHubId,
        hourlyRate: 50,
        weeklyLimit: 40,
        currency: 'MYR',
        status: TimelogStatus.DRAFT,
      };

      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);
      vi.mocked(TimelogEntry.findOne).mockResolvedValue(null);
      vi.mocked(TimelogEntry.create).mockResolvedValue(mockTimelog as any);

      const result = await timelogService.createTimelog(validTimelogData, mockUserId);

      expect(Contract.findById).toHaveBeenCalledWith(mockContractId);
      expect(TimelogEntry.findOne).toHaveBeenCalledWith({
        contractId: mockContractId,
        expertHubId: mockContract.expertHubId,
        workDate: validTimelogData.workDate,
      });
      expect(TimelogEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contractId: mockContractId,
          jobId: mockContract.jobId,
          clientHubId: mockContract.clientHubId,
          expertHubId: mockContract.expertHubId,
          hourlyRate: 50,
          weeklyLimit: 40,
          status: TimelogStatus.DRAFT,
        }),
      );
      expect(result).toEqual(mockTimelog);
    });

    it('should throw error if contract not found', async () => {
      vi.mocked(Contract.findById).mockResolvedValue(null);

      await expect(timelogService.createTimelog(validTimelogData, mockUserId)).rejects.toThrow(
        'Contract not found',
      );

      expect(TimelogEntry.create).not.toHaveBeenCalled();
    });

    it('should throw error if contract is not hourly', async () => {
      const fixedContract = { ...mockContract, priceType: 'fixed' };
      vi.mocked(Contract.findById).mockResolvedValue(fixedContract as any);

      await expect(timelogService.createTimelog(validTimelogData, mockUserId)).rejects.toThrow(
        'Timelog entries are only for hourly contracts',
      );

      expect(TimelogEntry.create).not.toHaveBeenCalled();
    });

    it('should throw error if user is not assigned expert', async () => {
      const contractWithDifferentExpert = {
        ...mockContract,
        asssignedExpertId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439099'),
      };
      vi.mocked(Contract.findById).mockResolvedValue(contractWithDifferentExpert as any);

      await expect(timelogService.createTimelog(validTimelogData, mockUserId)).rejects.toThrow(
        'Only the assigned expert can create timelog entries',
      );

      expect(TimelogEntry.create).not.toHaveBeenCalled();
    });

    it('should throw error if duplicate entry exists', async () => {
      const existingTimelog = { _id: 'existing', workDate: validTimelogData.workDate };

      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);
      vi.mocked(TimelogEntry.findOne).mockResolvedValue(existingTimelog as any);

      await expect(timelogService.createTimelog(validTimelogData, mockUserId)).rejects.toThrow(
        'A timelog entry already exists for this date',
      );

      expect(TimelogEntry.create).not.toHaveBeenCalled();
    });
  });

  describe('getTimelogs', () => {
    it('should get timelogs with filters and pagination', async () => {
      const mockTimelogs = [
        { _id: '1', workDate: new Date(), status: TimelogStatus.DRAFT },
        { _id: '2', workDate: new Date(), status: TimelogStatus.DRAFT },
      ];

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockTimelogs),
      };

      vi.mocked(TimelogEntry.find).mockReturnValue(mockQuery as any);
      vi.mocked(TimelogEntry.countDocuments).mockResolvedValue(2);

      const result = await timelogService.getTimelogs({
        contractId: mockContractId,
        page: 1,
        limit: 20,
      });

      expect(TimelogEntry.find).toHaveBeenCalledWith(
        expect.objectContaining({
          contractId: mockContractId,
        }),
      );
      expect(result.items).toEqual(mockTimelogs);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by status and year/week', async () => {
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(TimelogEntry.find).mockReturnValue(mockQuery as any);
      vi.mocked(TimelogEntry.countDocuments).mockResolvedValue(0);

      await timelogService.getTimelogs({
        expertId: mockExpertHubId, // Now maps to expertHubId
        status: TimelogStatus.SUBMITTED,
        year: 2025,
        weekNumber: 48,
        page: 1,
        limit: 20,
      });

      expect(TimelogEntry.find).toHaveBeenCalledWith(
        expect.objectContaining({
          expertHubId: mockExpertHubId,
          status: TimelogStatus.SUBMITTED,
          year: 2025,
          weekNumber: 48,
        }),
      );
    });
  });

  describe('getTimelogById', () => {
    it('should get timelog by id successfully', async () => {
      const mockTimelog = {
        _id: mockTimelogId,
        workDate: new Date(),
        status: TimelogStatus.DRAFT,
      };

      const mockQuery = {
        lean: vi.fn().mockResolvedValue(mockTimelog),
      };
      vi.mocked(TimelogEntry.findById).mockReturnValue(mockQuery as any);

      const result = await timelogService.getTimelogById(mockTimelogId);

      expect(TimelogEntry.findById).toHaveBeenCalledWith(mockTimelogId);
      expect(result).toEqual(mockTimelog);
    });

    it('should throw error if timelog not found', async () => {
      const mockQuery = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(TimelogEntry.findById).mockReturnValue(mockQuery as any);

      await expect(timelogService.getTimelogById(mockTimelogId)).rejects.toThrow(
        'Timelog entry not found',
      );
    });
  });

  describe('updateTimelog', () => {
    it('should update draft timelog successfully', async () => {
      const mockTimelog = {
        _id: mockTimelogId,
        contractId: new mongoose.Types.ObjectId(mockContractId),
        status: TimelogStatus.DRAFT,
        startTime: '09:00',
        endTime: '17:00',
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(TimelogEntry.findById).mockResolvedValue(mockTimelog as any);
      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      const updateData = {
        startTime: '10:00',
        endTime: '18:00',
        description: 'Updated work description for the day',
      };

      await timelogService.updateTimelog(mockTimelogId, updateData, mockUserId);

      expect(Contract.findById).toHaveBeenCalledWith(mockTimelog.contractId);
      expect(mockTimelog.startTime).toBe('10:00');
      expect(mockTimelog.endTime).toBe('18:00');
      expect(mockTimelog.save).toHaveBeenCalled();
    });

    it('should throw error if timelog not found', async () => {
      vi.mocked(TimelogEntry.findById).mockResolvedValue(null);

      await expect(
        timelogService.updateTimelog(mockTimelogId, { startTime: '10:00' }, mockUserId),
      ).rejects.toThrow('Timelog entry not found');
    });

    it('should throw error if user is not authorized', async () => {
      const mockTimelog = {
        _id: mockTimelogId,
        contractId: new mongoose.Types.ObjectId(mockContractId),
        status: TimelogStatus.DRAFT,
      };

      const contractWithDifferentExpert = {
        ...mockContract,
        asssignedExpertId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439099'),
      };

      vi.mocked(TimelogEntry.findById).mockResolvedValue(mockTimelog as any);
      vi.mocked(Contract.findById).mockResolvedValue(contractWithDifferentExpert as any);

      await expect(
        timelogService.updateTimelog(mockTimelogId, { startTime: '10:00' }, mockUserId),
      ).rejects.toThrow('Not authorized to update this timelog entry');
    });

    it('should throw error if timelog is not draft', async () => {
      const mockTimelog = {
        _id: mockTimelogId,
        contractId: new mongoose.Types.ObjectId(mockContractId),
        status: TimelogStatus.SUBMITTED,
      };

      vi.mocked(TimelogEntry.findById).mockResolvedValue(mockTimelog as any);
      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await expect(
        timelogService.updateTimelog(mockTimelogId, { startTime: '10:00' }, mockUserId),
      ).rejects.toThrow('Only draft timelog entries can be edited');
    });
  });

  describe('deleteTimelog', () => {
    it('should delete draft timelog successfully', async () => {
      const mockTimelog = {
        _id: mockTimelogId,
        contractId: new mongoose.Types.ObjectId(mockContractId),
        status: TimelogStatus.DRAFT,
      };

      vi.mocked(TimelogEntry.findById).mockResolvedValue(mockTimelog as any);
      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);
      vi.mocked(TimelogEntry.deleteOne).mockResolvedValue({ deletedCount: 1 } as any);

      const result = await timelogService.deleteTimelog(mockTimelogId, mockUserId);

      expect(Contract.findById).toHaveBeenCalledWith(mockTimelog.contractId);
      expect(TimelogEntry.deleteOne).toHaveBeenCalledWith({ _id: mockTimelogId });
      expect(result.success).toBe(true);
      expect(result.message).toBe('Timelog entry deleted successfully');
    });

    it('should throw error if timelog not found', async () => {
      vi.mocked(TimelogEntry.findById).mockResolvedValue(null);

      await expect(timelogService.deleteTimelog(mockTimelogId, mockUserId)).rejects.toThrow(
        'Timelog entry not found',
      );
    });

    it('should throw error if user is not authorized', async () => {
      const mockTimelog = {
        _id: mockTimelogId,
        contractId: new mongoose.Types.ObjectId(mockContractId),
        status: TimelogStatus.DRAFT,
      };

      const contractWithDifferentExpert = {
        ...mockContract,
        asssignedExpertId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439099'),
      };

      vi.mocked(TimelogEntry.findById).mockResolvedValue(mockTimelog as any);
      vi.mocked(Contract.findById).mockResolvedValue(contractWithDifferentExpert as any);

      await expect(timelogService.deleteTimelog(mockTimelogId, mockUserId)).rejects.toThrow(
        'Not authorized to delete this timelog entry',
      );
    });

    it('should throw error if timelog is not draft', async () => {
      const mockTimelog = {
        _id: mockTimelogId,
        contractId: new mongoose.Types.ObjectId(mockContractId),
        status: TimelogStatus.APPROVED,
      };

      vi.mocked(TimelogEntry.findById).mockResolvedValue(mockTimelog as any);
      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await expect(timelogService.deleteTimelog(mockTimelogId, mockUserId)).rejects.toThrow(
        'Only draft timelog entries can be deleted',
      );
    });
  });

  describe('submitTimelog', () => {
    it('should submit timelog successfully', async () => {
      const mockTimelog = {
        _id: mockTimelogId,
        contractId: new mongoose.Types.ObjectId(mockContractId),
        status: TimelogStatus.DRAFT,
        year: 2025,
        weekNumber: 48,
        weeklyLimit: 40,
        submittedDate: undefined,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(TimelogEntry.findById).mockResolvedValue(mockTimelog as any);
      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);
      vi.mocked(TimelogEntry.checkWeeklyLimit).mockResolvedValue({
        isExceeded: false,
        total: 35,
        limit: 40,
        remaining: 5,
      } as any);

      await timelogService.submitTimelog(mockTimelogId, mockUserId);

      expect(Contract.findById).toHaveBeenCalledWith(mockTimelog.contractId);
      expect(TimelogEntry.checkWeeklyLimit).toHaveBeenCalledWith(mockContractId, 2025, 48, 40);
      expect(mockTimelog.status).toBe(TimelogStatus.SUBMITTED);
      expect(mockTimelog.submittedDate).toBeInstanceOf(Date);
      expect(mockTimelog.save).toHaveBeenCalled();
    });

    it('should throw error if weekly limit exceeded', async () => {
      const mockTimelog = {
        _id: mockTimelogId,
        contractId: new mongoose.Types.ObjectId(mockContractId),
        status: TimelogStatus.DRAFT,
        year: 2025,
        weekNumber: 48,
        weeklyLimit: 40,
      };

      vi.mocked(TimelogEntry.findById).mockResolvedValue(mockTimelog as any);
      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);
      vi.mocked(TimelogEntry.checkWeeklyLimit).mockResolvedValue({
        isExceeded: true,
        total: 45,
        limit: 40,
        remaining: 0,
      } as any);

      await expect(timelogService.submitTimelog(mockTimelogId, mockUserId)).rejects.toThrow(
        'Weekly limit exceeded',
      );
    });

    it('should throw error if timelog is not draft', async () => {
      const mockTimelog = {
        _id: mockTimelogId,
        contractId: new mongoose.Types.ObjectId(mockContractId),
        status: TimelogStatus.SUBMITTED,
      };

      vi.mocked(TimelogEntry.findById).mockResolvedValue(mockTimelog as any);
      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await expect(timelogService.submitTimelog(mockTimelogId, mockUserId)).rejects.toThrow(
        'Only draft timelog entries can be submitted',
      );
    });
  });

  describe('approveTimelog', () => {
    it('should approve timelog successfully', async () => {
      const mockTimelog = {
        _id: mockTimelogId,
        contractId: new mongoose.Types.ObjectId(mockContractId),
        status: TimelogStatus.SUBMITTED,
        approvedDate: undefined,
        paymentIntentId: undefined,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(TimelogEntry.findById).mockResolvedValue(mockTimelog as any);
      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      const approvalData = {
        paymentIntentId: 'pi_test_timelog_123',
      };

      await timelogService.approveTimelog(mockTimelogId, approvalData, mockClientId);

      expect(Contract.findById).toHaveBeenCalledWith(mockTimelog.contractId);
      expect(mockTimelog.status).toBe(TimelogStatus.APPROVED);
      expect(mockTimelog.approvedDate).toBeInstanceOf(Date);
      expect(mockTimelog.paymentIntentId).toBe('pi_test_timelog_123');
      expect(mockTimelog.save).toHaveBeenCalled();
    });

    it('should throw error if user is not the client', async () => {
      const mockTimelog = {
        _id: mockTimelogId,
        contractId: new mongoose.Types.ObjectId(mockContractId),
        status: TimelogStatus.SUBMITTED,
      };

      const contractWithDifferentClient = {
        ...mockContract,
        createdBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439099'),
      };

      vi.mocked(TimelogEntry.findById).mockResolvedValue(mockTimelog as any);
      vi.mocked(Contract.findById).mockResolvedValue(contractWithDifferentClient as any);

      await expect(timelogService.approveTimelog(mockTimelogId, {}, mockClientId)).rejects.toThrow(
        'Only the client can approve timelog entries',
      );
    });

    it('should throw error if timelog is not submitted', async () => {
      const mockTimelog = {
        _id: mockTimelogId,
        contractId: new mongoose.Types.ObjectId(mockContractId),
        status: TimelogStatus.DRAFT,
      };

      vi.mocked(TimelogEntry.findById).mockResolvedValue(mockTimelog as any);
      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await expect(timelogService.approveTimelog(mockTimelogId, {}, mockClientId)).rejects.toThrow(
        'Only submitted timelog entries can be approved',
      );
    });
  });

  describe('rejectTimelog', () => {
    it('should reject timelog successfully', async () => {
      const mockTimelog = {
        _id: mockTimelogId,
        contractId: new mongoose.Types.ObjectId(mockContractId),
        status: TimelogStatus.SUBMITTED,
        rejectedDate: undefined,
        rejectionReason: undefined,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(TimelogEntry.findById).mockResolvedValue(mockTimelog as any);
      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      const rejectionData = {
        reason: 'Hours do not match with project timeline',
      };

      await timelogService.rejectTimelog(mockTimelogId, rejectionData, mockClientId);

      expect(Contract.findById).toHaveBeenCalledWith(mockTimelog.contractId);
      expect(mockTimelog.status).toBe(TimelogStatus.REJECTED);
      expect(mockTimelog.rejectedDate).toBeInstanceOf(Date);
      expect(mockTimelog.rejectionReason).toBe(rejectionData.reason);
      expect(mockTimelog.save).toHaveBeenCalled();
    });

    it('should throw error if user is not the client', async () => {
      const mockTimelog = {
        _id: mockTimelogId,
        contractId: new mongoose.Types.ObjectId(mockContractId),
        status: TimelogStatus.SUBMITTED,
      };

      const contractWithDifferentClient = {
        ...mockContract,
        createdBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439099'),
      };

      vi.mocked(TimelogEntry.findById).mockResolvedValue(mockTimelog as any);
      vi.mocked(Contract.findById).mockResolvedValue(contractWithDifferentClient as any);

      await expect(
        timelogService.rejectTimelog(mockTimelogId, { reason: 'Invalid' }, mockClientId),
      ).rejects.toThrow('Only the client can reject timelog entries');
    });

    it('should throw error if timelog is not submitted', async () => {
      const mockTimelog = {
        _id: mockTimelogId,
        contractId: new mongoose.Types.ObjectId(mockContractId),
        status: TimelogStatus.APPROVED,
      };

      vi.mocked(TimelogEntry.findById).mockResolvedValue(mockTimelog as any);
      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await expect(
        timelogService.rejectTimelog(mockTimelogId, { reason: 'Invalid' }, mockClientId),
      ).rejects.toThrow('Only submitted timelog entries can be rejected');
    });
  });

  describe('getWeeklySummary', () => {
    it('should get weekly summary successfully', async () => {
      const mockTimelogs = [
        {
          _id: '1',
          hoursWorked: 8,
          billableAmount: 400,
          status: TimelogStatus.APPROVED,
          weeklyLimit: 40,
        },
        {
          _id: '2',
          hoursWorked: 7,
          billableAmount: 350,
          status: TimelogStatus.SUBMITTED,
          weeklyLimit: 40,
        },
      ];

      vi.mocked(TimelogEntry.findByWeek).mockResolvedValue(mockTimelogs as any);

      const result = await timelogService.getWeeklySummary({
        contractId: mockContractId,
        year: 2025,
        weekNumber: 48,
      });

      expect(TimelogEntry.findByWeek).toHaveBeenCalledWith(mockContractId, 2025, 48);
      expect(result.totalHours).toBe(15);
      expect(result.totalAmount).toBe(750);
      expect(result.weeklyLimit).toBe(40);
      expect(result.isOverLimit).toBe(false);
      expect(result.remainingHours).toBe(25);
      expect(result.entriesCount).toBe(2);
      expect(result.byStatus.approved).toBe(1);
      expect(result.byStatus.submitted).toBe(1);
    });
  });

  describe('getWeeklyTotal', () => {
    it('should get weekly total hours', async () => {
      vi.mocked(TimelogEntry.calculateWeeklyTotal).mockResolvedValue(35);

      const result = await timelogService.getWeeklyTotal(mockContractId, 2025, 48);

      expect(TimelogEntry.calculateWeeklyTotal).toHaveBeenCalledWith(mockContractId, 2025, 48);
      expect(result).toBe(35);
    });
  });

  describe('checkWeeklyLimit', () => {
    it('should check weekly limit', async () => {
      const checkResult = {
        isExceeded: false,
        total: 35,
        limit: 40,
        remaining: 5,
      };

      vi.mocked(TimelogEntry.checkWeeklyLimit).mockResolvedValue(checkResult as any);

      const result = await timelogService.checkWeeklyLimit(mockContractId, 2025, 48, 40);

      expect(TimelogEntry.checkWeeklyLimit).toHaveBeenCalledWith(mockContractId, 2025, 48, 40);
      expect(result).toEqual(checkResult);
    });
  });
});
