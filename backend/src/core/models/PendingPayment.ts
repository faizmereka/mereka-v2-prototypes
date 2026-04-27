import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

/**
 * Pending Payment Status
 */
export enum PendingPaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Retry attempt interface
 */
export interface IRetryAttempt {
  attemptNumber: number;
  attemptedAt: Date;
  errorCode?: string;
  errorMessage?: string;
  success: boolean;
}

/**
 * Pending Payment Interface - Tracks failed payments for retry
 */
export interface IPendingPayment extends Document {
  _id: Types.ObjectId;

  // Firebase migration tracking
  firebaseId?: string; // Original Firebase document ID for migration

  // Contract & Job References
  contractId: Types.ObjectId;
  jobId: Types.ObjectId;
  proposalId?: Types.ObjectId;

  // Hub references
  clientHubId: Types.ObjectId; // Hub that posted the job
  expertHubId: Types.ObjectId; // Hub the expert belongs to

  // User References
  expertId: Types.ObjectId;
  clientId: Types.ObjectId;

  // Idempotency key for preventing duplicate payments
  idempotencyKey: string;

  // Stripe Payment Details
  paymentMethodId: string;
  stripeCustomerId: string;
  amount: number; // Base amount in USD
  stripeFee: number; // Stripe fee (2.9% + $0.30)
  grossAmount: number; // Total client pays (amount + stripeFee)
  currency: string;

  // Work Details (for hourly contracts)
  weekNumber?: number;
  year?: number;
  weekStartDate?: Date;
  weekEndDate?: Date;
  totalHours: number;
  hourlyRate?: number;
  contractTitle: string;
  description?: string;

  // Work Log References
  timelogEntryIds: Types.ObjectId[];

  // Retry Configuration
  status: PendingPaymentStatus;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date;

  // Retry history
  retryHistory: IRetryAttempt[];

  // Error Tracking
  lastError?: string;
  lastAttempt?: Date;
  failedAt?: Date;

  // Success Tracking
  processedAt?: Date;
  paymentIntentId?: string;
  contractPaymentId?: Types.ObjectId; // Link to created ContractPayment

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Retry attempt schema
 */
const retryAttemptSchema = new Schema<IRetryAttempt>(
  {
    attemptNumber: {
      type: Number,
      required: true,
    },
    attemptedAt: {
      type: Date,
      required: true,
    },
    errorCode: {
      type: String,
    },
    errorMessage: {
      type: String,
    },
    success: {
      type: Boolean,
      required: true,
    },
  },
  { _id: false },
);

/**
 * Pending Payment Schema
 */
const pendingPaymentSchema = new Schema<IPendingPayment>(
  {
    // Firebase migration tracking
    firebaseId: {
      type: String,
      sparse: true,
      index: true,
    },

    // Contract & Job References
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
    proposalId: {
      type: Schema.Types.ObjectId,
      ref: 'JobProposal',
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

    // User References
    expertId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Idempotency key
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Stripe Payment Details
    paymentMethodId: {
      type: String,
      required: true,
    },
    stripeCustomerId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    stripeFee: {
      type: Number,
      default: 0,
    },
    grossAmount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: 'USD',
    },

    // Work Details (for hourly contracts)
    weekNumber: {
      type: Number,
    },
    year: {
      type: Number,
    },
    weekStartDate: {
      type: Date,
    },
    weekEndDate: {
      type: Date,
    },
    totalHours: {
      type: Number,
      required: true,
    },
    hourlyRate: {
      type: Number,
    },
    contractTitle: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },

    // Work Log References
    timelogEntryIds: {
      type: [Schema.Types.ObjectId],
      ref: 'TimelogEntry',
      default: [],
    },

    // Retry Configuration
    status: {
      type: String,
      enum: Object.values(PendingPaymentStatus),
      default: PendingPaymentStatus.PENDING,
      index: true,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 5,
    },
    nextRetryAt: {
      type: Date,
      required: true,
      index: true,
    },

    // Retry history
    retryHistory: {
      type: [retryAttemptSchema],
      default: [],
    },

    // Error Tracking
    lastError: {
      type: String,
    },
    lastAttempt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },

    // Success Tracking
    processedAt: {
      type: Date,
    },
    paymentIntentId: {
      type: String,
    },
    contractPaymentId: {
      type: Schema.Types.ObjectId,
      ref: 'ContractPayment',
    },
  },
  {
    timestamps: true,
    collection: 'pendingPayments',
  },
);

// Compound indexes for efficient job queries
pendingPaymentSchema.index({ status: 1, nextRetryAt: 1, retryCount: 1 });
pendingPaymentSchema.index({ contractId: 1, status: 1 });
pendingPaymentSchema.index({ clientId: 1, status: 1 });
pendingPaymentSchema.index({ expertId: 1, status: 1 });

export const PendingPayment: Model<IPendingPayment> = mongoose.model<IPendingPayment>(
  'PendingPayment',
  pendingPaymentSchema,
);
