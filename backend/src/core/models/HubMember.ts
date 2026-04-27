import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Hub member status enum
 */
export enum HubMemberStatus {
  ACTIVE = 'active', // Active member with full role permissions
  INVITED = 'invited', // Invited but not yet accepted
  SUSPENDED = 'suspended', // Temporarily suspended
  LEFT = 'left', // Member left the hub
}

/**
 * Hub member document interface
 */
export interface IHubMember extends Document {
  // Relationships
  hubId: mongoose.Types.ObjectId; // Reference to Hub
  userId?: mongoose.Types.ObjectId; // Reference to User (optional for email invitations)

  // Roles (Reference to Role collection) - User can have multiple roles in same hub
  roleIds: mongoose.Types.ObjectId[]; // Array of Role references

  // Custom permissions (overrides role permissions when set)
  permissions?: string[]; // If set, these override the default role permissions

  // Status
  status: HubMemberStatus;

  // Invitation & Joining
  invitedBy?: mongoose.Types.ObjectId; // User who invited this member
  invitedAt?: Date;
  joinedAt?: Date;
  invitationToken?: string; // For email invitation links
  invitationExpiry?: Date;
  invitedEmail?: string; // Email address the invitation was sent to (for users who don't exist yet)

  // Metadata
  title?: string; // Job title/position within the hub (e.g., "Community Manager")
  department?: string; // Optional department/team

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Hub member schema definition
 */
const hubMemberSchema = new Schema<IHubMember>(
  {
    // Relationships
    hubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Optional for email invitations (invited status)
      index: true,
    },

    // Roles (Reference to Role collection) - User can have multiple roles in same hub
    roleIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
      required: true,
      default: [],
      validate: {
        validator: (v: mongoose.Types.ObjectId[]) => v.length > 0,
        message: 'At least one role is required',
      },
    },

    // Custom permissions (overrides role permissions when set)
    permissions: {
      type: [String],
      default: undefined, // Don't set empty array by default, use undefined to indicate "use role permissions"
    },

    // Status
    status: {
      type: String,
      enum: Object.values(HubMemberStatus),
      required: true,
      default: HubMemberStatus.ACTIVE,
    },

    // Invitation & Joining
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    invitedAt: {
      type: Date,
    },
    joinedAt: {
      type: Date,
    },
    invitationToken: {
      type: String,
      select: false, // Don't include in queries by default
    },
    invitationExpiry: {
      type: Date,
    },
    invitedEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },

    // Metadata
    title: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    department: {
      type: String,
      trim: true,
      maxlength: 100,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        const { invitationToken: _token, __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Compound Indexes for performance
// Use partial index to allow multiple invitations with null userId (pending email invitations)
// Only enforce uniqueness when userId is an actual ObjectId (not null)
hubMemberSchema.index(
  { hubId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } },
);
hubMemberSchema.index({ hubId: 1, status: 1 }); // Find active members of a hub
hubMemberSchema.index({ userId: 1, status: 1 }); // Find user's active hub memberships
hubMemberSchema.index({ hubId: 1, roleIds: 1 }); // Find members by role
hubMemberSchema.index({ invitationToken: 1 }, { sparse: true }); // For invitation lookups

/**
 * Hub member model
 */
export const HubMember = mongoose.model<IHubMember>('HubMember', hubMemberSchema);
