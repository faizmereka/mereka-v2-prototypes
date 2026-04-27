import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Mongoose models BEFORE imports
vi.mock('@core/models/Contract');
vi.mock('@core/models/JobProposal');
vi.mock('@services/hub', () => ({
  hubContractService: {},
  hubProposalService: {},
}));

// Import after mocks
import { Contract, ContractStatus, TermsUpdateStatus } from '@core/models/Contract';
import { JobProposal, PriceType } from '@core/models/JobProposal';
import {
  hubContractService as contractService,
  hubProposalService as proposalService,
} from '@services/hub';
import mongoose from 'mongoose';

describe('ContractService', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockExpertId = '507f1f77bcf86cd799439012';
  const mockProposalId = '507f1f77bcf86cd799439013';
  const mockContractId = '507f1f77bcf86cd799439014';
  const mockJobId = '507f1f77bcf86cd799439015';
  const mockHubId = '507f1f77bcf86cd799439016';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validFixedPriceContractData = {
    jobId: mockJobId,
    jobProposalId: mockProposalId,
    clientHubId: mockHubId, // Hub that posted the job (employer)
    contractTitle: 'Website Development Contract',
    contractDescription: 'Full-stack web development project with modern technologies...',
    contractUploads: ['https://example.com/contract.pdf'],
    priceType: PriceType.FIXED,
    proposedPrice: 5000,
    hasMilestones: true,
    startDate: '2025-12-01',
    selectedCurrency: 'MYR',
    asssignedExpertId: mockExpertId,
  };

  const validHourlyContractData = {
    jobId: mockJobId,
    jobProposalId: mockProposalId,
    clientHubId: mockHubId, // Hub that posted the job (employer)
    contractTitle: 'Hourly Consultation Contract',
    contractDescription: 'Ongoing technical consultation on an hourly basis...',
    contractUploads: [],
    priceType: PriceType.HOURLY,
    hourlyProposedPrice: 50,
    weeklyLimit: 40,
    hasMilestones: false,
    startDate: '2025-12-01',
    selectedCurrency: 'MYR',
    asssignedExpertId: mockExpertId,
  };

  const mockProposal = {
    _id: mockProposalId,
    jobId: mockJobId,
    asssignedExpertId: mockExpertId,
  };

  describe('createContract', () => {
    it('should create fixed price contract successfully', async () => {
      const mockContract = {
        _id: mockContractId,
        ...validFixedPriceContractData,
        createdBy: new mongoose.Types.ObjectId(mockUserId),
        status: ContractStatus.PENDING,
      };

      vi.mocked(JobProposal.findById).mockResolvedValue(mockProposal as any);
      vi.mocked(Contract.findOne).mockResolvedValue(null);
      vi.mocked(Contract.create).mockResolvedValue(mockContract as any);
      vi.mocked(proposalService.acceptProposal).mockResolvedValue({} as any);

      const result = await contractService.createContract(validFixedPriceContractData, mockUserId);

      expect(JobProposal.findById).toHaveBeenCalledWith(mockProposalId);
      expect(Contract.findOne).toHaveBeenCalledWith({ jobProposalId: mockProposalId });
      expect(Contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: mockJobId,
          contractTitle: validFixedPriceContractData.contractTitle,
          priceType: PriceType.FIXED,
          status: ContractStatus.PENDING,
        }),
      );
      expect(proposalService.acceptProposal).toHaveBeenCalledWith(mockProposalId, mockContractId);
      expect(result).toEqual(mockContract);
    });

    it('should create hourly contract successfully', async () => {
      const mockContract = {
        _id: mockContractId,
        ...validHourlyContractData,
        createdBy: new mongoose.Types.ObjectId(mockUserId),
        status: ContractStatus.PENDING,
      };

      vi.mocked(JobProposal.findById).mockResolvedValue(mockProposal as any);
      vi.mocked(Contract.findOne).mockResolvedValue(null);
      vi.mocked(Contract.create).mockResolvedValue(mockContract as any);
      vi.mocked(proposalService.acceptProposal).mockResolvedValue({} as any);

      const result = await contractService.createContract(validHourlyContractData, mockUserId);

      expect(Contract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priceType: PriceType.HOURLY,
          hourlyProposedPrice: 50,
          weeklyLimit: 40,
        }),
      );
      expect(result).toEqual(mockContract);
    });

    it('should throw error if proposal not found', async () => {
      vi.mocked(JobProposal.findById).mockResolvedValue(null);

      await expect(
        contractService.createContract(validFixedPriceContractData, mockUserId),
      ).rejects.toThrow('Proposal not found');

      expect(Contract.create).not.toHaveBeenCalled();
    });

    it('should throw error if contract already exists for proposal', async () => {
      const existingContract = { _id: 'existing', jobProposalId: mockProposalId };

      vi.mocked(JobProposal.findById).mockResolvedValue(mockProposal as any);
      vi.mocked(Contract.findOne).mockResolvedValue(existingContract as any);

      await expect(
        contractService.createContract(validFixedPriceContractData, mockUserId),
      ).rejects.toThrow('Contract already exists for this proposal');

      expect(Contract.create).not.toHaveBeenCalled();
    });
  });

  describe('getContracts', () => {
    it('should get contracts with filters and pagination', async () => {
      const mockContracts = [
        { _id: '1', jobId: mockJobId, status: ContractStatus.ACTIVE },
        { _id: '2', jobId: mockJobId, status: ContractStatus.ACTIVE },
      ];

      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockContracts),
      };

      vi.mocked(Contract.find).mockReturnValue(mockQuery as any);
      vi.mocked(Contract.countDocuments).mockResolvedValue(2);

      const result = await contractService.getContracts({
        jobId: mockJobId,
        page: 1,
        limit: 20,
      });

      expect(Contract.find).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: mockJobId,
        }),
      );
      expect(result.items).toEqual(mockContracts);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by status and priceType', async () => {
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(Contract.find).mockReturnValue(mockQuery as any);
      vi.mocked(Contract.countDocuments).mockResolvedValue(0);

      await contractService.getContracts({
        status: ContractStatus.ACTIVE,
        priceType: PriceType.HOURLY,
        page: 1,
        limit: 20,
      });

      expect(Contract.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ContractStatus.ACTIVE,
          priceType: PriceType.HOURLY,
        }),
      );
    });
  });

  describe('getContractById', () => {
    it('should get contract by id successfully', async () => {
      const mockContract = {
        _id: mockContractId,
        jobId: mockJobId,
        status: ContractStatus.ACTIVE,
      };

      const mockQuery = {
        lean: vi.fn().mockResolvedValue(mockContract),
      };
      vi.mocked(Contract.findById).mockReturnValue(mockQuery as any);

      const result = await contractService.getContractById(mockContractId);

      expect(Contract.findById).toHaveBeenCalledWith(mockContractId);
      expect(result).toEqual(mockContract);
    });

    it('should throw error if contract not found', async () => {
      const mockQuery = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(Contract.findById).mockReturnValue(mockQuery as any);

      await expect(contractService.getContractById(mockContractId)).rejects.toThrow(
        'Contract not found',
      );
    });
  });

  describe('updateContract', () => {
    it('should update contract successfully (client)', async () => {
      const mockContract = {
        _id: mockContractId,
        createdBy: { toString: () => mockUserId },
        asssignedExpertId: { toString: () => mockExpertId },
        status: ContractStatus.ACTIVE,
        contractTitle: 'Old Title',
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      const updateData = {
        contractTitle: 'Updated Title',
        status: ContractStatus.COMPLETED,
      };

      await contractService.updateContract(mockContractId, updateData, mockUserId);

      expect(mockContract.contractTitle).toBe('Updated Title');
      expect(mockContract.status).toBe(ContractStatus.COMPLETED);
      expect(mockContract.save).toHaveBeenCalled();
    });

    it('should update contract successfully (expert)', async () => {
      const mockContract = {
        _id: mockContractId,
        createdBy: { toString: () => mockUserId },
        asssignedExpertId: { toString: () => mockExpertId },
        status: ContractStatus.ACTIVE,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await contractService.updateContract(
        mockContractId,
        { status: ContractStatus.PAUSED },
        mockExpertId,
      );

      expect(mockContract.save).toHaveBeenCalled();
    });

    it('should throw error if contract not found', async () => {
      vi.mocked(Contract.findById).mockResolvedValue(null);

      await expect(
        contractService.updateContract(
          mockContractId,
          { status: ContractStatus.ACTIVE },
          mockUserId,
        ),
      ).rejects.toThrow('Contract not found');
    });

    it('should throw error if user is not authorized', async () => {
      const mockContract = {
        _id: mockContractId,
        createdBy: { toString: () => mockUserId },
        asssignedExpertId: { toString: () => mockExpertId },
      };

      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await expect(
        contractService.updateContract(
          mockContractId,
          { status: ContractStatus.ACTIVE },
          'unauthorized-user',
        ),
      ).rejects.toThrow('Not authorized to update this contract');
    });
  });

  describe('cancelContract', () => {
    it('should cancel active contract successfully', async () => {
      const mockContract = {
        _id: mockContractId,
        createdBy: { toString: () => mockUserId },
        asssignedExpertId: { toString: () => mockExpertId },
        status: ContractStatus.ACTIVE,
        endDate: undefined,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await contractService.cancelContract(mockContractId, mockUserId);

      expect(mockContract.status).toBe(ContractStatus.CANCELLED);
      expect(mockContract.endDate).toBeInstanceOf(Date);
      expect(mockContract.save).toHaveBeenCalled();
    });

    it('should throw error if contract not found', async () => {
      vi.mocked(Contract.findById).mockResolvedValue(null);

      await expect(contractService.cancelContract(mockContractId, mockUserId)).rejects.toThrow(
        'Contract not found',
      );
    });

    it('should throw error if user is not authorized', async () => {
      const mockContract = {
        _id: mockContractId,
        createdBy: { toString: () => mockUserId },
        asssignedExpertId: { toString: () => mockExpertId },
        status: ContractStatus.ACTIVE,
      };

      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await expect(
        contractService.cancelContract(mockContractId, 'unauthorized-user'),
      ).rejects.toThrow('Not authorized to cancel this contract');
    });

    it('should throw error if contract status is invalid for cancellation', async () => {
      const mockContract = {
        _id: mockContractId,
        createdBy: { toString: () => mockUserId },
        asssignedExpertId: { toString: () => mockExpertId },
        status: ContractStatus.COMPLETED,
      };

      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await expect(contractService.cancelContract(mockContractId, mockUserId)).rejects.toThrow(
        'Contract cannot be cancelled',
      );
    });
  });

  describe('pauseContract', () => {
    it('should pause active contract successfully', async () => {
      const mockContract = {
        _id: mockContractId,
        createdBy: { toString: () => mockUserId },
        asssignedExpertId: { toString: () => mockExpertId },
        status: ContractStatus.ACTIVE,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await contractService.pauseContract(mockContractId, mockUserId);

      expect(mockContract.status).toBe(ContractStatus.PAUSED);
      expect(mockContract.save).toHaveBeenCalled();
    });

    it('should throw error if contract is not active', async () => {
      const mockContract = {
        _id: mockContractId,
        createdBy: { toString: () => mockUserId },
        asssignedExpertId: { toString: () => mockExpertId },
        status: ContractStatus.PENDING,
      };

      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await expect(contractService.pauseContract(mockContractId, mockUserId)).rejects.toThrow(
        'Only active contracts can be paused',
      );
    });
  });

  describe('resumeContract', () => {
    it('should resume paused contract successfully', async () => {
      const mockContract = {
        _id: mockContractId,
        createdBy: { toString: () => mockUserId },
        asssignedExpertId: { toString: () => mockExpertId },
        status: ContractStatus.PAUSED,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await contractService.resumeContract(mockContractId, mockUserId);

      expect(mockContract.status).toBe(ContractStatus.ACTIVE);
      expect(mockContract.save).toHaveBeenCalled();
    });

    it('should throw error if contract is not paused', async () => {
      const mockContract = {
        _id: mockContractId,
        createdBy: { toString: () => mockUserId },
        asssignedExpertId: { toString: () => mockExpertId },
        status: ContractStatus.ACTIVE,
      };

      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await expect(contractService.resumeContract(mockContractId, mockUserId)).rejects.toThrow(
        'Only paused contracts can be resumed',
      );
    });
  });

  describe('requestTermsUpdate', () => {
    it('should request terms update successfully', async () => {
      const mockContract = {
        _id: mockContractId,
        createdBy: { toString: () => mockUserId },
        asssignedExpertId: { toString: () => mockExpertId },
        priceType: 'hourly',
        pendingTermsUpdate: undefined,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      const updateData = {
        weeklyLimit: 50,
        hourlyRate: 60,
        effectiveDate: '2025-12-15',
      };

      await contractService.requestTermsUpdate(mockContractId, updateData, mockUserId);

      expect(mockContract.pendingTermsUpdate).toEqual(
        expect.objectContaining({
          weeklyLimit: 50,
          hourlyRate: 60,
          status: TermsUpdateStatus.PENDING,
        }),
      );
      expect(mockContract.save).toHaveBeenCalled();
    });

    it('should throw error if contract is not hourly', async () => {
      const mockContract = {
        _id: mockContractId,
        createdBy: { toString: () => mockUserId },
        asssignedExpertId: { toString: () => mockExpertId },
        priceType: 'fixed',
      };

      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await expect(
        contractService.requestTermsUpdate(
          mockContractId,
          { weeklyLimit: 50, hourlyRate: 60, effectiveDate: new Date().toISOString() },
          mockUserId,
        ),
      ).rejects.toThrow('Terms update is only available for hourly contracts');
    });

    it('should throw error if there is already a pending update', async () => {
      const mockContract = {
        _id: mockContractId,
        createdBy: { toString: () => mockUserId },
        asssignedExpertId: { toString: () => mockExpertId },
        priceType: 'hourly',
        pendingTermsUpdate: { status: TermsUpdateStatus.PENDING },
      };

      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await expect(
        contractService.requestTermsUpdate(
          mockContractId,
          { weeklyLimit: 50, hourlyRate: 60, effectiveDate: new Date().toISOString() },
          mockUserId,
        ),
      ).rejects.toThrow('There is already a pending terms update');
    });
  });

  describe('applyTermsUpdate', () => {
    it('should apply pending terms update successfully', async () => {
      const mockContract = {
        _id: mockContractId,
        createdBy: { toString: () => mockUserId },
        asssignedExpertId: { toString: () => mockExpertId },
        priceType: 'hourly',
        weeklyLimit: 40,
        hourlyProposedPrice: 50,
        pendingTermsUpdate: {
          weeklyLimit: 50,
          hourlyRate: 60,
          status: TermsUpdateStatus.PENDING,
          requestedBy: { toString: () => mockExpertId },
          appliedDate: undefined as any,
        } as any,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await contractService.applyTermsUpdate({ contractId: mockContractId }, mockUserId);

      expect(mockContract.weeklyLimit).toBe(50);
      expect(mockContract.hourlyProposedPrice).toBe(60);
      expect(mockContract.pendingTermsUpdate.status).toBe(TermsUpdateStatus.APPLIED);
      expect(mockContract.pendingTermsUpdate.appliedDate).toBeInstanceOf(Date);
      expect(mockContract.save).toHaveBeenCalled();
    });

    it('should throw error if no pending update exists', async () => {
      const mockContract = {
        _id: mockContractId,
        createdBy: { toString: () => mockUserId },
        asssignedExpertId: { toString: () => mockExpertId },
        priceType: 'hourly',
        pendingTermsUpdate: undefined,
      };

      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await expect(
        contractService.applyTermsUpdate({ contractId: mockContractId }, mockUserId),
      ).rejects.toThrow('No pending terms update to apply');
    });

    it('should throw error if user tries to approve their own request', async () => {
      const mockContract = {
        _id: mockContractId,
        createdBy: { toString: () => mockUserId },
        asssignedExpertId: { toString: () => mockExpertId },
        priceType: 'hourly',
        pendingTermsUpdate: {
          weeklyLimit: 50,
          hourlyRate: 60,
          status: TermsUpdateStatus.PENDING,
          requestedBy: { toString: () => mockUserId },
        },
      };

      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await expect(
        contractService.applyTermsUpdate({ contractId: mockContractId }, mockUserId),
      ).rejects.toThrow('Cannot approve your own terms update request');
    });

    it('should throw error if contract is not hourly', async () => {
      const mockContract = {
        _id: mockContractId,
        priceType: 'fixed',
      };

      vi.mocked(Contract.findById).mockResolvedValue(mockContract as any);

      await expect(
        contractService.applyTermsUpdate({ contractId: mockContractId }, mockUserId),
      ).rejects.toThrow('Terms update is only available for hourly contracts');
    });
  });
});
