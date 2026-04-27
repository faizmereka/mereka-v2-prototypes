import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock ContractPayment model
vi.mock('@core/models/ContractPayment', () => ({
  ContractPayment: {
    create: vi.fn(),
  },
  ContractPaymentType: {
    MILESTONE: 'milestone',
    TIMELOG: 'timelog',
  },
}));

// Mock services BEFORE imports
vi.mock('@services/hub', () => ({
  hubTimelogService: {
    getApprovedUnpaidTimelogs: vi.fn(),
    markTimelogsAsPaid: vi.fn(),
  },
  hubContractService: {
    getContractForPayment: vi.fn(),
  },
}));

vi.mock('@services/payments', () => ({
  stripeService: {
    createPaymentIntent: vi.fn(),
  },
  pendingPaymentService: {
    create: vi.fn(),
  },
}));

import { ContractPayment } from '@core/models/ContractPayment';
import type { JobContext } from '@jobs/helpers/job-runner';
import {
  calculateStripeFee,
  weeklyPayoutProcessorHandler,
} from '@jobs/payment/weekly-payout-processor';
import {
  hubContractService as contractService,
  hubTimelogService as timelogService,
} from '@services/hub';
import { pendingPaymentService, stripeService } from '@services/payments';

describe('Weekly Payout Processor Job', () => {
  const mockLog = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };

  const mockContext: JobContext = {
    fastify: {} as any,
    runId: 'run-123',
    jobName: 'weekly-payout-processor',
    triggeredBy: 'schedule',
    log: mockLog as any,
    updateMetadata: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateStripeFee', () => {
    it('should calculate Stripe fee correctly (2.9% + $0.30, truncated to whole number)', () => {
      // $100 -> 2.9 + 0.30 = $3.20 -> truncated to $3
      expect(calculateStripeFee(100)).toBe(3);

      // $500 -> 14.5 + 0.30 = $14.80 -> truncated to $14
      expect(calculateStripeFee(500)).toBe(14);

      // $1000 -> 29 + 0.30 = $29.30 -> truncated to $29
      expect(calculateStripeFee(1000)).toBe(29);
    });

    it('should return 0 for negative amounts', () => {
      expect(calculateStripeFee(-100)).toBe(0);
    });

    it('should handle small amounts', () => {
      // $1 -> 0.029 + 0.30 = $0.329 -> truncated to $0
      expect(calculateStripeFee(1)).toBe(0);

      // $10 -> 0.29 + 0.30 = $0.59 -> truncated to $0
      expect(calculateStripeFee(10)).toBe(0);
    });
  });

  describe('weeklyPayoutProcessorHandler', () => {
    it('should return zero counts when no timelogs found', async () => {
      vi.mocked(timelogService.getApprovedUnpaidTimelogs).mockResolvedValue([]);

      const result = await weeklyPayoutProcessorHandler(mockContext);

      expect(result).toEqual({
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
      });
      expect(mockLog.info).toHaveBeenCalledWith('No timelogs found for the past week');
    });

    it('should process timelogs and create payment successfully', async () => {
      const mockTimelogs = [
        {
          _id: 'timelog-1',
          contractId: { toString: () => 'contract-1' },
          startTime: '09:00',
          endTime: '17:00', // 8 hours
        },
        {
          _id: 'timelog-2',
          contractId: { toString: () => 'contract-1' },
          startTime: '09:00',
          endTime: '13:00', // 4 hours
        },
      ];

      const mockContract = {
        _id: { toString: () => 'contract-1' },
        hourlyProposedPrice: 50, // $50/hour
        selectedCurrency: 'USD',
        stripeCustomerId: 'cus_test_123',
        paymentMethodId: 'pm_test_123',
        contractTitle: 'Web Development',
        hubId: { toString: () => 'hub-1' },
        jobId: { toString: () => 'job-1' },
        jobProposalId: { toString: () => 'proposal-1' },
        createdBy: { toString: () => 'client-1' },
        asssignedExpertId: { toString: () => 'expert-1' },
      };

      const mockPaymentIntent = {
        id: 'pi_test_success_123',
        status: 'succeeded',
      };

      vi.mocked(timelogService.getApprovedUnpaidTimelogs).mockResolvedValue(mockTimelogs as any);
      vi.mocked(contractService.getContractForPayment).mockResolvedValue(mockContract as any);
      vi.mocked(stripeService.createPaymentIntent).mockResolvedValue(mockPaymentIntent as any);
      vi.mocked(timelogService.markTimelogsAsPaid).mockResolvedValue(undefined);
      vi.mocked(ContractPayment.create).mockResolvedValue({} as any);

      const result = await weeklyPayoutProcessorHandler(mockContext);

      expect(result).toEqual({
        recordsProcessed: 1, // 1 contract
        recordsSucceeded: 1,
        recordsFailed: 0,
      });

      // 12 hours * $50 = $600
      // Stripe fee: 2.9% * 600 + 0.30 = 17.4 + 0.3 = $17.70
      // Total: $600 + $17.70 = $617.70 -> 61770 cents
      expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'USD',
          customerId: 'cus_test_123',
          paymentMethodId: 'pm_test_123',
        }),
      );

      expect(timelogService.markTimelogsAsPaid).toHaveBeenCalledWith(
        ['timelog-1', 'timelog-2'],
        'pi_test_success_123',
      );
    });

    it('should create pending payment on payment failure', async () => {
      const mockTimelogs = [
        {
          _id: 'timelog-1',
          contractId: { toString: () => 'contract-1' },
          startTime: '09:00',
          endTime: '17:00',
        },
      ];

      const mockContract = {
        _id: { toString: () => 'contract-1' },
        hourlyProposedPrice: 100,
        selectedCurrency: 'USD',
        stripeCustomerId: 'cus_test_123',
        paymentMethodId: 'pm_test_declined',
        contractTitle: 'Design Work',
        hubId: { toString: () => 'hub-1' },
        jobId: { toString: () => 'job-1' },
        jobProposalId: { toString: () => 'proposal-1' },
        createdBy: { toString: () => 'client-1' },
        asssignedExpertId: { toString: () => 'expert-1' },
      };

      vi.mocked(timelogService.getApprovedUnpaidTimelogs).mockResolvedValue(mockTimelogs as any);
      vi.mocked(contractService.getContractForPayment).mockResolvedValue(mockContract as any);
      vi.mocked(stripeService.createPaymentIntent).mockRejectedValue(new Error('Card declined'));
      vi.mocked(pendingPaymentService.create).mockResolvedValue({} as any);

      const result = await weeklyPayoutProcessorHandler(mockContext);

      expect(result).toEqual({
        recordsProcessed: 1,
        recordsSucceeded: 0,
        recordsFailed: 1,
      });

      expect(pendingPaymentService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contractId: 'contract-1',
          lastError: 'Card declined',
        }),
      );

      expect(mockLog.error).toHaveBeenCalledWith(
        expect.objectContaining({
          contractId: 'contract-1',
          error: 'Card declined',
        }),
        'Payment failed, creating pending payment record',
      );
    });

    it('should skip contracts that are not found', async () => {
      const mockTimelogs = [
        {
          _id: 'timelog-1',
          contractId: { toString: () => 'contract-nonexistent' },
          startTime: '09:00',
          endTime: '17:00',
        },
      ];

      vi.mocked(timelogService.getApprovedUnpaidTimelogs).mockResolvedValue(mockTimelogs as any);
      vi.mocked(contractService.getContractForPayment).mockResolvedValue(null);

      const result = await weeklyPayoutProcessorHandler(mockContext);

      expect(result).toEqual({
        recordsProcessed: 1,
        recordsSucceeded: 0,
        recordsFailed: 1,
      });

      expect(mockLog.warn).toHaveBeenCalledWith(
        { contractId: 'contract-nonexistent' },
        'Contract not found',
      );
    });

    it('should group timelogs by contract correctly', async () => {
      const mockTimelogs = [
        {
          _id: 'timelog-1',
          contractId: { toString: () => 'contract-1' },
          startTime: '09:00',
          endTime: '12:00', // 3 hours
        },
        {
          _id: 'timelog-2',
          contractId: { toString: () => 'contract-2' },
          startTime: '10:00',
          endTime: '14:00', // 4 hours
        },
        {
          _id: 'timelog-3',
          contractId: { toString: () => 'contract-1' },
          startTime: '13:00',
          endTime: '17:00', // 4 hours (total 7 for contract-1)
        },
      ];

      const mockContract1 = {
        _id: { toString: () => 'contract-1' },
        hourlyProposedPrice: 50,
        selectedCurrency: 'USD',
        stripeCustomerId: 'cus_1',
        paymentMethodId: 'pm_1',
        contractTitle: 'Contract 1',
        hubId: { toString: () => 'hub-1' },
        jobId: { toString: () => 'job-1' },
        jobProposalId: { toString: () => 'proposal-1' },
        createdBy: { toString: () => 'client-1' },
        asssignedExpertId: { toString: () => 'expert-1' },
      };

      const mockContract2 = {
        _id: { toString: () => 'contract-2' },
        hourlyProposedPrice: 75,
        selectedCurrency: 'USD',
        stripeCustomerId: 'cus_2',
        paymentMethodId: 'pm_2',
        contractTitle: 'Contract 2',
        hubId: { toString: () => 'hub-2' },
        jobId: { toString: () => 'job-2' },
        jobProposalId: { toString: () => 'proposal-2' },
        createdBy: { toString: () => 'client-2' },
        asssignedExpertId: { toString: () => 'expert-2' },
      };

      vi.mocked(timelogService.getApprovedUnpaidTimelogs).mockResolvedValue(mockTimelogs as any);
      vi.mocked(contractService.getContractForPayment)
        .mockResolvedValueOnce(mockContract1 as any)
        .mockResolvedValueOnce(mockContract2 as any);
      vi.mocked(stripeService.createPaymentIntent).mockResolvedValue({
        id: 'pi_success',
      } as any);
      vi.mocked(timelogService.markTimelogsAsPaid).mockResolvedValue(undefined);
      vi.mocked(ContractPayment.create).mockResolvedValue({} as any);

      const result = await weeklyPayoutProcessorHandler(mockContext);

      expect(result).toEqual({
        recordsProcessed: 2, // 2 contracts
        recordsSucceeded: 2,
        recordsFailed: 0,
      });

      // Contract 1: timelogs 1 and 3
      // Contract 2: timelog 2
      expect(stripeService.createPaymentIntent).toHaveBeenCalledTimes(2);
    });

    it('should handle overnight work correctly', async () => {
      const mockTimelogs = [
        {
          _id: 'timelog-1',
          contractId: { toString: () => 'contract-1' },
          startTime: '22:00',
          endTime: '02:00', // 4 hours overnight
        },
      ];

      const mockContract = {
        _id: { toString: () => 'contract-1' },
        hourlyProposedPrice: 100,
        selectedCurrency: 'USD',
        stripeCustomerId: 'cus_test',
        paymentMethodId: 'pm_test',
        contractTitle: 'Night Work',
        hubId: { toString: () => 'hub-1' },
        jobId: { toString: () => 'job-1' },
        jobProposalId: { toString: () => 'proposal-1' },
        createdBy: { toString: () => 'client-1' },
        asssignedExpertId: { toString: () => 'expert-1' },
      };

      vi.mocked(timelogService.getApprovedUnpaidTimelogs).mockResolvedValue(mockTimelogs as any);
      vi.mocked(contractService.getContractForPayment).mockResolvedValue(mockContract as any);
      vi.mocked(stripeService.createPaymentIntent).mockResolvedValue({
        id: 'pi_overnight',
      } as any);
      vi.mocked(timelogService.markTimelogsAsPaid).mockResolvedValue(undefined);
      vi.mocked(ContractPayment.create).mockResolvedValue({} as any);

      const result = await weeklyPayoutProcessorHandler(mockContext);

      expect(result.recordsSucceeded).toBe(1);

      // 4 hours * $100 = $400
      // Stripe fee: 2.9% * 400 + 0.30 = 11.6 + 0.3 = $11.90
      // Total: ~$411.90 -> ~41190 cents
      expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: expect.any(Number),
        }),
      );
    });

    it('should skip timelogs with zero or negative duration', async () => {
      const mockTimelogs = [
        {
          _id: 'timelog-1',
          contractId: { toString: () => 'contract-1' },
          startTime: '09:00',
          endTime: '09:00', // 0 minutes
        },
        {
          _id: 'timelog-2',
          contractId: { toString: () => 'contract-1' },
          startTime: '10:00',
          endTime: '12:00', // 2 hours valid
        },
      ];

      const mockContract = {
        _id: { toString: () => 'contract-1' },
        hourlyProposedPrice: 50,
        selectedCurrency: 'USD',
        stripeCustomerId: 'cus_test',
        paymentMethodId: 'pm_test',
        contractTitle: 'Test',
        hubId: { toString: () => 'hub-1' },
        jobId: { toString: () => 'job-1' },
        jobProposalId: { toString: () => 'proposal-1' },
        createdBy: { toString: () => 'client-1' },
        asssignedExpertId: { toString: () => 'expert-1' },
      };

      vi.mocked(timelogService.getApprovedUnpaidTimelogs).mockResolvedValue(mockTimelogs as any);
      vi.mocked(contractService.getContractForPayment).mockResolvedValue(mockContract as any);
      vi.mocked(stripeService.createPaymentIntent).mockResolvedValue({
        id: 'pi_test',
      } as any);
      vi.mocked(timelogService.markTimelogsAsPaid).mockResolvedValue(undefined);
      vi.mocked(ContractPayment.create).mockResolvedValue({} as any);

      await weeklyPayoutProcessorHandler(mockContext);

      // Only timelog-2 should be included (2 hours)
      expect(timelogService.markTimelogsAsPaid).toHaveBeenCalledWith(['timelog-2'], 'pi_test');
    });
  });
});
