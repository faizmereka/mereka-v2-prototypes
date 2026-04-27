import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Transaction type enum - types of financial movements
 */
export enum TransactionType {
  // Inbound - Customer pays
  BOOKING_PAYMENT = 'booking_payment', // Experience/Expertise/Space booking
  MILESTONE_FUND = 'milestone_fund', // Client funds milestone (escrow)
  TIMELOG_PAYMENT = 'timelog_payment', // Hourly work payment

  // Release - Escrow to expert
  MILESTONE_RELEASE = 'milestone_release', // Escrow released to expert

  // Transfer - Platform to expert
  EXPERT_TRANSFER = 'expert_transfer', // Transfer to expert's Connect account

  // Outbound - Expert receives
  WITHDRAWAL = 'withdrawal', // Expert withdraws to bank

  // Returns
  REFUND = 'refund', // Refund to customer
  TRANSFER_REVERSAL = 'transfer_reversal', // Reverse transfer from expert

  // Platform
  PLATFORM_FEE = 'platform_fee', // Platform commission record
}

/**
 * Transaction status enum
 */
export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELLED = 'cancelled',
}

/**
 * Source model enum - which model created this transaction
 */
export enum SourceModel {
  BOOKING = 'Booking',
  CONTRACT_PAYMENT = 'ContractPayment',
  WITHDRAWAL = 'Withdrawal',
  BOOKING_TRANSACTION = 'BookingTransaction', // Legacy
}

/**
 * Transaction direction enum
 */
export enum TransactionDirection {
  INBOUND = 'inbound', // Money coming into platform
  OUTBOUND = 'outbound', // Money leaving platform
  INTERNAL = 'internal', // Money moving within platform (transfers)
}

/**
 * Transaction document interface
 */
export interface ITransaction extends Document {
  // Firebase migration tracking
  firebaseId?: string; // Original Firebase document ID for migration

  // Type & Source
  type: TransactionType;
  direction: TransactionDirection;
  sourceModel: SourceModel;
  sourceId: mongoose.Types.ObjectId;

  // Reference ID for display (e.g., TXN-2024-001234)
  referenceId: string;

  // Money flow
  amount: number; // Total transaction amount
  currency: string;
  platformFee: number; // Platform commission
  platformFeeRate: number; // Rate used (e.g., 0.15)
  stripeFee: number; // Stripe processing fee
  transferAmount: number; // Amount to/from expert

  // Parties
  fromUserId?: mongoose.Types.ObjectId; // Payer (customer)
  toUserId?: mongoose.Types.ObjectId; // Receiver (expert)
  hubId: mongoose.Types.ObjectId; // Hub context

  // Service context
  serviceType?: 'experience' | 'expertise' | 'space' | 'milestone' | 'timelog';
  serviceId?: mongoose.Types.ObjectId;

  // Stripe references
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeTransferId?: string;
  stripePayoutId?: string;
  stripeRefundId?: string;

  // Stripe metadata
  stripeResponse?: Record<string, unknown>;
  stripeWebhookEventId?: string;

  // Status tracking
  status: TransactionStatus;
  stripeStatus?: string;

  // Transfer details
  transferredAt?: Date;
  transferMethod?: 'stripe_connect' | 'manual' | 'bank_transfer';

  // Refund tracking
  refundedAmount?: number;
  refundedAt?: Date;
  refundReason?: string;
  refundedBy?: mongoose.Types.ObjectId;

  // Error handling
  errorCode?: string;
  errorMessage?: string;
  retryCount?: number;
  lastRetryAt?: Date;

  // Metadata
  description?: string;
  notes?: string;
  metadata?: Record<string, unknown>;

  // Audit
  processedBy?: mongoose.Types.ObjectId; // Admin who processed (if manual)
  ipAddress?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generate reference ID for transaction
 */
function generateReferenceId(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${year}-${random}`;
}

/**
 * Transaction schema definition
 */
const transactionSchema = new Schema<ITransaction>(
  {
    // Firebase migration tracking
    firebaseId: {
      type: String,
      sparse: true,
      index: true,
    },

    // Type & Source
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: Object.values(TransactionDirection),
      required: true,
      index: true,
    },
    sourceModel: {
      type: String,
      enum: Object.values(SourceModel),
      required: true,
      index: true,
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    // Reference ID
    referenceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: generateReferenceId,
    },

    // Money flow
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: 'MYR',
    },
    platformFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    platformFeeRate: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.15,
    },
    stripeFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    transferAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Parties
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    toUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    hubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
      index: true,
    },

    // Service context
    serviceType: {
      type: String,
      enum: ['experience', 'expertise', 'space', 'milestone', 'timelog'],
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      index: true,
    },

    // Stripe references
    stripePaymentIntentId: {
      type: String,
      index: true,
    },
    stripeChargeId: {
      type: String,
      index: true,
    },
    stripeTransferId: {
      type: String,
      index: true,
    },
    stripePayoutId: {
      type: String,
      index: true,
    },
    stripeRefundId: {
      type: String,
      index: true,
    },

    // Stripe metadata
    stripeResponse: {
      type: Schema.Types.Mixed,
    },
    stripeWebhookEventId: {
      type: String,
      index: true,
    },

    // Status tracking
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
      required: true,
      index: true,
    },
    stripeStatus: {
      type: String,
    },

    // Transfer details
    transferredAt: {
      type: Date,
    },
    transferMethod: {
      type: String,
      enum: ['stripe_connect', 'manual', 'bank_transfer'],
    },

    // Refund tracking
    refundedAmount: {
      type: Number,
      min: 0,
    },
    refundedAt: {
      type: Date,
    },
    refundReason: {
      type: String,
      maxlength: 500,
    },
    refundedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    // Error handling
    errorCode: {
      type: String,
    },
    errorMessage: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    lastRetryAt: {
      type: Date,
    },

    // Metadata
    description: {
      type: String,
      maxlength: 500,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },

    // Audit
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'transactions',
    toJSON: {
      transform: (_doc, ret) => {
        const { __v: _v, stripeResponse: _sr, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Compound indexes for performance
transactionSchema.index({ hubId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ fromUserId: 1, createdAt: -1 });
transactionSchema.index({ toUserId: 1, createdAt: -1 });
transactionSchema.index({ sourceModel: 1, sourceId: 1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ stripePaymentIntentId: 1 });
transactionSchema.index({ stripeTransferId: 1 });
transactionSchema.index({ stripePayoutId: 1 });
transactionSchema.index({ direction: 1, status: 1 });
transactionSchema.index({ hubId: 1, type: 1, createdAt: -1 }); // For reporting

// Text index for search
transactionSchema.index({
  referenceId: 'text',
  description: 'text',
});

/**
 * Instance methods
 */

/**
 * Check if transaction is successful
 */
transactionSchema.methods.isSuccessful = function (): boolean {
  return this.status === TransactionStatus.SUCCEEDED;
};

/**
 * Check if transaction can be refunded
 */
transactionSchema.methods.canBeRefunded = function (): boolean {
  return (
    this.status === TransactionStatus.SUCCEEDED &&
    this.direction === TransactionDirection.INBOUND &&
    (this.refundedAmount ?? 0) < this.amount
  );
};

/**
 * Get remaining refundable amount
 */
transactionSchema.methods.getRefundableAmount = function (): number {
  if (!this.canBeRefunded()) return 0;
  return this.amount - (this.refundedAmount ?? 0);
};

/**
 * Static methods
 */

/**
 * Create transaction from booking
 */
transactionSchema.statics.createFromBooking = async function (
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
  return this.create({
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
};

/**
 * Create transaction from contract payment
 */
transactionSchema.statics.createFromContractPayment = async function (
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
  return this.create({
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
};

/**
 * Find transactions by hub
 */
transactionSchema.statics.findByHubId = function (
  hubId: mongoose.Types.ObjectId | string,
  options?: { type?: TransactionType; status?: TransactionStatus; limit?: number },
) {
  const query = this.find({ hubId });
  if (options?.type) query.where('type').equals(options.type);
  if (options?.status) query.where('status').equals(options.status);
  if (options?.limit) query.limit(options.limit);
  return query.sort({ createdAt: -1 });
};

/**
 * Find transactions by user (as payer)
 */
transactionSchema.statics.findByPayerId = function (
  userId: mongoose.Types.ObjectId | string,
  options?: { limit?: number },
) {
  const query = this.find({ fromUserId: userId });
  if (options?.limit) query.limit(options.limit);
  return query.sort({ createdAt: -1 });
};

/**
 * Find transactions by user (as receiver)
 */
transactionSchema.statics.findByReceiverId = function (
  userId: mongoose.Types.ObjectId | string,
  options?: { limit?: number },
) {
  const query = this.find({ toUserId: userId });
  if (options?.limit) query.limit(options.limit);
  return query.sort({ createdAt: -1 });
};

/**
 * Find by source
 */
transactionSchema.statics.findBySource = function (
  sourceModel: SourceModel,
  sourceId: mongoose.Types.ObjectId | string,
) {
  return this.find({ sourceModel, sourceId }).sort({ createdAt: -1 });
};

/**
 * Calculate platform revenue by hub
 */
transactionSchema.statics.calculatePlatformRevenue = async function (
  hubId: mongoose.Types.ObjectId | string,
  options?: { startDate?: Date; endDate?: Date },
): Promise<{ totalRevenue: number; totalFees: number; transactionCount: number }> {
  const matchQuery: Record<string, unknown> = {
    hubId: new mongoose.Types.ObjectId(hubId as string),
    status: TransactionStatus.SUCCEEDED,
    direction: TransactionDirection.INBOUND,
  };

  if (options?.startDate || options?.endDate) {
    matchQuery.createdAt = {};
    if (options?.startDate)
      (matchQuery.createdAt as Record<string, unknown>).$gte = options.startDate;
    if (options?.endDate) (matchQuery.createdAt as Record<string, unknown>).$lte = options.endDate;
  }

  const result = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalFees: { $sum: '$platformFee' },
        transactionCount: { $sum: 1 },
      },
    },
  ]);

  return result.length > 0 ? result[0] : { totalRevenue: 0, totalFees: 0, transactionCount: 0 };
};

/**
 * Get transaction summary by type
 */
transactionSchema.statics.getSummaryByType = async function (
  hubId: mongoose.Types.ObjectId | string,
  options?: { startDate?: Date; endDate?: Date },
): Promise<Array<{ type: string; count: number; totalAmount: number }>> {
  const matchQuery: Record<string, unknown> = {
    hubId: new mongoose.Types.ObjectId(hubId as string),
    status: TransactionStatus.SUCCEEDED,
  };

  if (options?.startDate || options?.endDate) {
    matchQuery.createdAt = {};
    if (options?.startDate)
      (matchQuery.createdAt as Record<string, unknown>).$gte = options.startDate;
    if (options?.endDate) (matchQuery.createdAt as Record<string, unknown>).$lte = options.endDate;
  }

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
    {
      $project: {
        type: '$_id',
        count: 1,
        totalAmount: 1,
        _id: 0,
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);
};

/**
 * Transaction model
 */
export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
