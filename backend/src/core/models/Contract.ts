import mongoose, { type Document } from 'mongoose';
import type { PriceType } from './JobProposal';

const { Schema } = mongoose;

/**
 * Contract status enum
 */
export enum ContractStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
}

/**
 * Terms update status enum
 */
export enum TermsUpdateStatus {
  PENDING = 'pending',
  APPLIED = 'applied',
  CANCELLED = 'cancelled',
}

/**
 * Pending terms update interface (for hourly contracts)
 */
export interface IPendingTermsUpdate {
  weeklyLimit: number; // New weekly hour limit
  hourlyRate: number; // New hourly rate
  requestedDate: Date; // When the change was requested
  effectiveDate: Date; // When the change should take effect
  requestedBy: mongoose.Types.ObjectId; // User who requested the change
  status: TermsUpdateStatus; // Status of the update request
  appliedDate?: Date; // When the change was applied
}

/**
 * Status change history interface
 */
export interface IStatusChange {
  from: ContractStatus | null;
  to: ContractStatus;
  changedBy: mongoose.Types.ObjectId;
  changedAt: Date;
  reason?: string;
}

/**
 * Contract document interface
 */
export interface IContract extends Document {
  _id: mongoose.Types.ObjectId;

  // Firebase migration tracking
  firebaseId?: string; // Original Firebase document ID for migration

  // References
  jobId: mongoose.Types.ObjectId; // Reference to Job
  jobProposalId: mongoose.Types.ObjectId; // Reference to JobProposal

  // Hub references
  clientHubId: mongoose.Types.ObjectId; // Hub that posted the job (employer)
  expertHubId?: mongoose.Types.ObjectId; // Hub the expert belongs to (employee/service provider)

  // Contract details
  contractTitle: string; // Contract title (max 70 chars)
  contractDescription: string; // Contract description (max 5000 chars)
  contractUploads: string[]; // Uploaded contract files

  // Pricing
  priceType: PriceType; // Fixed or hourly
  proposedPrice?: number; // For fixed price contracts
  hourlyProposedPrice?: number; // For hourly contracts
  weeklyLimit?: number; // Weekly hour limit for hourly (max 168)
  hasMilestones: boolean; // Whether contract has milestones

  selectedCurrency: string; // Currency code (e.g., 'MYR', 'USD')

  // Timeline
  startDate: Date; // Contract start date
  endDate?: Date; // Contract end date (when completed)
  status: ContractStatus; // Current status

  // User references
  asssignedExpertId: mongoose.Types.ObjectId; // Expert assigned to contract
  createdBy: mongoose.Types.ObjectId; // Client who created contract

  // Stripe payment information
  stripeCustomerId?: string; // Stripe customer ID
  stripeAccount?: string; // Stripe connected account ID
  paymentMethodId?: string; // Stripe payment method ID

  // Terms update (for hourly contracts)
  pendingTermsUpdate?: IPendingTermsUpdate;

  // Status history tracking
  statusHistory: IStatusChange[];

  // Acceptance/Decline tracking
  acceptMessage?: string;
  acceptedAt?: Date;
  declineReason?: string;
  declinedAt?: Date;

  // Version for optimistic locking
  version: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Status change history schema
 */
const statusChangeSchema = new Schema<IStatusChange>(
  {
    from: {
      type: String,
      enum: [...Object.values(ContractStatus), null],
      default: null,
    },
    to: {
      type: String,
      enum: Object.values(ContractStatus),
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
      maxlength: 500,
    },
  },
  { _id: false },
);

/**
 * Pending terms update schema
 */
const pendingTermsUpdateSchema = new Schema<IPendingTermsUpdate>(
  {
    weeklyLimit: {
      type: Number,
      required: true,
      min: 1,
      max: 168,
    },
    hourlyRate: {
      type: Number,
      required: true,
      min: 0,
    },
    requestedDate: {
      type: Date,
      default: Date.now,
    },
    effectiveDate: {
      type: Date,
      required: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TermsUpdateStatus),
      default: TermsUpdateStatus.PENDING,
    },
    appliedDate: {
      type: Date,
    },
  },
  { _id: false },
);

/**
 * Contract Schema
 */
const contractSchema = new Schema<IContract>(
  {
    // Firebase migration tracking
    firebaseId: {
      type: String,
      sparse: true,
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    jobProposalId: {
      type: Schema.Types.ObjectId,
      ref: 'JobProposal',
      required: true,
      unique: true,
      index: true,
    },
    clientHubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
      index: true,
    },
    expertHubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      index: true,
    },
    contractTitle: {
      type: String,
      required: true,
      maxlength: 70,
      trim: true,
    },
    contractDescription: {
      type: String,
      required: true,
      maxlength: 5000,
      trim: true,
    },
    contractUploads: {
      type: [String],
      default: [],
    },
    priceType: {
      type: String,
      enum: ['fixed', 'hourly'],
      required: true,
      index: true,
    },
    proposedPrice: {
      type: Number,
      min: 0,
    },
    hourlyProposedPrice: {
      type: Number,
      min: 0,
    },
    weeklyLimit: {
      type: Number,
      min: 1,
      max: 168,
    },
    hasMilestones: {
      type: Boolean,
      default: false,
    },
    selectedCurrency: {
      type: String,
      required: true,
      uppercase: true,
      default: 'MYR',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(ContractStatus),
      default: ContractStatus.PENDING,
      index: true,
    },
    asssignedExpertId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    stripeCustomerId: {
      type: String,
      index: true,
    },
    stripeAccount: {
      type: String,
    },
    paymentMethodId: {
      type: String,
    },
    pendingTermsUpdate: {
      type: pendingTermsUpdateSchema,
    },

    // Status history tracking
    statusHistory: {
      type: [statusChangeSchema],
      default: [],
    },

    // Acceptance/Decline tracking
    acceptMessage: {
      type: String,
      maxlength: 1000,
    },
    acceptedAt: {
      type: Date,
    },
    declineReason: {
      type: String,
      maxlength: 1000,
    },
    declinedAt: {
      type: Date,
    },

    // Version for optimistic locking
    version: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true, // Enable mongoose optimistic locking
    toJSON: {
      transform: (_doc, ret) => {
        const { __v, ...rest } = ret;
        return rest;
      },
    },
  },
);

/**
 * Indexes
 */
// Compound index for querying contracts by client hub and status
contractSchema.index({ clientHubId: 1, status: 1 });

// Compound index for querying contracts by expert hub and status
contractSchema.index({ expertHubId: 1, status: 1 });

// Compound index for querying contracts by expert and status
contractSchema.index({ asssignedExpertId: 1, status: 1 });

// Compound index for querying contracts by client and status
contractSchema.index({ createdBy: 1, status: 1 });

// Index for job contracts
contractSchema.index({ jobId: 1, status: 1 });

/**
 * Pre-save hook for validation
 */
contractSchema.pre('save', function (next) {
  // Validate pricing fields based on priceType
  if (this.priceType === 'fixed') {
    if (!this.proposedPrice || this.proposedPrice <= 0) {
      return next(new Error('proposedPrice is required for fixed price contracts'));
    }
  } else if (this.priceType === 'hourly') {
    if (!this.hourlyProposedPrice || this.hourlyProposedPrice <= 0) {
      return next(new Error('hourlyProposedPrice is required for hourly contracts'));
    }
  }

  next();
});

/**
 * Instance methods
 */

/**
 * Check if contract is active
 */
contractSchema.methods.isActive = function (): boolean {
  return this.status === ContractStatus.ACTIVE;
};

/**
 * Check if contract can be cancelled
 */
contractSchema.methods.canBeCancelled = function (): boolean {
  return [ContractStatus.PENDING, ContractStatus.ACTIVE, ContractStatus.PAUSED].includes(
    this.status,
  );
};

/**
 * Check if contract can be paused
 */
contractSchema.methods.canBePaused = function (): boolean {
  return this.status === ContractStatus.ACTIVE;
};

/**
 * Check if contract can be resumed
 */
contractSchema.methods.canBeResumed = function (): boolean {
  return this.status === ContractStatus.PAUSED;
};

/**
 * Static methods
 */

/**
 * Find contracts by client hub ID
 */
contractSchema.statics.findByClientHubId = function (
  clientHubId: mongoose.Types.ObjectId | string,
  status?: ContractStatus,
  limit?: number,
) {
  const query: Record<string, unknown> = { clientHubId };
  if (status) {
    query.status = status;
  }
  const queryBuilder = this.find(query).sort({ createdAt: -1 });
  if (limit) {
    queryBuilder.limit(limit);
  }
  return queryBuilder;
};

/**
 * Find contracts by expert hub ID
 */
contractSchema.statics.findByExpertHubId = function (
  expertHubId: mongoose.Types.ObjectId | string,
  status?: ContractStatus,
  limit?: number,
) {
  const query: Record<string, unknown> = { expertHubId };
  if (status) {
    query.status = status;
  }
  const queryBuilder = this.find(query).sort({ createdAt: -1 });
  if (limit) {
    queryBuilder.limit(limit);
  }
  return queryBuilder;
};

/**
 * Find contracts by expert ID
 */
contractSchema.statics.findByExpertId = function (
  expertId: mongoose.Types.ObjectId | string,
  status?: ContractStatus,
) {
  const query: Record<string, unknown> = { asssignedExpertId: expertId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Find contracts by client ID
 */
contractSchema.statics.findByClientId = function (
  clientId: mongoose.Types.ObjectId | string,
  status?: ContractStatus,
) {
  const query: Record<string, unknown> = { createdBy: clientId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Find contracts by job ID
 */
contractSchema.statics.findByJobId = function (
  jobId: mongoose.Types.ObjectId | string,
  status?: ContractStatus,
) {
  const query: Record<string, unknown> = { jobId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Export model
 */
export const Contract = mongoose.model<IContract>('Contract', contractSchema);
