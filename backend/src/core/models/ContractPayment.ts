import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Contract payment type enum
 */
export enum ContractPaymentType {
  MILESTONE = 'milestone', // Fixed price milestone payment
  TIMELOG = 'timelog', // Hourly timelog payment
}

/**
 * Contract payment status enum
 */
export enum ContractPaymentStatus {
  PENDING = 'pending', // Payment not yet initiated
  FUNDED = 'funded', // Escrow funded (for milestones)
  PROCESSING = 'processing', // Payment being processed
  RELEASED = 'released', // Payment released to expert
  REFUNDED = 'refunded', // Payment refunded to client
  FAILED = 'failed', // Payment failed
  CANCELLED = 'cancelled', // Payment cancelled
}

/**
 * Stripe payment status for escrow
 */
export enum EscrowStatus {
  NONE = 'none',
  REQUIRES_PAYMENT_METHOD = 'requires_payment_method',
  REQUIRES_CONFIRMATION = 'requires_confirmation',
  REQUIRES_ACTION = 'requires_action',
  PROCESSING = 'processing',
  REQUIRES_CAPTURE = 'requires_capture', // Escrow holding funds
  CAPTURED = 'captured', // Funds captured
  CANCELED = 'canceled',
  FAILED = 'failed',
}

/**
 * Contract payment document interface
 */
export interface IContractPayment extends Document {
  _id: mongoose.Types.ObjectId;

  // Firebase migration tracking
  firebaseId?: string; // Original Firebase document ID for migration

  // Core references
  paymentType: ContractPaymentType;
  contractId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;

  // Hub references
  clientHubId: mongoose.Types.ObjectId; // Hub that posted the job
  expertHubId: mongoose.Types.ObjectId; // Hub the expert belongs to
  hubId: mongoose.Types.ObjectId; // Legacy - same as expertHubId

  // Parties
  clientId: mongoose.Types.ObjectId; // Who pays (job poster)
  expertId: mongoose.Types.ObjectId; // Who receives (expert)

  // Idempotency key for preventing duplicate payments
  idempotencyKey: string;

  // For milestone payments
  milestoneId?: mongoose.Types.ObjectId;

  // For timelog payments
  timelogEntryIds?: mongoose.Types.ObjectId[];
  weekNumber?: number;
  year?: number;
  monthNumber?: number;
  hoursWorked?: number;
  weekStartDate?: Date;
  weekEndDate?: Date;

  // Pricing
  amount: number; // Base amount (what expert receives)
  currency: string;
  hourlyRate?: number; // For timelogs

  // Fees breakdown - NO platform commission, only Stripe fee
  stripeFee: number; // 2.9% + $0.30 (passed to client)
  grossAmount: number; // amount + stripeFee (what client pays)
  transferAmount: number; // Same as amount - expert receives full amount (no platform fee)
  // Note: Expert receives full 'amount' - Mereka revenue is subscription-based only

  // Status
  status: ContractPaymentStatus;
  escrowStatus: EscrowStatus;

  // Stripe references
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeResponse?: Record<string, unknown>;

  // Stripe region - tracks which platform was used for this payment
  stripeRegion?: 'malaysia' | 'atlas';

  // Transaction reference
  transactionId?: mongoose.Types.ObjectId; // Link to Transaction

  // Transfer tracking
  transferId?: string; // Stripe transfer ID
  transferStatus?: 'pending' | 'paid' | 'failed';
  transferredAt?: Date;

  // Date tracking
  fundedDate?: Date; // When escrow was funded
  releasedDate?: Date; // When payment was released
  refundedDate?: Date; // When payment was refunded

  // Approval tracking
  releasedBy?: mongoose.Types.ObjectId; // User who released payment
  refundedBy?: mongoose.Types.ObjectId; // User who processed refund
  refundReason?: string;

  // Error handling
  errorCode?: string;
  errorMessage?: string;
  retryCount?: number;
  lastRetryAt?: Date;

  // Legacy compatibility
  legacyBookingTransactionId?: mongoose.Types.ObjectId;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contract payment schema definition
 */
const contractPaymentSchema = new Schema<IContractPayment>(
  {
    // Firebase migration tracking
    firebaseId: {
      type: String,
      sparse: true,
      index: true,
    },

    // Core references
    paymentType: {
      type: String,
      enum: Object.values(ContractPaymentType),
      required: true,
      index: true,
    },
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },

    // Hub references
    clientHubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
      index: true,
    },
    expertHubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
      index: true,
    },
    hubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
      index: true,
    },

    // Parties
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    expertId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Idempotency key for preventing duplicate payments
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // For milestone payments
    milestoneId: {
      type: Schema.Types.ObjectId,
      ref: 'Milestone',
      index: true,
    },

    // For timelog payments
    timelogEntryIds: {
      type: [Schema.Types.ObjectId],
      ref: 'TimelogEntry',
      default: [],
    },
    weekNumber: {
      type: Number,
      index: true,
    },
    year: {
      type: Number,
      index: true,
    },
    monthNumber: {
      type: Number,
    },
    hoursWorked: {
      type: Number,
      min: 0,
    },
    weekStartDate: {
      type: Date,
    },
    weekEndDate: {
      type: Date,
    },

    // Pricing
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
    hourlyRate: {
      type: Number,
      min: 0,
    },

    // Fees breakdown - NO platform commission, Mereka revenue is subscription-based
    stripeFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    grossAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    transferAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    // Note: Expert receives full 'amount' - no platformFee deduction

    // Status
    status: {
      type: String,
      enum: Object.values(ContractPaymentStatus),
      default: ContractPaymentStatus.PENDING,
      required: true,
      index: true,
    },
    escrowStatus: {
      type: String,
      enum: Object.values(EscrowStatus),
      default: EscrowStatus.NONE,
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
    stripeResponse: {
      type: Schema.Types.Mixed,
    },

    // Stripe region - tracks which platform was used for this payment
    stripeRegion: {
      type: String,
      enum: ['malaysia', 'atlas'],
      index: true,
    },

    // Transaction reference
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      index: true,
    },

    // Transfer tracking
    transferId: {
      type: String,
      index: true,
    },
    transferStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
    },
    transferredAt: {
      type: Date,
    },

    // Date tracking
    fundedDate: {
      type: Date,
    },
    releasedDate: {
      type: Date,
    },
    refundedDate: {
      type: Date,
    },

    // Approval tracking
    releasedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    refundedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    refundReason: {
      type: String,
      maxlength: 500,
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

    // Legacy compatibility
    legacyBookingTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'BookingTransaction',
    },
  },
  {
    timestamps: true,
    collection: 'contractPayments',
    toJSON: {
      transform: (_doc, ret) => {
        const { __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Compound indexes for performance
contractPaymentSchema.index({ contractId: 1, status: 1 });
contractPaymentSchema.index({ contractId: 1, paymentType: 1 });
contractPaymentSchema.index({ expertId: 1, status: 1 });
contractPaymentSchema.index({ clientId: 1, status: 1 });
contractPaymentSchema.index({ hubId: 1, createdAt: -1 });
contractPaymentSchema.index({ milestoneId: 1, status: 1 });
contractPaymentSchema.index({ contractId: 1, year: 1, weekNumber: 1 }); // For timelog payments
contractPaymentSchema.index({ status: 1, createdAt: -1 });
contractPaymentSchema.index({ transferStatus: 1, status: 1 }); // For pending transfers
contractPaymentSchema.index({ stripePaymentIntentId: 1 });

// Unique constraint for timelog payments per week
contractPaymentSchema.index(
  { contractId: 1, paymentType: 1, year: 1, weekNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { paymentType: ContractPaymentType.TIMELOG },
  },
);

/**
 * Pre-save hook to calculate fees
 * NO platform commission - Mereka revenue is subscription-based only
 * Expert receives FULL amount, client pays amount + Stripe fee
 */
contractPaymentSchema.pre('save', function (next) {
  // Calculate fees if not already set and amount is provided
  if (this.amount > 0 && this.stripeFee === 0) {
    // Stripe Atlas fee: 2.9% + $0.30 (USD only)
    const stripeFeeRate = 0.029;
    const stripeFeeFixed = 0.3; // USD only
    this.stripeFee = Number((this.amount * stripeFeeRate + stripeFeeFixed).toFixed(2));

    // Client pays amount + Stripe fee
    this.grossAmount = Number((this.amount + this.stripeFee).toFixed(2));

    // Expert receives full amount - NO platform commission
    // transferAmount = amount (backward compatibility for existing services)
    this.transferAmount = this.amount;
  }

  next();
});

/**
 * Instance methods
 */

/**
 * Check if payment can be released
 */
contractPaymentSchema.methods.canBeReleased = function (): boolean {
  return this.status === ContractPaymentStatus.FUNDED;
};

/**
 * Check if payment can be refunded
 */
contractPaymentSchema.methods.canBeRefunded = function (): boolean {
  return [ContractPaymentStatus.FUNDED, ContractPaymentStatus.RELEASED].includes(this.status);
};

/**
 * Check if payment is in escrow
 */
contractPaymentSchema.methods.isInEscrow = function (): boolean {
  return (
    this.status === ContractPaymentStatus.FUNDED &&
    this.escrowStatus === EscrowStatus.REQUIRES_CAPTURE
  );
};

/**
 * Check if payment is completed
 */
contractPaymentSchema.methods.isCompleted = function (): boolean {
  return this.status === ContractPaymentStatus.RELEASED && this.transferStatus === 'paid';
};

/**
 * Static methods
 */

/**
 * Find payments by contract
 */
contractPaymentSchema.statics.findByContractId = function (
  contractId: mongoose.Types.ObjectId | string,
  options?: { status?: ContractPaymentStatus; paymentType?: ContractPaymentType },
) {
  const query: Record<string, unknown> = { contractId };
  if (options?.status) query.status = options.status;
  if (options?.paymentType) query.paymentType = options.paymentType;
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Find payments by expert
 */
contractPaymentSchema.statics.findByExpertId = function (
  expertId: mongoose.Types.ObjectId | string,
  options?: { status?: ContractPaymentStatus; limit?: number },
) {
  const query = this.find({ expertId });
  if (options?.status) query.where('status').equals(options.status);
  if (options?.limit) query.limit(options.limit);
  return query.sort({ createdAt: -1 });
};

/**
 * Find payments by client
 */
contractPaymentSchema.statics.findByClientId = function (
  clientId: mongoose.Types.ObjectId | string,
  options?: { status?: ContractPaymentStatus; limit?: number },
) {
  const query = this.find({ clientId });
  if (options?.status) query.where('status').equals(options.status);
  if (options?.limit) query.limit(options.limit);
  return query.sort({ createdAt: -1 });
};

/**
 * Find payment by milestone
 */
contractPaymentSchema.statics.findByMilestoneId = function (
  milestoneId: mongoose.Types.ObjectId | string,
) {
  return this.findOne({ milestoneId, paymentType: ContractPaymentType.MILESTONE });
};

/**
 * Find pending transfers (for cron job)
 */
contractPaymentSchema.statics.findPendingTransfers = function () {
  return this.find({
    status: ContractPaymentStatus.RELEASED,
    transferStatus: { $ne: 'paid' },
  }).sort({ releasedDate: 1 });
};

/**
 * Calculate total earned by expert
 */
contractPaymentSchema.statics.calculateTotalEarned = async function (
  expertId: mongoose.Types.ObjectId | string,
): Promise<number> {
  const result = await this.aggregate([
    {
      $match: {
        expertId: new mongoose.Types.ObjectId(expertId as string),
        status: ContractPaymentStatus.RELEASED,
        transferStatus: 'paid',
      },
    },
    {
      $group: {
        _id: null,
        totalEarned: { $sum: '$transferAmount' },
      },
    },
  ]);

  return result.length > 0 ? result[0].totalEarned : 0;
};

/**
 * Calculate total spent by client
 */
contractPaymentSchema.statics.calculateTotalSpent = async function (
  clientId: mongoose.Types.ObjectId | string,
): Promise<number> {
  const result = await this.aggregate([
    {
      $match: {
        clientId: new mongoose.Types.ObjectId(clientId as string),
        status: { $in: [ContractPaymentStatus.FUNDED, ContractPaymentStatus.RELEASED] },
      },
    },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: '$amount' },
      },
    },
  ]);

  return result.length > 0 ? result[0].totalSpent : 0;
};

/**
 * Contract payment model
 */
export const ContractPayment = mongoose.model<IContractPayment>(
  'ContractPayment',
  contractPaymentSchema,
);
