import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Timelog entry status enum
 */
export enum TimelogStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
}

/**
 * Payment status enum
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
}

/**
 * Timelog entry static methods interface
 */
export interface ITimelogEntryModel extends mongoose.Model<ITimelogEntry> {
  findByContractId(
    contractId: mongoose.Types.ObjectId | string,
    status?: TimelogStatus,
  ): Promise<ITimelogEntry[]>;
  findByExpertHubId(
    expertHubId: mongoose.Types.ObjectId | string,
    status?: TimelogStatus,
  ): Promise<ITimelogEntry[]>;
  findByDateRange(
    contractId: mongoose.Types.ObjectId | string,
    startDate: Date,
    endDate: Date,
  ): Promise<ITimelogEntry[]>;
  findByWeek(
    contractId: mongoose.Types.ObjectId | string,
    year: number,
    weekNumber: number,
  ): Promise<ITimelogEntry[]>;
  findByMonth(
    contractId: mongoose.Types.ObjectId | string,
    year: number,
    monthNumber: number,
  ): Promise<ITimelogEntry[]>;
  calculateWeeklyTotal(
    contractId: mongoose.Types.ObjectId | string,
    year: number,
    weekNumber: number,
  ): Promise<number>;
  calculateTotalBillable(
    contractId: mongoose.Types.ObjectId | string,
    status?: TimelogStatus,
  ): Promise<number>;
  checkWeeklyLimit(
    contractId: mongoose.Types.ObjectId | string,
    year: number,
    weekNumber: number,
    weeklyLimit: number,
  ): Promise<{ total: number; isExceeded: boolean; remaining: number }>;
}

/**
 * Timelog entry document interface
 */
export interface ITimelogEntry extends Document {
  // Firebase migration tracking
  firebaseId?: string; // Original Firebase document ID for migration

  // References
  contractId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;

  // Hub references (primary identifiers)
  clientHubId: mongoose.Types.ObjectId; // Hub that posted the job (employer)
  expertHubId: mongoose.Types.ObjectId; // Hub the expert belongs to

  // Payment reference
  paymentId?: mongoose.Types.ObjectId; // Reference to ContractPayment when paid

  // Date tracking
  workDate: Date;
  weekNumber: number;
  year: number;
  monthNumber: number;

  // Time tracking
  startTime: string;
  endTime: string;
  hoursWorked: number;
  breakDuration?: number;

  // Work details
  description: string;
  tasks: string[];

  // Contract terms at time of work
  hourlyRate: number;
  weeklyLimit: number;
  currency: string;

  // Payment calculation
  billableAmount: number;

  // Status workflow
  status: TimelogStatus;
  submittedDate?: Date;
  approvedDate?: Date;
  rejectedDate?: Date;
  paidDate?: Date;
  rejectionReason?: string;

  // Payment processing
  paymentIntentId?: string;
  paymentStatus: PaymentStatus;

  // Approval tracking
  approvedBy?: mongoose.Types.ObjectId;
  rejectedBy?: mongoose.Types.ObjectId;

  // Metadata
  createdBy: mongoose.Types.ObjectId;
  createdDate: Date;
  updatedDate: Date;

  // Instance methods
  canBeEdited(): boolean;
  canBeSubmitted(): boolean;
  canBeApproved(): boolean;
  canBeRejected(): boolean;
  canBeDeleted(): boolean;
  submit(expertId: mongoose.Types.ObjectId): Promise<ITimelogEntry>;
  approve(clientId: mongoose.Types.ObjectId): Promise<ITimelogEntry>;
  reject(clientId: mongoose.Types.ObjectId, reason: string): Promise<ITimelogEntry>;
}

/**
 * Timelog Entry Schema
 */
const timelogEntrySchema = new Schema<ITimelogEntry>(
  {
    // Firebase migration tracking
    firebaseId: {
      type: String,
      sparse: true,
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

    // Hub references (primary identifiers)
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

    // Payment reference
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'ContractPayment',
      index: true,
    },

    // Date tracking
    workDate: {
      type: Date,
      required: true,
      index: true,
    },
    weekNumber: {
      type: Number,
      required: false,
      default: 0,
      index: true,
    },
    year: {
      type: Number,
      required: false,
      default: 0,
      index: true,
    },
    monthNumber: {
      type: Number,
      required: false,
      default: 0,
      index: true,
    },

    // Time tracking
    startTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    hoursWorked: {
      type: Number,
      required: false,
      default: 0,
    },
    breakDuration: {
      type: Number,
      min: 0,
      max: 4,
    },

    // Work details
    description: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 1000,
      trim: true,
    },
    tasks: {
      type: [String],
      default: [],
      validate: {
        validator: (tasks: string[]) => tasks.length <= 20,
        message: 'Maximum 20 tasks allowed',
      },
    },

    // Contract terms
    hourlyRate: {
      type: Number,
      required: true,
      min: 0,
    },
    weeklyLimit: {
      type: Number,
      required: true,
      min: 1,
      max: 168,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      length: 3,
      default: 'MYR',
    },

    // Payment calculation
    billableAmount: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },

    // Status
    status: {
      type: String,
      enum: Object.values(TimelogStatus),
      default: TimelogStatus.DRAFT,
      index: true,
    },
    submittedDate: {
      type: Date,
    },
    approvedDate: {
      type: Date,
    },
    rejectedDate: {
      type: Date,
    },
    paidDate: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      maxlength: 500,
    },

    // Payment
    paymentIntentId: {
      type: String,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },

    // Approval tracking
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    // Metadata
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
 * Compound Indexes for efficient queries
 */

// Query by contract and date range
timelogEntrySchema.index({ contractId: 1, workDate: -1 });
timelogEntrySchema.index({ contractId: 1, status: 1 });

// Query by expert hub
timelogEntrySchema.index({ expertHubId: 1, workDate: -1 });
timelogEntrySchema.index({ expertHubId: 1, status: 1 });

// Query by client hub
timelogEntrySchema.index({ clientHubId: 1, status: 1 });

// Query by week/month/year
timelogEntrySchema.index({ contractId: 1, year: 1, weekNumber: 1 });
timelogEntrySchema.index({ contractId: 1, year: 1, monthNumber: 1 });

// Query by date and status
timelogEntrySchema.index({ workDate: -1, status: 1 });

// Payment tracking
timelogEntrySchema.index({ paymentIntentId: 1 });
timelogEntrySchema.index({ paymentStatus: 1 });

// UNIQUE constraint: One entry per contract per date per expert hub
timelogEntrySchema.index({ contractId: 1, expertHubId: 1, workDate: 1 }, { unique: true });

/**
 * Pre-save hook to calculate derived fields
 */
timelogEntrySchema.pre('save', function (next) {
  // Calculate hoursWorked from startTime and endTime if not provided
  if (!this.hoursWorked && this.startTime && this.endTime) {
    const startParts = this.startTime.split(':').map(Number);
    const endParts = this.endTime.split(':').map(Number);

    const startHour = startParts[0] ?? 0;
    const startMin = startParts[1] ?? 0;
    const endHour = endParts[0] ?? 0;
    const endMin = endParts[1] ?? 0;

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    let durationMinutes = endMinutes - startMinutes;

    // Handle overnight work (endTime < startTime)
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60;
    }

    // Subtract break duration
    if (this.breakDuration) {
      durationMinutes -= this.breakDuration * 60;
    }

    this.hoursWorked = Number((durationMinutes / 60).toFixed(2));
  }

  // Calculate billableAmount
  this.billableAmount = Number((this.hoursWorked * this.hourlyRate).toFixed(2));

  // Extract weekNumber, year, monthNumber from workDate if not provided
  if (this.workDate) {
    const date = new Date(this.workDate);

    if (!this.year) {
      this.year = date.getFullYear();
    }

    if (!this.monthNumber) {
      this.monthNumber = date.getMonth() + 1;
    }

    if (!this.weekNumber) {
      // Calculate ISO week number
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      this.weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }
  }

  next();
});

/**
 * Instance Methods
 */

/**
 * Check if entry can be edited
 */
timelogEntrySchema.methods.canBeEdited = function (): boolean {
  return this.status === TimelogStatus.DRAFT;
};

/**
 * Check if entry can be submitted
 */
timelogEntrySchema.methods.canBeSubmitted = function (): boolean {
  return this.status === TimelogStatus.DRAFT && this.hoursWorked > 0;
};

/**
 * Check if entry can be approved
 */
timelogEntrySchema.methods.canBeApproved = function (): boolean {
  return this.status === TimelogStatus.SUBMITTED;
};

/**
 * Check if entry can be rejected
 */
timelogEntrySchema.methods.canBeRejected = function (): boolean {
  return this.status === TimelogStatus.SUBMITTED;
};

/**
 * Check if entry can be deleted
 */
timelogEntrySchema.methods.canBeDeleted = function (): boolean {
  return this.status === TimelogStatus.DRAFT;
};

/**
 * Submit entry for approval
 */
timelogEntrySchema.methods.submit = function (expertId: mongoose.Types.ObjectId) {
  if (!this.canBeSubmitted()) {
    throw new Error('Timelog entry cannot be submitted');
  }

  this.status = TimelogStatus.SUBMITTED;
  this.submittedDate = new Date();
  this.createdBy = expertId;

  return this.save();
};

/**
 * Approve entry
 */
timelogEntrySchema.methods.approve = function (clientId: mongoose.Types.ObjectId) {
  if (!this.canBeApproved()) {
    throw new Error('Timelog entry cannot be approved');
  }

  this.status = TimelogStatus.APPROVED;
  this.approvedDate = new Date();
  this.approvedBy = clientId;

  return this.save();
};

/**
 * Reject entry
 */
timelogEntrySchema.methods.reject = function (clientId: mongoose.Types.ObjectId, reason: string) {
  if (!this.canBeRejected()) {
    throw new Error('Timelog entry cannot be rejected');
  }

  this.status = TimelogStatus.REJECTED;
  this.rejectedDate = new Date();
  this.rejectedBy = clientId;
  this.rejectionReason = reason;

  return this.save();
};

/**
 * Static Methods
 */

/**
 * Find entries by contract
 */
timelogEntrySchema.statics.findByContractId = function (
  contractId: mongoose.Types.ObjectId | string,
  status?: TimelogStatus,
) {
  const query: Record<string, unknown> = { contractId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ workDate: -1 });
};

/**
 * Find entries by expert hub
 */
timelogEntrySchema.statics.findByExpertHubId = function (
  expertHubId: mongoose.Types.ObjectId | string,
  status?: TimelogStatus,
) {
  const query: Record<string, unknown> = { expertHubId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ workDate: -1 });
};

/**
 * Find entries by date range
 */
timelogEntrySchema.statics.findByDateRange = function (
  contractId: mongoose.Types.ObjectId | string,
  startDate: Date,
  endDate: Date,
) {
  return this.find({
    contractId,
    workDate: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ workDate: 1 });
};

/**
 * Find entries by week
 */
timelogEntrySchema.statics.findByWeek = function (
  contractId: mongoose.Types.ObjectId | string,
  year: number,
  weekNumber: number,
) {
  return this.find({
    contractId,
    year,
    weekNumber,
  }).sort({ workDate: 1 });
};

/**
 * Find entries by month
 */
timelogEntrySchema.statics.findByMonth = function (
  contractId: mongoose.Types.ObjectId | string,
  year: number,
  monthNumber: number,
) {
  return this.find({
    contractId,
    year,
    monthNumber,
  }).sort({ workDate: 1 });
};

/**
 * Calculate total hours for a week
 */
timelogEntrySchema.statics.calculateWeeklyTotal = async function (
  contractId: mongoose.Types.ObjectId | string,
  year: number,
  weekNumber: number,
): Promise<number> {
  const result = await this.aggregate([
    {
      $match: {
        contractId: new mongoose.Types.ObjectId(contractId as string),
        year,
        weekNumber,
        status: { $in: [TimelogStatus.SUBMITTED, TimelogStatus.APPROVED, TimelogStatus.PAID] },
      },
    },
    {
      $group: {
        _id: null,
        totalHours: { $sum: '$hoursWorked' },
      },
    },
  ]);

  return result.length > 0 ? result[0].totalHours : 0;
};

/**
 * Calculate total billable amount for a contract
 */
timelogEntrySchema.statics.calculateTotalBillable = async function (
  contractId: mongoose.Types.ObjectId | string,
  status?: TimelogStatus,
): Promise<number> {
  const matchQuery: Record<string, unknown> = {
    contractId: new mongoose.Types.ObjectId(contractId as string),
  };

  if (status) {
    matchQuery.status = status;
  } else {
    matchQuery.status = { $in: [TimelogStatus.APPROVED, TimelogStatus.PAID] };
  }

  const result = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$billableAmount' },
      },
    },
  ]);

  return result.length > 0 ? result[0].totalAmount : 0;
};

/**
 * Check if weekly limit is exceeded
 */
timelogEntrySchema.statics.checkWeeklyLimit = async function (
  contractId: mongoose.Types.ObjectId | string,
  year: number,
  weekNumber: number,
  weeklyLimit: number,
): Promise<{ total: number; isExceeded: boolean; remaining: number }> {
  const model = this as unknown as ITimelogEntryModel;
  const total = await model.calculateWeeklyTotal(contractId, year, weekNumber);

  return {
    total,
    isExceeded: total > weeklyLimit,
    remaining: Math.max(0, weeklyLimit - total),
  };
};

/**
 * Export TimelogEntry model
 */
export const TimelogEntry = mongoose.model<ITimelogEntry, ITimelogEntryModel>(
  'TimelogEntry',
  timelogEntrySchema,
);
