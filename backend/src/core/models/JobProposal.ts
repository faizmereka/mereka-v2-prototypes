import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Price type enum for proposals
 */
export enum PriceType {
  FIXED = 'fixed',
  HOURLY = 'hourly',
}

/**
 * Proposal status enum
 */
export enum ProposalStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

/**
 * Proposal Milestone interface
 */
export interface IProposalMilestone {
  taskName: string;
  taskDescription?: string;
  amount: number;
  dueDate?: Date;
  order: number;
}

/**
 * Job Proposal document interface
 */
export interface IJobProposal extends Document {
  jobId: mongoose.Types.ObjectId; // Reference to Job
  proposalDetails: string; // Cover letter/description (max 2000 chars)
  priceType: PriceType; // Fixed or hourly pricing

  // Pricing fields
  proposedPrice?: number; // For fixed price contracts
  hourlyProposedPrice?: number; // For hourly contracts
  workingHours?: number; // Estimated hours for hourly contracts

  // Milestones for fixed price proposals
  hasMilestones?: boolean; // Whether proposal has milestone breakdown
  milestones?: IProposalMilestone[]; // Milestone breakdown

  selectedCurrency: string; // Currency code (e.g., 'MYR', 'USD')
  files: string[]; // Uploaded file URLs

  // User references
  createdBy: mongoose.Types.ObjectId; // User who submitted the proposal
  asssignedExpertId: mongoose.Types.ObjectId; // Expert who will work on the job

  // Hub references
  clientHubId: mongoose.Types.ObjectId; // Hub that posted the job (employer)
  expertHubId?: mongoose.Types.ObjectId; // Hub the expert belongs to (employee/service provider)

  status: ProposalStatus; // Current status of the proposal
  contractId?: mongoose.Types.ObjectId; // Reference to Contract when accepted

  // Review tracking
  isReviewFromClient: boolean; // Has client reviewed this proposal
  isReviewFromExpert: boolean; // Has expert reviewed (after contract completion)

  createdAt: Date;
  updatedAt: Date;

  // Migration tracking
  firebaseId?: string;
}

/**
 * Job Proposal Schema
 */
const jobProposalSchema = new Schema<IJobProposal>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    proposalDetails: {
      type: String,
      required: true,
      maxlength: 2000,
      trim: true,
    },
    priceType: {
      type: String,
      enum: Object.values(PriceType),
      required: true,
      index: true,
    },
    proposedPrice: {
      type: Number,
      min: 0,
      // Required if priceType is 'fixed' (validated in schema pre-save hook)
    },
    hourlyProposedPrice: {
      type: Number,
      min: 0,
      // Required if priceType is 'hourly' (validated in schema pre-save hook)
    },
    workingHours: {
      type: Number,
      min: 0,
      // Required if priceType is 'hourly' (validated in schema pre-save hook)
    },
    hasMilestones: {
      type: Boolean,
      default: false,
    },
    milestones: [
      {
        taskName: { type: String, required: true, maxlength: 150 },
        taskDescription: { type: String, maxlength: 500 },
        amount: { type: Number, required: true, min: 0 },
        dueDate: { type: Date },
        order: { type: Number, default: 0 },
      },
    ],
    selectedCurrency: {
      type: String,
      required: true,
      uppercase: true,
      default: 'MYR',
    },
    files: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    asssignedExpertId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
    status: {
      type: String,
      enum: Object.values(ProposalStatus),
      default: ProposalStatus.PENDING,
      index: true,
    },
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      index: true,
    },
    isReviewFromClient: {
      type: Boolean,
      default: false,
    },
    isReviewFromExpert: {
      type: Boolean,
      default: false,
    },

    // Migration tracking
    firebaseId: {
      type: String,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
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
// Compound index for querying proposals by job and status
jobProposalSchema.index({ jobId: 1, status: 1 });

// Index for querying expert's proposals
jobProposalSchema.index({ asssignedExpertId: 1, status: 1 });

// Index for querying proposals by client hub
jobProposalSchema.index({ clientHubId: 1, status: 1 });

// Index for querying proposals by expert hub
jobProposalSchema.index({ expertHubId: 1, status: 1 });

// Unique compound index to prevent duplicate proposals
// (same expert cannot submit multiple proposals to same job)
jobProposalSchema.index({ jobId: 1, asssignedExpertId: 1 }, { unique: true });

/**
 * Pre-save hook for validation
 */
jobProposalSchema.pre('save', function (next) {
  // Validate pricing fields based on priceType
  if (this.priceType === PriceType.FIXED) {
    if (!this.proposedPrice || this.proposedPrice <= 0) {
      return next(new Error('proposedPrice is required for fixed price proposals'));
    }
  } else if (this.priceType === PriceType.HOURLY) {
    if (!this.hourlyProposedPrice || this.hourlyProposedPrice <= 0) {
      return next(new Error('hourlyProposedPrice is required for hourly proposals'));
    }
    if (!this.workingHours || this.workingHours <= 0) {
      return next(new Error('workingHours is required for hourly proposals'));
    }
  }

  next();
});

/**
 * Instance methods
 */

/**
 * Calculate total price for hourly proposals
 */
jobProposalSchema.methods.getTotalPrice = function (): number {
  if (this.priceType === PriceType.HOURLY && this.hourlyProposedPrice && this.workingHours) {
    return Number.parseFloat((this.hourlyProposedPrice * this.workingHours).toFixed(2));
  }
  return this.proposedPrice || 0;
};

/**
 * Check if proposal can be withdrawn
 */
jobProposalSchema.methods.canBeWithdrawn = function (): boolean {
  return this.status === ProposalStatus.PENDING;
};

/**
 * Check if proposal can be accepted
 */
jobProposalSchema.methods.canBeAccepted = function (): boolean {
  return this.status === ProposalStatus.PENDING;
};

/**
 * Static methods
 */

/**
 * Find proposals by job ID
 */
jobProposalSchema.statics.findByJobId = function (
  jobId: mongoose.Types.ObjectId | string,
  status?: ProposalStatus,
) {
  const query: Record<string, unknown> = { jobId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Find proposals by expert ID
 */
jobProposalSchema.statics.findByExpertId = function (
  expertId: mongoose.Types.ObjectId | string,
  status?: ProposalStatus,
) {
  const query: Record<string, unknown> = { asssignedExpertId: expertId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Find proposals by client hub ID
 */
jobProposalSchema.statics.findByClientHubId = function (
  clientHubId: mongoose.Types.ObjectId | string,
  status?: ProposalStatus,
) {
  const query: Record<string, unknown> = { clientHubId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Find proposals by expert hub ID
 */
jobProposalSchema.statics.findByExpertHubId = function (
  expertHubId: mongoose.Types.ObjectId | string,
  status?: ProposalStatus,
) {
  const query: Record<string, unknown> = { expertHubId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * Check if expert already submitted proposal for a job
 */
jobProposalSchema.statics.hasExistingProposal = async function (
  jobId: mongoose.Types.ObjectId | string,
  expertId: mongoose.Types.ObjectId | string,
): Promise<boolean> {
  const existing = await this.findOne({ jobId, asssignedExpertId: expertId });
  return !!existing;
};

/**
 * Export model
 */
export const JobProposal = mongoose.model<IJobProposal>('JobProposal', jobProposalSchema);
