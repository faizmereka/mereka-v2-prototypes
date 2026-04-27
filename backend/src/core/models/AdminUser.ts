import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Admin role enum - different levels of admin access
 */
export enum AdminRole {
  SUPER_ADMIN = 'superAdmin', // Full platform access
  PLATFORM_ADMIN = 'platformAdmin', // Limited admin access
}

/**
 * Admin status enum
 */
export enum AdminStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

/**
 * AdminUser document interface
 */
export interface IAdminUser extends Document {
  email: string;
  password: string;
  name: string;
  role: AdminRole;
  status: AdminStatus;

  // Security features
  mfaEnabled: boolean;
  mfaSecret?: string;
  mfaBackupCodes?: string[];

  // Login tracking & brute force protection
  loginAttempts: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  lastLoginIp?: string;

  // Session management
  refreshTokens: string[];

  // Password management
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  requirePasswordChange: boolean;

  // IP restriction (optional)
  ipWhitelist?: string[];

  // Audit trail
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Methods
  isLocked(): boolean;
}

/**
 * AdminUser schema definition
 */
const adminUserSchema = new Schema<IAdminUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Don't include in queries by default
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    role: {
      type: String,
      enum: Object.values(AdminRole),
      default: AdminRole.PLATFORM_ADMIN,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(AdminStatus),
      default: AdminStatus.ACTIVE,
    },

    // Security features
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaSecret: {
      type: String,
      select: false,
    },
    mfaBackupCodes: {
      type: [String],
      select: false,
    },

    // Login tracking & brute force protection
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
    },
    lastLoginAt: {
      type: Date,
    },
    lastLoginIp: {
      type: String,
    },

    // Session management
    refreshTokens: {
      type: [String],
      default: [],
      select: false,
    },

    // Password management
    passwordChangedAt: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    requirePasswordChange: {
      type: Boolean,
      default: false,
    },

    // IP restriction (optional)
    ipWhitelist: {
      type: [String],
      default: [],
    },

    // Audit trail
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
    },
  },
  {
    timestamps: true,
    collection: 'adminUsers',
    toJSON: {
      transform: (_doc, ret) => {
        // Remove sensitive fields from JSON output
        const {
          password: _password,
          mfaSecret: _mfaSecret,
          mfaBackupCodes: _mfaBackupCodes,
          refreshTokens: _refreshTokens,
          passwordResetToken: _passwordResetToken,
          __v: _v,
          ...rest
        } = ret;
        return rest;
      },
    },
    toObject: {
      transform: (_doc, ret) => {
        const {
          password: _password,
          mfaSecret: _mfaSecret,
          mfaBackupCodes: _mfaBackupCodes,
          refreshTokens: _refreshTokens,
          passwordResetToken: _passwordResetToken,
          __v: _v,
          ...rest
        } = ret;
        return rest;
      },
    },
  },
);

// Indexes
adminUserSchema.index({ status: 1 });
adminUserSchema.index({ role: 1 });
adminUserSchema.index({ createdAt: -1 });

// Methods
adminUserSchema.methods.isLocked = function (): boolean {
  return !!(this.lockedUntil && this.lockedUntil > new Date());
};

/**
 * AdminUser model
 */
export const AdminUser = mongoose.model<IAdminUser>('AdminUser', adminUserSchema);
