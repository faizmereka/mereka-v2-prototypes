import mongoose, { type Document, type Model, Schema } from 'mongoose';

/**
 * Rate Limit Configuration
 */
export interface IRateLimitConfig {
  skipPaths: string[];
  skipSuperAdmin: boolean;
  unauthenticated: {
    perMinute: number;
    perDay: number;
  };
  authenticated: {
    perMinute: number;
    perDay: number;
  };
}

/**
 * System Config Interface
 * Stores system-wide configuration (singleton document)
 */
export interface ISystemConfig extends Document {
  _id: string; // Fixed ID for singleton
  rateLimits: IRateLimitConfig;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Default rate limit configuration
 */
export const DEFAULT_RATE_LIMITS: IRateLimitConfig = {
  skipPaths: ['/health'],
  skipSuperAdmin: true,
  unauthenticated: { perMinute: 3000, perDay: 50000 },
  authenticated: { perMinute: 3000, perDay: 50000 },
};

/**
 * System Config Schema
 */
const systemConfigSchema = new Schema<ISystemConfig>(
  {
    _id: {
      type: String,
      default: 'system-config',
    },
    rateLimits: {
      skipPaths: {
        type: [String],
        default: DEFAULT_RATE_LIMITS.skipPaths,
      },
      skipSuperAdmin: {
        type: Boolean,
        default: DEFAULT_RATE_LIMITS.skipSuperAdmin,
      },
      unauthenticated: {
        perMinute: {
          type: Number,
          required: true,
          min: 1,
          default: DEFAULT_RATE_LIMITS.unauthenticated.perMinute,
        },
        perDay: {
          type: Number,
          required: true,
          min: 1,
          default: DEFAULT_RATE_LIMITS.unauthenticated.perDay,
        },
      },
      authenticated: {
        perMinute: {
          type: Number,
          required: true,
          min: 1,
          default: DEFAULT_RATE_LIMITS.authenticated.perMinute,
        },
        perDay: {
          type: Number,
          required: true,
          min: 1,
          default: DEFAULT_RATE_LIMITS.authenticated.perDay,
        },
      },
    },
    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'systemConfig',
  },
);

export const SystemConfig: Model<ISystemConfig> = mongoose.model<ISystemConfig>(
  'SystemConfig',
  systemConfigSchema,
);
