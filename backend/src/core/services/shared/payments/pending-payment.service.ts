import { PendingPayment, PendingPaymentStatus } from '@core/models/PendingPayment';
import type { Types } from 'mongoose';

/**
 * Retry intervals in hours (exponential backoff)
 */
const RETRY_INTERVALS_HOURS = [6, 12, 24, 48, 72];

/**
 * Data required to create a pending payment
 */
export interface CreatePendingPaymentInput {
  contractId: Types.ObjectId | string;
  jobId: Types.ObjectId | string;
  proposalId?: Types.ObjectId | string;
  clientHubId: Types.ObjectId | string;
  expertHubId: Types.ObjectId | string;
  expertId: Types.ObjectId | string;
  clientId: Types.ObjectId | string;
  idempotencyKey: string;
  paymentMethodId: string;
  stripeCustomerId: string;
  amount: number;
  stripeFee?: number;
  grossAmount?: number;
  currency: string;
  weekNumber?: number;
  year?: number;
  weekStartDate?: Date;
  weekEndDate?: Date;
  totalHours: number;
  hourlyRate?: number;
  contractTitle: string;
  description?: string;
  timelogEntryIds: Types.ObjectId[] | string[];
  lastError: string;
}

/**
 * Pending payment record for processing
 */
export interface PendingPaymentRecord {
  _id: Types.ObjectId;
  contractId: Types.ObjectId;
  jobId: Types.ObjectId;
  proposalId?: Types.ObjectId;
  clientHubId: Types.ObjectId;
  expertHubId: Types.ObjectId;
  expertId: Types.ObjectId;
  clientId: Types.ObjectId;
  idempotencyKey: string;
  paymentMethodId: string;
  stripeCustomerId: string;
  amount: number;
  stripeFee: number;
  grossAmount: number;
  currency: string;
  weekNumber?: number;
  year?: number;
  weekStartDate?: Date;
  weekEndDate?: Date;
  totalHours: number;
  hourlyRate?: number;
  contractTitle: string;
  description?: string;
  timelogEntryIds: Types.ObjectId[];
  status: PendingPaymentStatus;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date;
  lastError?: string;
}

/**
 * PendingPayment Service
 * Handles failed payment retry queue operations
 */
export class PendingPaymentService {
  /**
   * Create a new pending payment record
   */
  async create(data: CreatePendingPaymentInput): Promise<PendingPaymentRecord> {
    const pendingPayment = await PendingPayment.create({
      ...data,
      status: PendingPaymentStatus.PENDING,
      retryCount: 0,
      maxRetries: 5,
      nextRetryAt: this.getNextRetryTime(0),
    });

    return pendingPayment.toObject() as PendingPaymentRecord;
  }

  /**
   * Get pending payments that are due for retry
   */
  async getPendingForRetry(): Promise<PendingPaymentRecord[]> {
    const now = new Date();

    const payments = await PendingPayment.find({
      status: PendingPaymentStatus.PENDING,
      nextRetryAt: { $lte: now },
      retryCount: { $lt: 5 },
    }).lean();

    return payments as unknown as PendingPaymentRecord[];
  }

  /**
   * Mark a pending payment as processing
   */
  async markAsProcessing(paymentId: string | Types.ObjectId): Promise<void> {
    await PendingPayment.updateOne(
      { _id: paymentId },
      { $set: { status: PendingPaymentStatus.PROCESSING } },
    );
  }

  /**
   * Mark a pending payment as completed
   */
  async markAsCompleted(
    paymentId: string | Types.ObjectId,
    paymentIntentId: string,
  ): Promise<void> {
    await PendingPayment.updateOne(
      { _id: paymentId },
      {
        $set: {
          status: PendingPaymentStatus.COMPLETED,
          processedAt: new Date(),
          paymentIntentId,
        },
      },
    );
  }

  /**
   * Mark a pending payment as failed with retry scheduling
   */
  async markAsFailedWithRetry(
    paymentId: string | Types.ObjectId,
    error: string,
    currentRetryCount: number,
    maxRetries: number,
  ): Promise<{ isPermanentlyFailed: boolean }> {
    const now = new Date();
    const newRetryCount = currentRetryCount + 1;
    const isPermanentlyFailed = newRetryCount >= maxRetries;

    const updateData: Record<string, unknown> = {
      status: isPermanentlyFailed ? PendingPaymentStatus.FAILED : PendingPaymentStatus.PENDING,
      retryCount: newRetryCount,
      lastError: error,
      lastAttempt: now,
    };

    if (isPermanentlyFailed) {
      updateData.failedAt = now;
    } else {
      updateData.nextRetryAt = this.getNextRetryTime(newRetryCount);
    }

    await PendingPayment.updateOne({ _id: paymentId }, { $set: updateData });

    return { isPermanentlyFailed };
  }

  /**
   * Get pending payment by ID
   */
  async getById(paymentId: string): Promise<PendingPaymentRecord | null> {
    const payment = await PendingPayment.findById(paymentId).lean();
    return payment as PendingPaymentRecord | null;
  }

  /**
   * Get pending payments by contract ID
   */
  async getByContractId(contractId: string): Promise<PendingPaymentRecord[]> {
    const payments = await PendingPayment.find({ contractId }).lean();
    return payments as unknown as PendingPaymentRecord[];
  }

  /**
   * Calculate next retry time based on retry count (exponential backoff)
   */
  private getNextRetryTime(retryCount: number): Date {
    const hoursUntilRetry = RETRY_INTERVALS_HOURS[retryCount] ?? 72;
    const now = new Date();
    return new Date(now.getTime() + hoursUntilRetry * 60 * 60 * 1000);
  }
}

export const pendingPaymentService = new PendingPaymentService();
