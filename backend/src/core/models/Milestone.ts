import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Milestone status enum
 * Flow: pending → funded → work_submitted → released → completed
 *                              ↓              ↑
 *                       revision_requested ───┘
 */
export enum MilestoneStatus {
  PENDING = 'pending', // Not yet funded
  FUNDED = 'funded', // Payment held in escrow
  WORK_SUBMITTED = 'work_submitted', // Expert submitted work
  REVISION_REQUESTED = 'revision_requested', // Client requested changes
  RELEASED = 'released', // Work approved and payment released
  COMPLETED = 'completed', // Transfer to expert completed
  CANCELLED = 'cancelled', // Milestone cancelled
}

/**
 * Milestone old values interface (for change tracking)
 */
export interface IMilestoneOldValues {
  amount?: number;
  taskName?: string;
  taskDescription?: string;
  dueDate?: Date;
  workLogDescription?: string;
}

/**
 * Milestone change history interface
 */
export interface IMilestoneChange {
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  changedBy: mongoose.Types.ObjectId; // User who made the change
  changedDate: Date;
  changeReason?: string;
}

/**
 * Milestone document interface
 */
export interface IMilestone extends Document {
  _id: mongoose.Types.ObjectId;

  // Firebase migration tracking
  firebaseId?: string; // Original Firebase document ID for migration

  // References
  jobId: mongoose.Types.ObjectId; // Reference to Job
  jobProposalId: mongoose.Types.ObjectId; // Reference to JobProposal
  contractId?: mongoose.Types.ObjectId; // Reference to Contract (when accepted)
  hubId: mongoose.Types.ObjectId; // Reference to Agency/Hub

  // Milestone details
  taskName: string; // Task name (max 150 chars)
  taskDescription: string; // Task description (max 200 chars)
  amount: number; // Payment amount for this milestone
  dueDate: Date; // Due date for completion
  currency: string; // Currency code (e.g., 'MYR', 'USD')
  status: MilestoneStatus; // Current status
  order: number; // Display order within contract

  // Work submission
  workLogDescription?: string; // Work log when expert submits work
  workLogFilesUrl: string[]; // Uploaded work files
  workSubmittedDate?: Date; // Date when work was submitted

  // Payment tracking
  paymentIntentId?: string; // Stripe payment intent ID
  paymentId?: mongoose.Types.ObjectId; // Reference to ContractPayment
  fundedDate?: Date; // Date when milestone was funded
  releasedDate?: Date; // Date when payment was released
  releasedBy?: mongoose.Types.ObjectId; // User who released payment
  autoReleased?: boolean; // True if auto-released after 7 days

  // Approval tracking
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;

  // Revision tracking
  revisionCount: number; // Number of revision requests
  revisionNotes?: string; // Last revision request notes

  // Change tracking
  oldValues?: IMilestoneOldValues; // Previous values before last update
  changeHistory?: IMilestoneChange[]; // History of all changes
  lastModifiedBy?: mongoose.Types.ObjectId; // Last user who modified
  lastModifiedDate?: Date; // Last modification date

  // Metadata
  createdBy: mongoose.Types.ObjectId; // User who created the milestone
  createdDate: Date;
  updatedDate: Date;
}

/**
 * Milestone old values schema
 */
const milestoneOldValuesSchema = new Schema<IMilestoneOldValues>(
  {
    amount: Number,
    taskName: String,
    taskDescription: String,
    dueDate: Date,
    workLogDescription: String,
  },
  { _id: false },
);

/**
 * Milestone change history schema
 */
const milestoneChangeSchema = new Schema<IMilestoneChange>(
  {
    fieldName: {
      type: String,
      required: true,
    },
    oldValue: {
      type: Schema.Types.Mixed,
    },
    newValue: {
      type: Schema.Types.Mixed,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changedDate: {
      type: Date,
      default: Date.now,
    },
    changeReason: String,
  },
  { _id: false },
);

/**
 * Milestone Schema
 */
const milestoneSchema = new Schema<IMilestone>(
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
      index: true,
    },
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      index: true,
    },
    hubId: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
      required: true,
      index: true,
    },
    taskName: {
      type: String,
      required: true,
      maxlength: 150,
      trim: true,
    },
    taskDescription: {
      type: String,
      maxlength: 200,
      trim: true,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: 'MYR',
    },
    status: {
      type: String,
      enum: Object.values(MilestoneStatus),
      default: MilestoneStatus.PENDING,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    workLogDescription: {
      type: String,
      trim: true,
    },
    workLogFilesUrl: {
      type: [String],
      default: [],
    },
    workSubmittedDate: {
      type: Date,
    },
    paymentIntentId: {
      type: String,
      index: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'ContractPayment',
      index: true,
    },
    fundedDate: {
      type: Date,
    },
    releasedDate: {
      type: Date,
    },
    releasedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    autoReleased: {
      type: Boolean,
      default: false,
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    revisionCount: {
      type: Number,
      default: 0,
    },
    revisionNotes: {
      type: String,
      maxlength: 1000,
    },
    oldValues: {
      type: milestoneOldValuesSchema,
    },
    changeHistory: {
      type: [milestoneChangeSchema],
      default: [],
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedDate: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdDate: {
      type: Date,
      default: Date.now,
    },
    updatedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: 'createdDate', updatedAt: 'updatedDate' },
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
// Compound index for querying milestones by proposal and status
milestoneSchema.index({ jobProposalId: 1, status: 1 });

// Compound index for querying milestones by contract and status
milestoneSchema.index({ contractId: 1, status: 1 });

// Index for due date queries (upcoming milestones)
milestoneSchema.index({ dueDate: 1, status: 1 });

// Index for payment tracking
milestoneSchema.index({ paymentIntentId: 1 });

/**
 * Instance methods
 */

/**
 * Check if milestone can be edited
 */
milestoneSchema.methods.canBeEdited = function (): boolean {
  return [MilestoneStatus.FUNDED, MilestoneStatus.WORK_SUBMITTED].includes(this.status);
};

/**
 * Check if milestone can be deleted
 */
milestoneSchema.methods.canBeDeleted = function (): boolean {
  return this.status === MilestoneStatus.FUNDED && !this.workSubmittedDate;
};

/**
 * Check if work can be submitted
 */
milestoneSchema.methods.canSubmitWork = function (): boolean {
  return this.status === MilestoneStatus.FUNDED;
};

/**
 * Check if milestone can be approved
 */
milestoneSchema.methods.canBeApproved = function (): boolean {
  return this.status === MilestoneStatus.WORK_SUBMITTED;
};

/**
 * Check if milestone is overdue
 */
milestoneSchema.methods.isOverdue = function (): boolean {
  return this.status === MilestoneStatus.FUNDED && new Date() > new Date(this.dueDate);
};

/**
 * Static methods
 */

/**
 * Find milestones by proposal ID
 */
milestoneSchema.statics.findByProposalId = function (
  proposalId: mongoose.Types.ObjectId | string,
  status?: MilestoneStatus,
) {
  const query: Record<string, unknown> = { jobProposalId: proposalId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdDate: 1 });
};

/**
 * Find milestones by contract ID
 */
milestoneSchema.statics.findByContractId = function (
  contractId: mongoose.Types.ObjectId | string,
  status?: MilestoneStatus,
) {
  const query: Record<string, unknown> = { contractId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdDate: 1 });
};

/**
 * Find milestones by job ID
 */
milestoneSchema.statics.findByJobId = function (
  jobId: mongoose.Types.ObjectId | string,
  status?: MilestoneStatus,
) {
  const query: Record<string, unknown> = { jobId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ dueDate: 1 });
};

/**
 * Find upcoming milestones (due within next N days)
 */
milestoneSchema.statics.findUpcoming = function (
  proposalId: mongoose.Types.ObjectId | string,
  daysAhead: number = 7,
) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return this.find({
    jobProposalId: proposalId,
    status: MilestoneStatus.FUNDED,
    dueDate: { $lte: futureDate },
  }).sort({ dueDate: 1 });
};

/**
 * Find overdue milestones
 */
milestoneSchema.statics.findOverdue = function (proposalId: mongoose.Types.ObjectId | string) {
  return this.find({
    jobProposalId: proposalId,
    status: MilestoneStatus.FUNDED,
    dueDate: { $lt: new Date() },
  }).sort({ dueDate: 1 });
};

/**
 * Calculate total milestone amount for a proposal
 */
milestoneSchema.statics.calculateTotalAmount = async function (
  proposalId: mongoose.Types.ObjectId | string,
): Promise<number> {
  const result = await this.aggregate([
    {
      $match: {
        jobProposalId: new mongoose.Types.ObjectId(proposalId as string),
        status: { $ne: MilestoneStatus.CANCELLED },
      },
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
      },
    },
  ]);

  return result.length > 0 ? result[0].totalAmount : 0;
};

/**
 * Export model
 */
export const Milestone = mongoose.model<IMilestone>('Milestone', milestoneSchema);
