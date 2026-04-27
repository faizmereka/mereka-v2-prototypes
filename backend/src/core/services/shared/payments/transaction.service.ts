import {
  type ITransaction,
  SourceModel,
  Transaction,
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from '@core/models/Transaction';
import mongoose from 'mongoose';

/**
 * Transaction Service
 *
 * Handles financial transaction ledger operations:
 * - Transaction creation and tracking
 * - Revenue reporting and analytics
 * - Query operations for financial data
 */
export class TransactionService {
  /**
   * Create a transaction record
   */
  async create(data: {
    type: TransactionType;
    direction: TransactionDirection;
    sourceModel: SourceModel;
    sourceId: mongoose.Types.ObjectId;
    amount: number;
    currency: string;
    hubId: mongoose.Types.ObjectId;
    fromUserId?: mongoose.Types.ObjectId;
    toUserId?: mongoose.Types.ObjectId;
    platformFee?: number;
    platformFeeRate?: number;
    stripeFee?: number;
    transferAmount?: number;
    serviceType?: 'experience' | 'expertise' | 'space' | 'milestone' | 'timelog';
    serviceId?: mongoose.Types.ObjectId;
    stripePaymentIntentId?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }): Promise<ITransaction> {
    const transaction = new Transaction({
      ...data,
      status: TransactionStatus.PENDING,
    });

    return transaction.save();
  }

  /**
   * Create transaction from booking payment
   */
  async createFromBooking(
    booking: {
      _id: mongoose.Types.ObjectId;
      bookingType: string;
      serviceId: mongoose.Types.ObjectId;
      hubId: mongoose.Types.ObjectId;
      bookedBy?: mongoose.Types.ObjectId;
      totalCost: number;
      currency: string;
      platformFee: number;
      platformFeeRate: number;
      stripeFee: number;
      transferAmount: number;
      stripePaymentIntentId?: string;
    },
    expertId?: mongoose.Types.ObjectId,
  ): Promise<ITransaction> {
    return Transaction.create({
      type: TransactionType.BOOKING_PAYMENT,
      direction: TransactionDirection.INBOUND,
      sourceModel: SourceModel.BOOKING,
      sourceId: booking._id,
      amount: booking.totalCost,
      currency: booking.currency,
      platformFee: booking.platformFee,
      platformFeeRate: booking.platformFeeRate,
      stripeFee: booking.stripeFee,
      transferAmount: booking.transferAmount,
      fromUserId: booking.bookedBy,
      toUserId: expertId,
      hubId: booking.hubId,
      serviceType: booking.bookingType as 'experience' | 'expertise' | 'space',
      serviceId: booking.serviceId,
      stripePaymentIntentId: booking.stripePaymentIntentId,
      status: TransactionStatus.PENDING,
    });
  }

  /**
   * Create transaction from contract payment (milestone or timelog)
   */
  async createFromContractPayment(
    payment: {
      _id: mongoose.Types.ObjectId;
      paymentType: string;
      hubId: mongoose.Types.ObjectId;
      clientId: mongoose.Types.ObjectId;
      expertId: mongoose.Types.ObjectId;
      amount: number;
      currency: string;
      platformFee: number;
      platformFeeRate: number;
      stripeFee: number;
      transferAmount: number;
      milestoneId?: mongoose.Types.ObjectId;
      stripePaymentIntentId?: string;
    },
    transactionType: TransactionType,
  ): Promise<ITransaction> {
    return Transaction.create({
      type: transactionType,
      direction:
        transactionType === TransactionType.EXPERT_TRANSFER
          ? TransactionDirection.INTERNAL
          : TransactionDirection.INBOUND,
      sourceModel: SourceModel.CONTRACT_PAYMENT,
      sourceId: payment._id,
      amount: payment.amount,
      currency: payment.currency,
      platformFee: payment.platformFee,
      platformFeeRate: payment.platformFeeRate,
      stripeFee: payment.stripeFee,
      transferAmount: payment.transferAmount,
      fromUserId: payment.clientId,
      toUserId: payment.expertId,
      hubId: payment.hubId,
      serviceType: payment.paymentType === 'milestone' ? 'milestone' : 'timelog',
      serviceId: payment.milestoneId,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      status: TransactionStatus.PENDING,
    });
  }

  /**
   * Create expert transfer transaction
   */
  async createExpertTransfer(data: {
    sourceId: mongoose.Types.ObjectId;
    sourceModel: SourceModel;
    amount: number;
    currency: string;
    hubId: mongoose.Types.ObjectId;
    expertId: mongoose.Types.ObjectId;
    stripeTransferId: string;
    description?: string;
  }): Promise<ITransaction> {
    return Transaction.create({
      type: TransactionType.EXPERT_TRANSFER,
      direction: TransactionDirection.INTERNAL,
      sourceModel: data.sourceModel,
      sourceId: data.sourceId,
      amount: data.amount,
      currency: data.currency,
      transferAmount: data.amount,
      platformFee: 0,
      stripeFee: 0,
      toUserId: data.expertId,
      hubId: data.hubId,
      stripeTransferId: data.stripeTransferId,
      transferMethod: 'stripe_connect',
      transferredAt: new Date(),
      status: TransactionStatus.SUCCEEDED,
      description: data.description,
    });
  }

  /**
   * Create refund transaction
   */
  async createRefund(data: {
    originalTransaction: ITransaction;
    refundAmount: number;
    stripeRefundId: string;
    reason?: string;
    refundedBy?: mongoose.Types.ObjectId;
  }): Promise<ITransaction> {
    const { originalTransaction, refundAmount, stripeRefundId, reason, refundedBy } = data;

    return Transaction.create({
      type: TransactionType.REFUND,
      direction: TransactionDirection.OUTBOUND,
      sourceModel: originalTransaction.sourceModel,
      sourceId: originalTransaction.sourceId,
      amount: refundAmount,
      currency: originalTransaction.currency,
      platformFee: 0,
      stripeFee: 0,
      transferAmount: 0,
      fromUserId: originalTransaction.toUserId,
      toUserId: originalTransaction.fromUserId,
      hubId: originalTransaction.hubId,
      serviceType: originalTransaction.serviceType,
      serviceId: originalTransaction.serviceId,
      stripeRefundId,
      refundedAmount: refundAmount,
      refundedAt: new Date(),
      refundReason: reason,
      refundedBy,
      status: TransactionStatus.SUCCEEDED,
      description: `Refund for ${originalTransaction.referenceId}`,
      metadata: {
        originalTransactionId: originalTransaction._id,
        originalReferenceId: originalTransaction.referenceId,
      },
    });
  }

  /**
   * Find transaction by ID
   */
  async findById(transactionId: string | mongoose.Types.ObjectId): Promise<ITransaction | null> {
    return Transaction.findById(transactionId);
  }

  /**
   * Find transaction by reference ID
   */
  async findByReferenceId(referenceId: string): Promise<ITransaction | null> {
    return Transaction.findOne({ referenceId });
  }

  /**
   * Find transactions by hub
   */
  async findByHubId(
    hubId: string | mongoose.Types.ObjectId,
    options?: {
      type?: TransactionType;
      status?: TransactionStatus;
      direction?: TransactionDirection;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{ transactions: ITransaction[]; total: number }> {
    const filter: Record<string, unknown> = { hubId };

    if (options?.type) filter.type = options.type;
    if (options?.status) filter.status = options.status;
    if (options?.direction) filter.direction = options.direction;

    if (options?.startDate || options?.endDate) {
      filter.createdAt = {};
      if (options?.startDate)
        (filter.createdAt as Record<string, unknown>).$gte = options.startDate;
      if (options?.endDate) (filter.createdAt as Record<string, unknown>).$lte = options.endDate;
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Transaction.countDocuments(filter),
    ]);

    return { transactions: transactions as unknown as ITransaction[], total };
  }

  /**
   * Find transactions by user (as payer)
   */
  async findByPayerId(
    userId: string | mongoose.Types.ObjectId,
    options?: { page?: number; limit?: number },
  ): Promise<{ transactions: ITransaction[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find({ fromUserId: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments({ fromUserId: userId }),
    ]);

    return { transactions: transactions as unknown as ITransaction[], total };
  }

  /**
   * Find transactions by user (as receiver)
   */
  async findByReceiverId(
    userId: string | mongoose.Types.ObjectId,
    options?: { page?: number; limit?: number },
  ): Promise<{ transactions: ITransaction[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find({ toUserId: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Transaction.countDocuments({ toUserId: userId }),
    ]);

    return { transactions: transactions as unknown as ITransaction[], total };
  }

  /**
   * Find transactions by source
   */
  async findBySource(
    sourceModel: SourceModel,
    sourceId: string | mongoose.Types.ObjectId,
  ): Promise<ITransaction[]> {
    const transactions = await Transaction.find({ sourceModel, sourceId })
      .sort({ createdAt: -1 })
      .lean();
    return transactions as unknown as ITransaction[];
  }

  /**
   * Find transaction by Stripe Payment Intent ID
   */
  async findByStripePaymentIntentId(paymentIntentId: string): Promise<ITransaction | null> {
    return Transaction.findOne({ stripePaymentIntentId: paymentIntentId });
  }

  /**
   * Find transaction by Stripe Transfer ID
   */
  async findByStripeTransferId(transferId: string): Promise<ITransaction | null> {
    return Transaction.findOne({ stripeTransferId: transferId });
  }

  /**
   * Update transaction status
   */
  async updateStatus(
    transactionId: string | mongoose.Types.ObjectId,
    status: TransactionStatus,
    additionalData?: Partial<ITransaction>,
  ): Promise<ITransaction | null> {
    return Transaction.findByIdAndUpdate(
      transactionId,
      {
        status,
        ...additionalData,
      },
      { new: true },
    );
  }

  /**
   * Update transaction from Stripe webhook
   */
  async updateFromWebhook(
    stripePaymentIntentId: string,
    webhookData: {
      status: TransactionStatus;
      stripeStatus?: string;
      stripeChargeId?: string;
      stripeResponse?: Record<string, unknown>;
      stripeWebhookEventId?: string;
      errorCode?: string;
      errorMessage?: string;
    },
  ): Promise<ITransaction | null> {
    return Transaction.findOneAndUpdate({ stripePaymentIntentId }, webhookData, { new: true });
  }

  /**
   * Record transfer completion
   */
  async recordTransferCompletion(
    transactionId: string | mongoose.Types.ObjectId,
    stripeTransferId: string,
  ): Promise<ITransaction | null> {
    return Transaction.findByIdAndUpdate(
      transactionId,
      {
        stripeTransferId,
        transferredAt: new Date(),
        transferMethod: 'stripe_connect',
      },
      { new: true },
    );
  }

  /**
   * Calculate platform revenue for a hub
   */
  async calculatePlatformRevenue(
    hubId: string | mongoose.Types.ObjectId,
    options?: { startDate?: Date; endDate?: Date },
  ): Promise<{
    totalRevenue: number;
    totalPlatformFees: number;
    totalStripeFees: number;
    totalTransferAmount: number;
    transactionCount: number;
  }> {
    const matchQuery: Record<string, unknown> = {
      hubId: new mongoose.Types.ObjectId(hubId as string),
      status: TransactionStatus.SUCCEEDED,
      direction: TransactionDirection.INBOUND,
    };

    if (options?.startDate || options?.endDate) {
      matchQuery.createdAt = {};
      if (options?.startDate)
        (matchQuery.createdAt as Record<string, unknown>).$gte = options.startDate;
      if (options?.endDate)
        (matchQuery.createdAt as Record<string, unknown>).$lte = options.endDate;
    }

    const result = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalPlatformFees: { $sum: '$platformFee' },
          totalStripeFees: { $sum: '$stripeFee' },
          totalTransferAmount: { $sum: '$transferAmount' },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    return result.length > 0
      ? result[0]
      : {
          totalRevenue: 0,
          totalPlatformFees: 0,
          totalStripeFees: 0,
          totalTransferAmount: 0,
          transactionCount: 0,
        };
  }

  /**
   * Get revenue summary by transaction type
   */
  async getRevenueSummaryByType(
    hubId: string | mongoose.Types.ObjectId,
    options?: { startDate?: Date; endDate?: Date },
  ): Promise<
    Array<{
      type: TransactionType;
      count: number;
      totalAmount: number;
      platformFees: number;
    }>
  > {
    const matchQuery: Record<string, unknown> = {
      hubId: new mongoose.Types.ObjectId(hubId as string),
      status: TransactionStatus.SUCCEEDED,
    };

    if (options?.startDate || options?.endDate) {
      matchQuery.createdAt = {};
      if (options?.startDate)
        (matchQuery.createdAt as Record<string, unknown>).$gte = options.startDate;
      if (options?.endDate)
        (matchQuery.createdAt as Record<string, unknown>).$lte = options.endDate;
    }

    return Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          platformFees: { $sum: '$platformFee' },
        },
      },
      {
        $project: {
          type: '$_id',
          count: 1,
          totalAmount: 1,
          platformFees: 1,
          _id: 0,
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);
  }

  /**
   * Get revenue summary by service type
   */
  async getRevenueSummaryByServiceType(
    hubId: string | mongoose.Types.ObjectId,
    options?: { startDate?: Date; endDate?: Date },
  ): Promise<
    Array<{
      serviceType: string;
      count: number;
      totalAmount: number;
      platformFees: number;
    }>
  > {
    const matchQuery: Record<string, unknown> = {
      hubId: new mongoose.Types.ObjectId(hubId as string),
      status: TransactionStatus.SUCCEEDED,
      direction: TransactionDirection.INBOUND,
      serviceType: { $exists: true },
    };

    if (options?.startDate || options?.endDate) {
      matchQuery.createdAt = {};
      if (options?.startDate)
        (matchQuery.createdAt as Record<string, unknown>).$gte = options.startDate;
      if (options?.endDate)
        (matchQuery.createdAt as Record<string, unknown>).$lte = options.endDate;
    }

    return Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$serviceType',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          platformFees: { $sum: '$platformFee' },
        },
      },
      {
        $project: {
          serviceType: '$_id',
          count: 1,
          totalAmount: 1,
          platformFees: 1,
          _id: 0,
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);
  }

  /**
   * Get monthly revenue trend
   */
  async getMonthlyRevenueTrend(
    hubId: string | mongoose.Types.ObjectId,
    months: number = 12,
  ): Promise<
    Array<{
      year: number;
      month: number;
      totalAmount: number;
      platformFees: number;
      transactionCount: number;
    }>
  > {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return Transaction.aggregate([
      {
        $match: {
          hubId: new mongoose.Types.ObjectId(hubId as string),
          status: TransactionStatus.SUCCEEDED,
          direction: TransactionDirection.INBOUND,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          totalAmount: { $sum: '$amount' },
          platformFees: { $sum: '$platformFee' },
          transactionCount: { $sum: 1 },
        },
      },
      {
        $project: {
          year: '$_id.year',
          month: '$_id.month',
          totalAmount: 1,
          platformFees: 1,
          transactionCount: 1,
          _id: 0,
        },
      },
      { $sort: { year: 1, month: 1 } },
    ]);
  }

  /**
   * Get expert earnings
   */
  async getExpertEarnings(
    expertId: string | mongoose.Types.ObjectId,
    options?: { startDate?: Date; endDate?: Date },
  ): Promise<{
    totalEarnings: number;
    pendingEarnings: number;
    transferredAmount: number;
    transactionCount: number;
  }> {
    const matchQuery: Record<string, unknown> = {
      toUserId: new mongoose.Types.ObjectId(expertId as string),
    };

    if (options?.startDate || options?.endDate) {
      matchQuery.createdAt = {};
      if (options?.startDate)
        (matchQuery.createdAt as Record<string, unknown>).$gte = options.startDate;
      if (options?.endDate)
        (matchQuery.createdAt as Record<string, unknown>).$lte = options.endDate;
    }

    const result = await Transaction.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalEarnings: {
            $sum: {
              $cond: [{ $eq: ['$status', TransactionStatus.SUCCEEDED] }, '$transferAmount', 0],
            },
          },
          pendingEarnings: {
            $sum: {
              $cond: [
                {
                  $in: ['$status', [TransactionStatus.PENDING, TransactionStatus.PROCESSING]],
                },
                '$transferAmount',
                0,
              ],
            },
          },
          transferredAmount: {
            $sum: {
              $cond: [{ $ne: ['$transferredAt', null] }, '$transferAmount', 0],
            },
          },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    return result.length > 0
      ? result[0]
      : {
          totalEarnings: 0,
          pendingEarnings: 0,
          transferredAmount: 0,
          transactionCount: 0,
        };
  }

  /**
   * Get pending transfers (for cron jobs)
   */
  async findPendingTransfers(): Promise<ITransaction[]> {
    const transactions = await Transaction.find({
      status: TransactionStatus.SUCCEEDED,
      direction: TransactionDirection.INBOUND,
      transferredAt: { $exists: false },
      toUserId: { $exists: true },
    })
      .sort({ createdAt: 1 })
      .lean();
    return transactions as unknown as ITransaction[];
  }

  /**
   * Get failed transactions for retry
   */
  async findFailedTransactionsForRetry(maxRetries: number = 3): Promise<ITransaction[]> {
    const transactions = await Transaction.find({
      status: TransactionStatus.FAILED,
      retryCount: { $lt: maxRetries },
    })
      .sort({ lastRetryAt: 1 })
      .lean();
    return transactions as unknown as ITransaction[];
  }

  /**
   * Increment retry count
   */
  async incrementRetryCount(transactionId: string | mongoose.Types.ObjectId): Promise<void> {
    await Transaction.findByIdAndUpdate(transactionId, {
      $inc: { retryCount: 1 },
      lastRetryAt: new Date(),
    });
  }

  /**
   * Get transaction statistics for dashboard
   */
  async getDashboardStats(hubId: string | mongoose.Types.ObjectId): Promise<{
    today: { amount: number; count: number };
    thisWeek: { amount: number; count: number };
    thisMonth: { amount: number; count: number };
    pendingTransfers: number;
  }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const hubObjectId = new mongoose.Types.ObjectId(hubId as string);

    const [today, thisWeek, thisMonth, pendingTransfers] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            hubId: hubObjectId,
            status: TransactionStatus.SUCCEEDED,
            direction: TransactionDirection.INBOUND,
            createdAt: { $gte: startOfDay },
          },
        },
        {
          $group: {
            _id: null,
            amount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            hubId: hubObjectId,
            status: TransactionStatus.SUCCEEDED,
            direction: TransactionDirection.INBOUND,
            createdAt: { $gte: startOfWeek },
          },
        },
        {
          $group: {
            _id: null,
            amount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            hubId: hubObjectId,
            status: TransactionStatus.SUCCEEDED,
            direction: TransactionDirection.INBOUND,
            createdAt: { $gte: startOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            amount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Transaction.countDocuments({
        hubId: hubObjectId,
        status: TransactionStatus.SUCCEEDED,
        direction: TransactionDirection.INBOUND,
        transferredAt: { $exists: false },
        toUserId: { $exists: true },
      }),
    ]);

    return {
      today: today[0] || { amount: 0, count: 0 },
      thisWeek: thisWeek[0] || { amount: 0, count: 0 },
      thisMonth: thisMonth[0] || { amount: 0, count: 0 },
      pendingTransfers,
    };
  }
}

export const transactionService = new TransactionService();
