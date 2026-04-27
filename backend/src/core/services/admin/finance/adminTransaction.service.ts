import { Transaction } from '@core/models/Transaction';
import type { ListTransactionsQuery } from '@core/schemas/admin/finance';
import type { PipelineStage } from 'mongoose';

export interface TransactionStats {
  total: number;
  totalVolume: number;
  totalPlatformFees: number;
  byStatus: {
    pending: number;
    processing: number;
    succeeded: number;
    failed: number;
    refunded: number;
    cancelled: number;
  };
  byType: Record<string, number>;
  byDirection: {
    inbound: number;
    outbound: number;
    internal: number;
  };
  currency: string;
}

export class AdminTransactionService {
  /**
   * List transactions with filtering and pagination
   */
  async listTransactions(query: ListTransactionsQuery) {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      direction,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build match filter
    const matchFilter: Record<string, unknown> = {};
    if (type) matchFilter.type = type;
    if (status) matchFilter.status = status;
    if (direction) matchFilter.direction = direction;

    // Date range filter
    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) (matchFilter.createdAt as Record<string, unknown>).$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (matchFilter.createdAt as Record<string, unknown>).$lte = end;
      }
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
            // Lookup from user (payer)
            {
              $lookup: {
                from: 'users',
                localField: 'fromUserId',
                foreignField: '_id',
                pipeline: [{ $project: { name: 1, email: 1, profilePhoto: 1 } }],
                as: 'fromUserData',
              },
            },
            // Lookup to user (receiver)
            {
              $lookup: {
                from: 'users',
                localField: 'toUserId',
                foreignField: '_id',
                pipeline: [{ $project: { name: 1, email: 1, profilePhoto: 1 } }],
                as: 'toUserData',
              },
            },
            // Lookup hub
            {
              $lookup: {
                from: 'hubs',
                localField: 'hubId',
                foreignField: '_id',
                pipeline: [{ $project: { name: 1, logo: 1 } }],
                as: 'hubData',
              },
            },
            // Project final shape
            {
              $project: {
                _id: 1,
                type: 1,
                direction: 1,
                sourceModel: 1,
                sourceId: 1,
                referenceId: 1,
                amount: 1,
                currency: 1,
                platformFee: 1,
                platformFeeRate: 1,
                stripeFee: 1,
                transferAmount: 1,
                status: 1,
                stripeStatus: 1,
                serviceType: 1,
                description: 1,
                errorCode: 1,
                errorMessage: 1,
                transferredAt: 1,
                refundedAmount: 1,
                refundedAt: 1,
                createdAt: 1,
                updatedAt: 1,
                fromUser: { $arrayElemAt: ['$fromUserData', 0] },
                toUser: { $arrayElemAt: ['$toUserData', 0] },
                hub: { $arrayElemAt: ['$hubData', 0] },
              },
            },
          ],
        },
      },
    ];

    // Handle search with additional lookups
    if (search) {
      const searchPipeline: PipelineStage[] = [
        { $match: matchFilter },
        // Lookup users for search
        {
          $lookup: {
            from: 'users',
            localField: 'fromUserId',
            foreignField: '_id',
            pipeline: [{ $project: { name: 1, email: 1 } }],
            as: 'fromUserData',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'toUserId',
            foreignField: '_id',
            pipeline: [{ $project: { name: 1, email: 1 } }],
            as: 'toUserData',
          },
        },
        {
          $addFields: {
            fromUser: { $arrayElemAt: ['$fromUserData', 0] },
            toUser: { $arrayElemAt: ['$toUserData', 0] },
          },
        },
        {
          $match: {
            $or: [
              { referenceId: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } },
              { 'fromUser.name': { $regex: search, $options: 'i' } },
              { 'fromUser.email': { $regex: search, $options: 'i' } },
              { 'toUser.name': { $regex: search, $options: 'i' } },
              { 'toUser.email': { $regex: search, $options: 'i' } },
            ],
          },
        },
        {
          $facet: {
            totalCount: [{ $count: 'count' }],
            data: [
              { $sort: sort },
              { $skip: skip },
              { $limit: limit },
              {
                $lookup: {
                  from: 'hubs',
                  localField: 'hubId',
                  foreignField: '_id',
                  pipeline: [{ $project: { name: 1, logo: 1 } }],
                  as: 'hubData',
                },
              },
              {
                $project: {
                  _id: 1,
                  type: 1,
                  direction: 1,
                  sourceModel: 1,
                  sourceId: 1,
                  referenceId: 1,
                  amount: 1,
                  currency: 1,
                  platformFee: 1,
                  platformFeeRate: 1,
                  stripeFee: 1,
                  transferAmount: 1,
                  status: 1,
                  stripeStatus: 1,
                  serviceType: 1,
                  description: 1,
                  errorCode: 1,
                  errorMessage: 1,
                  transferredAt: 1,
                  refundedAmount: 1,
                  refundedAt: 1,
                  createdAt: 1,
                  updatedAt: 1,
                  fromUser: 1,
                  toUser: 1,
                  hub: { $arrayElemAt: ['$hubData', 0] },
                },
              },
            ],
          },
        },
      ];

      const [result] = await Transaction.aggregate(searchPipeline);
      const total = result.totalCount[0]?.count || 0;
      const transactions = result.data || [];

      return {
        items: transactions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // Execute aggregation
    const [result] = await Transaction.aggregate(pipeline);

    const total = result.totalCount[0]?.count || 0;
    const transactions = result.data || [];

    return {
      items: transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(): Promise<TransactionStats> {
    const stats = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalVolume: { $sum: '$amount' },
          totalPlatformFees: { $sum: '$platformFee' },
          // By status
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          processing: { $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] } },
          succeeded: { $sum: { $cond: [{ $eq: ['$status', 'succeeded'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          refunded: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          // By direction
          inbound: { $sum: { $cond: [{ $eq: ['$direction', 'inbound'] }, 1, 0] } },
          outbound: { $sum: { $cond: [{ $eq: ['$direction', 'outbound'] }, 1, 0] } },
          internal: { $sum: { $cond: [{ $eq: ['$direction', 'internal'] }, 1, 0] } },
        },
      },
    ]);

    // Get counts by type
    const typeCounts = await Transaction.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const byType: Record<string, number> = {};
    for (const item of typeCounts) {
      byType[item._id] = item.count;
    }

    if (stats.length === 0) {
      return {
        total: 0,
        totalVolume: 0,
        totalPlatformFees: 0,
        byStatus: {
          pending: 0,
          processing: 0,
          succeeded: 0,
          failed: 0,
          refunded: 0,
          cancelled: 0,
        },
        byType: {},
        byDirection: {
          inbound: 0,
          outbound: 0,
          internal: 0,
        },
        currency: 'MYR',
      };
    }

    const s = stats[0];
    return {
      total: s.total,
      totalVolume: s.totalVolume,
      totalPlatformFees: s.totalPlatformFees,
      byStatus: {
        pending: s.pending,
        processing: s.processing,
        succeeded: s.succeeded,
        failed: s.failed,
        refunded: s.refunded,
        cancelled: s.cancelled,
      },
      byType,
      byDirection: {
        inbound: s.inbound,
        outbound: s.outbound,
        internal: s.internal,
      },
      currency: 'MYR',
    };
  }

  /**
   * Get transaction by ID with comprehensive related data
   */
  async getTransactionById(id: string) {
    const transaction = await Transaction.findById(id)
      .populate('fromUserId', 'name email profilePhoto phone')
      .populate('toUserId', 'name email profilePhoto phone')
      .populate('hubId', 'name logo')
      .populate('processedBy', 'name email')
      .populate('refundedBy', 'name email')
      .lean();

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Fetch related data based on sourceModel and type
    const relatedData = await this.fetchRelatedData(transaction);

    return {
      ...transaction,
      // Rename populated fields for consistency
      fromUser: transaction.fromUserId,
      toUser: transaction.toUserId,
      hub: transaction.hubId,
      processedByUser: transaction.processedBy,
      refundedByUser: transaction.refundedBy,
      // Related data
      ...relatedData,
    };
  }

  /**
   * Fetch related data based on transaction source
   */
  private async fetchRelatedData(transaction: {
    sourceModel: string;
    sourceId: unknown;
    type: string;
    serviceType?: string;
    serviceId?: unknown;
  }) {
    const relatedData: Record<string, unknown> = {};

    try {
      // Fetch source document based on sourceModel
      if (transaction.sourceModel === 'Booking' && transaction.sourceId) {
        const Booking = (await import('@core/models/Booking')).Booking;
        const booking = await Booking.findById(transaction.sourceId)
          .populate('serviceId', 'title name description')
          .populate('bookedBy', 'name email')
          .lean();

        if (booking) {
          relatedData.booking = {
            _id: booking._id,
            bookingType: booking.bookingType,
            status: booking.status,
            bookingStartDate: booking.bookingStartDate,
            bookingEndDate: booking.bookingEndDate,
            totalCost: booking.totalCost,
            service: booking.serviceId,
            bookedBy: booking.bookedBy,
          };
        }
      }

      // Fetch milestone data for milestone transactions
      if (
        (transaction.type === 'milestone_fund' || transaction.type === 'milestone_release') &&
        transaction.serviceId
      ) {
        const Milestone = (await import('@core/models/Milestone')).Milestone;
        const milestone = await Milestone.findById(transaction.serviceId)
          .populate('jobId', 'title')
          .populate('contractId', 'contractTitle')
          .lean();

        if (milestone) {
          relatedData.milestone = {
            _id: milestone._id,
            taskName: milestone.taskName,
            taskDescription: milestone.taskDescription,
            amount: milestone.amount,
            currency: milestone.currency,
            status: milestone.status,
            dueDate: milestone.dueDate,
            workSubmittedDate: milestone.workSubmittedDate,
            job: milestone.jobId,
            contract: milestone.contractId,
          };
        }
      }

      // Fetch timelog data for weekly/hourly transactions
      if (transaction.type === 'timelog_payment' && transaction.serviceId) {
        const TimelogEntry = (await import('@core/models/TimelogEntry')).TimelogEntry;
        const timelog = await TimelogEntry.findById(transaction.serviceId)
          .populate('jobId', 'title')
          .populate('contractId', 'contractTitle')
          .lean();

        if (timelog) {
          relatedData.timelog = {
            _id: timelog._id,
            workDate: timelog.workDate,
            weekNumber: timelog.weekNumber,
            year: timelog.year,
            startTime: timelog.startTime,
            endTime: timelog.endTime,
            hoursWorked: timelog.hoursWorked,
            hourlyRate: timelog.hourlyRate,
            billableAmount: timelog.billableAmount,
            description: timelog.description,
            tasks: timelog.tasks,
            status: timelog.status,
            job: timelog.jobId,
            contract: timelog.contractId,
          };
        }
      }

      // Fetch ContractPayment data
      if (transaction.sourceModel === 'ContractPayment' && transaction.sourceId) {
        const ContractPayment = (await import('@core/models/ContractPayment')).ContractPayment;
        const payment = await ContractPayment.findById(transaction.sourceId)
          .populate('contractId', 'contractTitle')
          .populate('jobId', 'title')
          .populate('milestoneId', 'taskName')
          .lean();

        if (payment) {
          relatedData.contractPayment = {
            _id: payment._id,
            paymentType: payment.paymentType,
            status: payment.status,
            weekStartDate: payment.weekStartDate,
            weekEndDate: payment.weekEndDate,
            amount: payment.amount,
            currency: payment.currency,
            contract: payment.contractId,
            job: payment.jobId,
            milestone: payment.milestoneId,
          };
        }
      }
    } catch (error) {
      // Log error but don't fail the request
      console.error('Error fetching related data:', error);
    }

    return relatedData;
  }
}

export const adminTransactionService = new AdminTransactionService();
