import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Mongoose model BEFORE imports
vi.mock('@core/models/PendingPayment');

import { PendingPayment, PendingPaymentStatus } from '@core/models/PendingPayment';
import { pendingPaymentService } from '@services/payments';
import mongoose from 'mongoose';

describe('PendingPaymentService', () => {
  const mockPaymentId = new mongoose.Types.ObjectId();
  const mockContractId = '507f1f77bcf86cd799439011';

  const validPaymentData = {
    contractId: mockContractId,
    jobId: '507f1f77bcf86cd799439012',
    proposalId: '507f1f77bcf86cd799439013',
    clientHubId: '507f1f77bcf86cd799439014',
    expertHubId: '507f1f77bcf86cd799439017',
    expertId: '507f1f77bcf86cd799439015',
    clientId: '507f1f77bcf86cd799439016',
    idempotencyKey: 'timelog-507f1f77bcf86cd799439011-2025-W1',
    paymentMethodId: 'pm_test_123',
    stripeCustomerId: 'cus_test_123',
    amount: 50000,
    stripeFee: 1500,
    grossAmount: 51500,
    currency: 'USD',
    weekNumber: 1,
    year: 2025,
    weekStartDate: new Date('2025-01-01T00:00:00.000Z'),
    weekEndDate: new Date('2025-01-07T23:59:59.000Z'),
    totalHours: 10,
    hourlyRate: 50,
    contractTitle: 'Test Contract',
    description: 'Weekly payout',
    timelogEntryIds: ['log1', 'log2', 'log3'],
    lastError: 'Card declined',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create pending payment successfully', async () => {
      const mockCreated = {
        _id: mockPaymentId,
        ...validPaymentData,
        status: PendingPaymentStatus.PENDING,
        retryCount: 0,
        maxRetries: 5,
        nextRetryAt: expect.any(Date),
        toObject: () => ({
          _id: mockPaymentId,
          ...validPaymentData,
          status: PendingPaymentStatus.PENDING,
          retryCount: 0,
          maxRetries: 5,
        }),
      };

      vi.mocked(PendingPayment.create).mockResolvedValue(mockCreated as any);

      const result = await pendingPaymentService.create(validPaymentData);

      expect(PendingPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validPaymentData,
          status: PendingPaymentStatus.PENDING,
          retryCount: 0,
          maxRetries: 5,
          nextRetryAt: expect.any(Date),
        }),
      );
      expect(result.status).toBe(PendingPaymentStatus.PENDING);
      expect(result.retryCount).toBe(0);
    });

    it('should set nextRetryAt to 6 hours for first retry', async () => {
      const mockCreated = {
        _id: mockPaymentId,
        ...validPaymentData,
        status: PendingPaymentStatus.PENDING,
        retryCount: 0,
        maxRetries: 5,
        toObject: () => ({
          _id: mockPaymentId,
          ...validPaymentData,
          status: PendingPaymentStatus.PENDING,
          retryCount: 0,
          maxRetries: 5,
        }),
      };

      vi.mocked(PendingPayment.create).mockResolvedValue(mockCreated as any);

      await pendingPaymentService.create(validPaymentData);

      const createCall = vi.mocked(PendingPayment.create).mock.calls[0]?.[0] as any;
      const nextRetryAt = new Date(createCall.nextRetryAt);
      const now = new Date();
      const hoursUntilRetry = (nextRetryAt.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Should be approximately 6 hours (with some tolerance for test execution time)
      expect(hoursUntilRetry).toBeGreaterThan(5.9);
      expect(hoursUntilRetry).toBeLessThan(6.1);
    });
  });

  describe('getPendingForRetry', () => {
    it('should return pending payments due for retry', async () => {
      const mockPayments = [
        {
          _id: mockPaymentId,
          ...validPaymentData,
          status: PendingPaymentStatus.PENDING,
          retryCount: 1,
          nextRetryAt: new Date(Date.now() - 1000),
        },
      ];

      const mockQuery = {
        lean: vi.fn().mockResolvedValue(mockPayments),
      };
      vi.mocked(PendingPayment.find).mockReturnValue(mockQuery as any);

      const result = await pendingPaymentService.getPendingForRetry();

      expect(PendingPayment.find).toHaveBeenCalledWith({
        status: PendingPaymentStatus.PENDING,
        nextRetryAt: { $lte: expect.any(Date) },
        retryCount: { $lt: 5 },
      });
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no pending payments', async () => {
      const mockQuery = {
        lean: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(PendingPayment.find).mockReturnValue(mockQuery as any);

      const result = await pendingPaymentService.getPendingForRetry();

      expect(result).toHaveLength(0);
    });
  });

  describe('markAsProcessing', () => {
    it('should update payment status to processing', async () => {
      vi.mocked(PendingPayment.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      await pendingPaymentService.markAsProcessing(mockPaymentId.toString());

      expect(PendingPayment.updateOne).toHaveBeenCalledWith(
        { _id: mockPaymentId.toString() },
        { $set: { status: PendingPaymentStatus.PROCESSING } },
      );
    });
  });

  describe('markAsCompleted', () => {
    it('should update payment status to completed with payment intent ID', async () => {
      vi.mocked(PendingPayment.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      const paymentIntentId = 'pi_test_success_123';
      await pendingPaymentService.markAsCompleted(mockPaymentId.toString(), paymentIntentId);

      expect(PendingPayment.updateOne).toHaveBeenCalledWith(
        { _id: mockPaymentId.toString() },
        {
          $set: {
            status: PendingPaymentStatus.COMPLETED,
            processedAt: expect.any(Date),
            paymentIntentId,
          },
        },
      );
    });
  });

  describe('markAsFailedWithRetry', () => {
    it('should increment retry count and schedule next retry', async () => {
      vi.mocked(PendingPayment.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      const result = await pendingPaymentService.markAsFailedWithRetry(
        mockPaymentId.toString(),
        'Card declined',
        1, // current retry count
        5, // max retries
      );

      expect(result.isPermanentlyFailed).toBe(false);
      expect(PendingPayment.updateOne).toHaveBeenCalledWith(
        { _id: mockPaymentId.toString() },
        {
          $set: expect.objectContaining({
            status: PendingPaymentStatus.PENDING,
            retryCount: 2,
            lastError: 'Card declined',
            lastAttempt: expect.any(Date),
            nextRetryAt: expect.any(Date),
          }),
        },
      );
    });

    it('should mark as permanently failed when max retries reached', async () => {
      vi.mocked(PendingPayment.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      const result = await pendingPaymentService.markAsFailedWithRetry(
        mockPaymentId.toString(),
        'Card expired',
        4, // current retry count (will become 5)
        5, // max retries
      );

      expect(result.isPermanentlyFailed).toBe(true);
      expect(PendingPayment.updateOne).toHaveBeenCalledWith(
        { _id: mockPaymentId.toString() },
        {
          $set: expect.objectContaining({
            status: PendingPaymentStatus.FAILED,
            retryCount: 5,
            lastError: 'Card expired',
            failedAt: expect.any(Date),
          }),
        },
      );
    });

    it('should use exponential backoff for retry intervals', async () => {
      vi.mocked(PendingPayment.updateOne).mockResolvedValue({ modifiedCount: 1 } as any);

      // Test different retry counts to verify exponential backoff
      // Retry intervals: [6, 12, 24, 48, 72] hours

      await pendingPaymentService.markAsFailedWithRetry(mockPaymentId.toString(), 'Error', 0, 5);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const calls1 = vi.mocked(PendingPayment.updateOne).mock.calls as any[];
      expect(calls1.length).toBeGreaterThan(0);
      const call1 = calls1[0][1];
      const nextRetry1 = new Date(call1.$set.nextRetryAt);
      const hours1 = (nextRetry1.getTime() - Date.now()) / (1000 * 60 * 60);
      expect(hours1).toBeGreaterThan(11); // ~12 hours for retry count 1

      vi.clearAllMocks();

      await pendingPaymentService.markAsFailedWithRetry(mockPaymentId.toString(), 'Error', 2, 5);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const calls2 = vi.mocked(PendingPayment.updateOne).mock.calls as any[];
      expect(calls2.length).toBeGreaterThan(0);
      const call2 = calls2[0][1];
      const nextRetry2 = new Date(call2.$set.nextRetryAt);
      const hours2 = (nextRetry2.getTime() - Date.now()) / (1000 * 60 * 60);
      expect(hours2).toBeGreaterThan(47); // ~48 hours for retry count 3
    });
  });

  describe('getById', () => {
    it('should return pending payment by ID', async () => {
      const mockPayment = {
        _id: mockPaymentId,
        ...validPaymentData,
        status: PendingPaymentStatus.PENDING,
      };

      const mockQuery = {
        lean: vi.fn().mockResolvedValue(mockPayment),
      };
      vi.mocked(PendingPayment.findById).mockReturnValue(mockQuery as any);

      const result = await pendingPaymentService.getById(mockPaymentId.toString());

      expect(PendingPayment.findById).toHaveBeenCalledWith(mockPaymentId.toString());
      expect(result?.contractId).toBe(mockContractId);
    });

    it('should return null if payment not found', async () => {
      const mockQuery = {
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(PendingPayment.findById).mockReturnValue(mockQuery as any);

      const result = await pendingPaymentService.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getByContractId', () => {
    it('should return all pending payments for a contract', async () => {
      const mockPayments = [
        { _id: 'payment1', contractId: mockContractId, status: PendingPaymentStatus.PENDING },
        { _id: 'payment2', contractId: mockContractId, status: PendingPaymentStatus.COMPLETED },
      ];

      const mockQuery = {
        lean: vi.fn().mockResolvedValue(mockPayments),
      };
      vi.mocked(PendingPayment.find).mockReturnValue(mockQuery as any);

      const result = await pendingPaymentService.getByContractId(mockContractId);

      expect(PendingPayment.find).toHaveBeenCalledWith({ contractId: mockContractId });
      expect(result).toHaveLength(2);
    });
  });
});
