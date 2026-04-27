import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Bank approval status
 */
export enum BankApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * Bank Interface
 * Available banks for user bank account selection (by country)
 */
export interface IBank extends Document {
  name: string;
  routingNumber?: string; // SWIFT/BIC code or routing number
  logoUrl?: string;
  countryCode: string; // ISO 3166-1 alpha-2 (e.g., 'MY', 'SG', 'US')
  isActive: boolean;
  approvalStatus: BankApprovalStatus;
  createdBy?: string; // User ID who created this bank (for manual entries)
  approvedBy?: string; // Admin who approved
  approvedAt?: Date;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bank schema definition
 */
const bankSchema = new Schema<IBank>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    routingNumber: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    countryCode: {
      type: String,
      required: true,
      uppercase: true,
      minlength: 2,
      maxlength: 2,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: Object.values(BankApprovalStatus),
      default: BankApprovalStatus.APPROVED, // Admin-created banks are auto-approved
      index: true,
    },
    createdBy: {
      type: String,
      index: true,
    },
    approvedBy: {
      type: String,
    },
    approvedAt: {
      type: Date,
    },
    priority: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for performance
bankSchema.index({ countryCode: 1, isActive: 1, approvalStatus: 1, priority: -1 });
bankSchema.index({ countryCode: 1, name: 1 }, { unique: true });
bankSchema.index({ isActive: 1, approvalStatus: 1, priority: -1 });
bankSchema.index({ approvalStatus: 1, createdAt: -1 }); // For admin approval list

export const Bank = mongoose.model<IBank>('Bank', bankSchema);
