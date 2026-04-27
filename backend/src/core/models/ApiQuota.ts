import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

/**
 * API Quota Plan Tiers
 */
export enum QuotaPlan {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
  UNLIMITED = 'unlimited', // For internal/admin use
}

/**
 * Default quota limits per plan
 */
export const QUOTA_LIMITS: Record<
  QuotaPlan,
  { daily: number; monthly: number; perMinute: number }
> = {
  [QuotaPlan.FREE]: {
    daily: 1000,
    monthly: 10000,
    perMinute: 30,
  },
  [QuotaPlan.BASIC]: {
    daily: 5000,
    monthly: 50000,
    perMinute: 60,
  },
  [QuotaPlan.PREMIUM]: {
    daily: 20000,
    monthly: 200000,
    perMinute: 120,
  },
  [QuotaPlan.ENTERPRISE]: {
    daily: 100000,
    monthly: 1000000,
    perMinute: 300,
  },
  [QuotaPlan.UNLIMITED]: {
    daily: Number.MAX_SAFE_INTEGER,
    monthly: Number.MAX_SAFE_INTEGER,
    perMinute: Number.MAX_SAFE_INTEGER,
  },
};

/**
 * Quota Usage Interface
 */
export interface IQuotaUsage {
  daily: number;
  monthly: number;
  lastDailyReset: Date;
  lastMonthlyReset: Date;
}

/**
 * Quota Limits Interface
 */
export interface IQuotaLimits {
  requestsPerDay: number;
  requestsPerMonth: number;
  requestsPerMinute: number;
}

/**
 * API Quota Interface
 */
export interface IApiQuota extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  userEmail?: string;
  plan: QuotaPlan;
  limits: IQuotaLimits;
  usage: IQuotaUsage;
  isBlocked: boolean;
  blockedReason?: string;
  blockedAt?: Date;
  blockedUntil?: Date;
  warnings: number; // Number of times quota exceeded
  lastWarningAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * API Quota Schema
 */
const apiQuotaSchema = new Schema<IApiQuota>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    userEmail: {
      type: String,
      index: true,
    },
    plan: {
      type: String,
      enum: Object.values(QuotaPlan),
      default: QuotaPlan.FREE,
      index: true,
    },
    limits: {
      requestsPerDay: {
        type: Number,
        default: QUOTA_LIMITS[QuotaPlan.FREE].daily,
      },
      requestsPerMonth: {
        type: Number,
        default: QUOTA_LIMITS[QuotaPlan.FREE].monthly,
      },
      requestsPerMinute: {
        type: Number,
        default: QUOTA_LIMITS[QuotaPlan.FREE].perMinute,
      },
    },
    usage: {
      daily: {
        type: Number,
        default: 0,
      },
      monthly: {
        type: Number,
        default: 0,
      },
      lastDailyReset: {
        type: Date,
        default: Date.now,
      },
      lastMonthlyReset: {
        type: Date,
        default: Date.now,
      },
    },
    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    blockedReason: {
      type: String,
    },
    blockedAt: {
      type: Date,
    },
    blockedUntil: {
      type: Date,
    },
    warnings: {
      type: Number,
      default: 0,
    },
    lastWarningAt: {
      type: Date,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'apiQuotas',
  },
);

// Compound indexes
apiQuotaSchema.index({ plan: 1, isBlocked: 1 });
apiQuotaSchema.index({ 'usage.daily': 1, 'limits.requestsPerDay': 1 });

/**
 * Check if daily usage needs reset
 */
apiQuotaSchema.methods.shouldResetDaily = function (): boolean {
  const now = new Date();
  const lastReset = new Date(this.usage.lastDailyReset);
  return now.toDateString() !== lastReset.toDateString();
};

/**
 * Check if monthly usage needs reset
 */
apiQuotaSchema.methods.shouldResetMonthly = function (): boolean {
  const now = new Date();
  const lastReset = new Date(this.usage.lastMonthlyReset);
  return now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
};

export const ApiQuota: Model<IApiQuota> = mongoose.model<IApiQuota>('ApiQuota', apiQuotaSchema);
