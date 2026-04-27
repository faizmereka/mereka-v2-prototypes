import { PendingPayment, PendingPaymentStatus } from '@core/models/PendingPayment';
import type { PipelineStage } from 'mongoose';

export interface AdminListPendingPaymentsQuery {
  page?: number;
  limit?: number;
  status?: PendingPaymentStatus;
  search?: string;
  contractId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PendingPaymentStats {
  total: number;
  byStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  totalAmount: number;
  pendingAmount: number;
  overdue: number;
  retriesRemaining: number;
  totalRetries: number;
  currency: string;
}

export class AdminPendingPaymentService {
  /**
   * List pending payments with filtering and pagination
   */
  async listPendingPayments(query: AdminListPendingPaymentsQuery) {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      contractId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build match filter
    const matchFilter: Record<string, unknown> = {};
    if (status) matchFilter.status = status;
    if (contractId) matchFilter.contractId = contractId;

    // Add search filter
    if (search) {
      matchFilter.$or = [
        { contractTitle: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Build aggregation pipeline
    const pipeline: PipelineStage[] = [
      { $match: matchFilter },
      {
        $facet: {
          totalCount: [{ $count: 'count' }],
          data: [
            { $sort: sort },
            { $skip: skip },
            { $limit: limit },
            // Lookup expert details
            {
              $lookup: {
                from: 'users',
                let: { expertId: { $toObjectId: '$expertId' } },
                pipeline: [
                  { $match: { $expr: { $eq: ['$_id', '$$expertId'] } } },
                  { $project: { name: 1, email: 1, profilePhoto: 1 } },
                ],
                as: 'expertData',
              },
            },
            // Lookup learner (client) details
            {
              $lookup: {
                from: 'users',
                let: { learnerId: { $toObjectId: '$learnerId' } },
                pipeline: [
                  { $match: { $expr: { $eq: ['$_id', '$$learnerId'] } } },
                  { $project: { name: 1, email: 1, profilePhoto: 1 } },
                ],
                as: 'learnerData',
              },
            },
            // Lookup hub details
            {
              $lookup: {
                from: 'hubs',
                let: { hubId: { $toObjectId: '$hubId' } },
                pipeline: [
                  { $match: { $expr: { $eq: ['$_id', '$$hubId'] } } },
                  { $project: { name: 1, logo: 1 } },
                ],
                as: 'hubData',
              },
            },
            // Lookup contract details
            {
              $lookup: {
                from: 'contracts',
                let: { contractId: { $toObjectId: '$contractId' } },
                pipeline: [
                  { $match: { $expr: { $eq: ['$_id', '$$contractId'] } } },
                  { $project: { contractTitle: 1, priceType: 1, status: 1 } },
                ],
                as: 'contractData',
              },
            },
            // Project final shape
            {
              $project: {
                _id: 1,
                firebaseId: 1,
                contractId: 1,
                jobId: 1,
                proposalId: 1,
                hubId: 1,
                expertId: 1,
                learnerId: 1,
                amount: 1,
                currency: 1,
                totalHours: 1,
                startDateTime: 1,
                endDateTime: 1,
                contractTitle: 1,
                description: 1,
                status: 1,
                retryCount: 1,
                maxRetries: 1,
                nextRetryAt: 1,
                lastError: 1,
                lastAttempt: 1,
                failedAt: 1,
                processedAt: 1,
                paymentIntentId: 1,
                createdAt: 1,
                updatedAt: 1,
                // Lookups
                expert: { $arrayElemAt: ['$expertData', 0] },
                learner: { $arrayElemAt: ['$learnerData', 0] },
                hub: { $arrayElemAt: ['$hubData', 0] },
                contract: { $arrayElemAt: ['$contractData', 0] },
              },
            },
          ],
        },
      },
    ];

    // Execute aggregation
    const [result] = await PendingPayment.aggregate(pipeline);

    const total = result.totalCount[0]?.count || 0;
    const payments = result.data || [];

    return {
      items: payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get pending payment stats
   */
  async getPendingPaymentStats(): Promise<PendingPaymentStats> {
    const now = new Date();
    const stats = await PendingPayment.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          processing: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          totalAmount: { $sum: '$amount' },
          pendingAmount: {
            $sum: {
              $cond: [{ $in: ['$status', ['pending', 'processing']] }, '$amount', 0],
            },
          },
          // Count overdue (nextRetryAt is in the past for pending payments)
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['pending', 'processing']] },
                    { $lt: ['$nextRetryAt', now] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          // Total retries made
          totalRetries: { $sum: '$retryCount' },
          // Retries remaining (maxRetries - retryCount for pending/processing)
          retriesRemaining: {
            $sum: {
              $cond: [
                { $in: ['$status', ['pending', 'processing']] },
                { $subtract: ['$maxRetries', '$retryCount'] },
                0,
              ],
            },
          },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        total: 0,
        byStatus: {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
        },
        totalAmount: 0,
        pendingAmount: 0,
        overdue: 0,
        retriesRemaining: 0,
        totalRetries: 0,
        currency: 'MYR',
      };
    }

    const s = stats[0];
    return {
      total: s.total,
      byStatus: {
        pending: s.pending,
        processing: s.processing,
        completed: s.completed,
        failed: s.failed,
      },
      totalAmount: s.totalAmount,
      pendingAmount: s.pendingAmount,
      overdue: s.overdue,
      retriesRemaining: s.retriesRemaining,
      totalRetries: s.totalRetries,
      currency: 'MYR',
    };
  }

  /**
   * Get pending payment by ID
   */
  async getPendingPaymentById(id: string) {
    const payment = await PendingPayment.findById(id).lean();

    if (!payment) {
      throw new Error('Pending payment not found');
    }

    return payment;
  }

  /**
   * Retry a pending payment manually
   */
  async retryPendingPayment(id: string) {
    const payment = await PendingPayment.findById(id);

    if (!payment) {
      throw new Error('Pending payment not found');
    }

    if (
      payment.status !== PendingPaymentStatus.PENDING &&
      payment.status !== PendingPaymentStatus.FAILED
    ) {
      throw new Error('Payment cannot be retried in current status');
    }

    // Reset for retry
    payment.status = PendingPaymentStatus.PENDING;
    payment.nextRetryAt = new Date();
    await payment.save();

    return payment;
  }

  /**
   * Mark a pending payment as failed (max retries exceeded)
   */
  async markAsFailed(id: string, reason: string) {
    const payment = await PendingPayment.findById(id);

    if (!payment) {
      throw new Error('Pending payment not found');
    }

    payment.status = PendingPaymentStatus.FAILED;
    payment.failedAt = new Date();
    payment.lastError = reason;
    await payment.save();

    return payment;
  }
}

export const adminPendingPaymentService = new AdminPendingPaymentService();
