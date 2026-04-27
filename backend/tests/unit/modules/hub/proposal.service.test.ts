import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Mongoose models BEFORE imports
vi.mock('@core/models/Job');
vi.mock('@core/models/JobProposal');
vi.mock('@core/models/Milestone');

// Import after mocks
import { Job } from '@core/models/Job';
import { JobProposal, PriceType, ProposalStatus } from '@core/models/JobProposal';
import { Milestone } from '@core/models/Milestone';
import { hubProposalService as proposalService } from '@services/hub';
import mongoose from 'mongoose';

describe('ProposalService', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockJobId = '507f1f77bcf86cd799439012';
  const mockProposalId = '507f1f77bcf86cd799439013';
  const mockClientId = '507f1f77bcf86cd799439014';
  const mockHubId = '507f1f77bcf86cd799439015';
  const mockContractId = '507f1f77bcf86cd799439016';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validFixedPriceProposalData = {
    jobId: mockJobId,
    proposalDetails: 'I am an experienced developer with 5 years of experience...',
    priceType: PriceType.FIXED,
    proposedPrice: 5000,
    selectedCurrency: 'MYR',
    files: ['https://example.com/portfolio.pdf'],
    milestones: [
      {
        taskName: 'Phase 1: Design',
        taskDescription: 'UI/UX Design',
        amount: 2000,
        dueDate: '2025-12-01',
      },
      {
        taskName: 'Phase 2: Development',
        taskDescription: 'Backend development',
        amount: 3000,
        dueDate: '2025-12-15',
      },
    ],
  };

  const validHourlyProposalData = {
    jobId: mockJobId,
    proposalDetails: 'I can help you with hourly consultation...',
    priceType: PriceType.HOURLY,
    hourlyProposedPrice: 50,
    workingHours: 40,
    selectedCurrency: 'MYR',
    files: [],
    milestones: [],
  };

  const mockJob = {
    _id: mockJobId,
    createdBy: mockClientId,
    hubId: mockHubId,
    jobTitle: 'Test Job',
  };

  describe('createProposal', () => {
    it('should create fixed price proposal with milestones successfully', async () => {
      const mockProposal = {
        _id: mockProposalId,
        ...validFixedPriceProposalData,
        asssignedExpertId: mockUserId,
        expertId: mockUserId,
        createdBy: mockClientId,
        status: ProposalStatus.PENDING,
      };

      // Mock job exists
      vi.mocked(Job.findById).mockResolvedValue(mockJob as any);

      // Mock no existing proposal
      vi.mocked(JobProposal.findOne).mockResolvedValue(null);

      // Mock proposal creation
      vi.mocked(JobProposal.create).mockResolvedValue(mockProposal as any);

      // Mock milestone creation
      vi.mocked(Milestone.insertMany).mockResolvedValue([
        { _id: 'milestone1' },
        { _id: 'milestone2' },
      ] as any);

      const result = await proposalService.createProposal(validFixedPriceProposalData, mockUserId);

      expect(Job.findById).toHaveBeenCalledWith(mockJobId);
      expect(JobProposal.findOne).toHaveBeenCalledWith({
        jobId: mockJobId,
        asssignedExpertId: mockUserId,
      });
      expect(JobProposal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: mockJobId,
          proposalDetails: validFixedPriceProposalData.proposalDetails,
          priceType: PriceType.FIXED,
          status: ProposalStatus.PENDING,
        }),
      );
      expect(Milestone.insertMany).toHaveBeenCalled();
      expect(result).toEqual(mockProposal);
    });

    it('should create hourly proposal without milestones successfully', async () => {
      const mockProposal = {
        _id: mockProposalId,
        ...validHourlyProposalData,
        asssignedExpertId: mockUserId,
        expertId: mockUserId,
        createdBy: mockClientId,
        status: ProposalStatus.PENDING,
      };

      vi.mocked(Job.findById).mockResolvedValue(mockJob as any);
      vi.mocked(JobProposal.findOne).mockResolvedValue(null);
      vi.mocked(JobProposal.create).mockResolvedValue(mockProposal as any);

      const result = await proposalService.createProposal(validHourlyProposalData, mockUserId);

      expect(JobProposal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priceType: PriceType.HOURLY,
          hourlyProposedPrice: 50,
          workingHours: 40,
        }),
      );
      expect(Milestone.insertMany).not.toHaveBeenCalled();
      expect(result).toEqual(mockProposal);
    });

    it('should throw error if job not found', async () => {
      vi.mocked(Job.findById).mockResolvedValue(null);

      await expect(
        proposalService.createProposal(validFixedPriceProposalData, mockUserId),
      ).rejects.toThrow('Job not found');

      expect(JobProposal.create).not.toHaveBeenCalled();
    });

    it('should throw error if duplicate proposal exists', async () => {
      const existingProposal = { _id: 'existing', jobId: mockJobId };

      vi.mocked(Job.findById).mockResolvedValue(mockJob as any);
      vi.mocked(JobProposal.findOne).mockResolvedValue(existingProposal as any);

      await expect(
        proposalService.createProposal(validFixedPriceProposalData, mockUserId),
      ).rejects.toThrow('You have already submitted a proposal for this job');

      expect(JobProposal.create).not.toHaveBeenCalled();
    });
  });

  describe('getProposals', () => {
    it('should get proposals with filters and pagination', async () => {
      const mockProposals = [
        { _id: '1', jobId: mockJobId, status: ProposalStatus.PENDING },
        { _id: '2', jobId: mockJobId, status: ProposalStatus.PENDING },
      ];

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockProposals),
      };

      vi.mocked(JobProposal.find).mockReturnValue(mockQuery as any);
      vi.mocked(JobProposal.countDocuments).mockResolvedValue(2);

      const result = await proposalService.getProposals({
        jobId: mockJobId,
        page: 1,
        limit: 20,
      });

      expect(JobProposal.find).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: mockJobId,
        }),
      );
      expect(result.items).toEqual(mockProposals);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(JobProposal.find).mockReturnValue(mockQuery as any);
      vi.mocked(JobProposal.countDocuments).mockResolvedValue(0);

      await proposalService.getProposals({
        status: ProposalStatus.ACCEPTED,
        page: 1,
        limit: 20,
      });

      expect(JobProposal.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ProposalStatus.ACCEPTED,
        }),
      );
    });
  });

  describe('getProposalById', () => {
    it('should get proposal by id successfully', async () => {
      const mockProposal = {
        _id: mockProposalId,
        jobId: mockJobId,
        status: ProposalStatus.PENDING,
      };

      const mockQuery = {
        lean: vi.fn().mockResolvedValue(mockProposal),
      };
      vi.mocked(JobProposal.findById).mockReturnValue(mockQuery as any);

      const result = await proposalService.getProposalById(mockProposalId);

      expect(JobProposal.findById).toHaveBeenCalledWith(mockProposalId);
      expect(result).toEqual(mockProposal);
    });

    it('should throw error if proposal not found', async () => {
      const mockQuery = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(JobProposal.findById).mockReturnValue(mockQuery as any);

      await expect(proposalService.getProposalById(mockProposalId)).rejects.toThrow(
        'Proposal not found',
      );
    });
  });

  describe('updateProposal', () => {
    it('should update proposal status successfully', async () => {
      const mockProposal = {
        _id: mockProposalId,
        status: ProposalStatus.PENDING,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(JobProposal.findById).mockResolvedValue(mockProposal as any);

      const result = await proposalService.updateProposal(mockProposalId, {
        status: ProposalStatus.ACCEPTED,
      });

      expect(JobProposal.findById).toHaveBeenCalledWith(mockProposalId);
      expect(mockProposal.status).toBe(ProposalStatus.ACCEPTED);
      expect(mockProposal.save).toHaveBeenCalled();
    });

    it('should update proposal contractId successfully', async () => {
      const mockProposal = {
        _id: mockProposalId,
        status: ProposalStatus.PENDING,
        contractId: undefined,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(JobProposal.findById).mockResolvedValue(mockProposal as any);

      await proposalService.updateProposal(mockProposalId, {
        contractId: mockContractId,
      });

      expect(mockProposal.contractId).toEqual(expect.any(mongoose.Types.ObjectId));
      expect(mockProposal.save).toHaveBeenCalled();
    });

    it('should throw error if proposal not found', async () => {
      vi.mocked(JobProposal.findById).mockResolvedValue(null);

      await expect(
        proposalService.updateProposal(mockProposalId, { status: ProposalStatus.ACCEPTED }),
      ).rejects.toThrow('Proposal not found');
    });
  });

  describe('withdrawProposal', () => {
    it('should withdraw proposal successfully', async () => {
      const mockProposal = {
        _id: mockProposalId,
        asssignedExpertId: { toString: () => mockUserId },
        status: ProposalStatus.PENDING,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(JobProposal.findById).mockResolvedValue(mockProposal as any);

      const result = await proposalService.withdrawProposal(mockProposalId, mockUserId);

      expect(mockProposal.status).toBe(ProposalStatus.WITHDRAWN);
      expect(mockProposal.save).toHaveBeenCalled();
    });

    it('should throw error if user is not the proposal owner', async () => {
      const mockProposal = {
        _id: mockProposalId,
        asssignedExpertId: { toString: () => 'different-user-id' },
        status: ProposalStatus.PENDING,
      };

      vi.mocked(JobProposal.findById).mockResolvedValue(mockProposal as any);

      await expect(proposalService.withdrawProposal(mockProposalId, mockUserId)).rejects.toThrow(
        'Not authorized to withdraw this proposal',
      );
    });

    it('should throw error if proposal status is not PENDING', async () => {
      const mockProposal = {
        _id: mockProposalId,
        asssignedExpertId: { toString: () => mockUserId },
        status: ProposalStatus.ACCEPTED,
      };

      vi.mocked(JobProposal.findById).mockResolvedValue(mockProposal as any);

      await expect(proposalService.withdrawProposal(mockProposalId, mockUserId)).rejects.toThrow(
        'Proposal cannot be withdrawn',
      );
    });
  });

  describe('acceptProposal', () => {
    it('should accept proposal and link milestones successfully', async () => {
      const mockProposal = {
        _id: mockProposalId,
        status: ProposalStatus.PENDING,
        contractId: undefined,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(JobProposal.findById).mockResolvedValue(mockProposal as any);
      vi.mocked(Milestone.updateMany).mockResolvedValue({ modifiedCount: 2 } as any);

      const result = await proposalService.acceptProposal(mockProposalId, mockContractId);

      expect(mockProposal.status).toBe(ProposalStatus.ACCEPTED);
      expect(mockProposal.contractId).toEqual(expect.any(mongoose.Types.ObjectId));
      expect(mockProposal.save).toHaveBeenCalled();
      expect(Milestone.updateMany).toHaveBeenCalledWith(
        { jobProposalId: mockProposalId },
        { $set: { contractId: expect.any(mongoose.Types.ObjectId) } },
      );
    });

    it('should throw error if proposal not found', async () => {
      vi.mocked(JobProposal.findById).mockResolvedValue(null);

      await expect(proposalService.acceptProposal(mockProposalId, mockContractId)).rejects.toThrow(
        'Proposal not found',
      );
    });

    it('should throw error if proposal status is not PENDING', async () => {
      const mockProposal = {
        _id: mockProposalId,
        status: ProposalStatus.REJECTED,
      };

      vi.mocked(JobProposal.findById).mockResolvedValue(mockProposal as any);

      await expect(proposalService.acceptProposal(mockProposalId, mockContractId)).rejects.toThrow(
        'Proposal cannot be accepted',
      );
    });
  });

  describe('rejectProposal', () => {
    it('should reject proposal successfully', async () => {
      const mockProposal = {
        _id: mockProposalId,
        createdBy: { toString: () => mockClientId },
        status: ProposalStatus.PENDING,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(JobProposal.findById).mockResolvedValue(mockProposal as any);

      const result = await proposalService.rejectProposal(mockProposalId, mockClientId);

      expect(mockProposal.status).toBe(ProposalStatus.REJECTED);
      expect(mockProposal.save).toHaveBeenCalled();
    });

    it('should throw error if user is not the job owner', async () => {
      const mockProposal = {
        _id: mockProposalId,
        createdBy: { toString: () => 'different-client-id' },
        status: ProposalStatus.PENDING,
      };

      vi.mocked(JobProposal.findById).mockResolvedValue(mockProposal as any);

      await expect(proposalService.rejectProposal(mockProposalId, mockClientId)).rejects.toThrow(
        'Not authorized to reject this proposal',
      );
    });

    it('should throw error if proposal status is not PENDING', async () => {
      const mockProposal = {
        _id: mockProposalId,
        createdBy: { toString: () => mockClientId },
        status: ProposalStatus.ACCEPTED,
      };

      vi.mocked(JobProposal.findById).mockResolvedValue(mockProposal as any);

      await expect(proposalService.rejectProposal(mockProposalId, mockClientId)).rejects.toThrow(
        'Proposal cannot be rejected',
      );
    });

    it('should throw error if proposal not found', async () => {
      vi.mocked(JobProposal.findById).mockResolvedValue(null);

      await expect(proposalService.rejectProposal(mockProposalId, mockClientId)).rejects.toThrow(
        'Proposal not found',
      );
    });
  });
});
