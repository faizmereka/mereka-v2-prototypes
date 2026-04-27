import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Invitation link status enum
 */
export enum InvitationLinkStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  DISABLED = 'disabled',
}

/**
 * Invitation link document interface
 */
export interface IInvitationLink extends Document {
  hubId: mongoose.Types.ObjectId;
  roleIds: mongoose.Types.ObjectId[]; // Array of roles to assign on join
  token: string;
  maxUses?: number;
  usedCount: number;
  status: InvitationLinkStatus;
  createdBy: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Invitation link schema definition
 */
const invitationLinkSchema = new Schema<IInvitationLink>(
  {
    hubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
      index: true,
    },
    roleIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
      required: true,
      validate: {
        validator: (v: mongoose.Types.ObjectId[]) => v.length > 0,
        message: 'At least one role is required',
      },
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    maxUses: {
      type: Number,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(InvitationLinkStatus),
      default: InvitationLinkStatus.ACTIVE,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
invitationLinkSchema.index({ token: 1 }, { unique: true });
invitationLinkSchema.index({ hubId: 1, status: 1 });
invitationLinkSchema.index({ expiresAt: 1 }); // For cleanup cron

/**
 * Invitation link model
 */
export const InvitationLink = mongoose.model<IInvitationLink>(
  'InvitationLink',
  invitationLinkSchema,
);
