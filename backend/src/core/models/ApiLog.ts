import mongoose, { type Document, type Model, Schema, type Types } from 'mongoose';

/**
 * API Log Level
 */
export enum ApiLogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * API Module (for categorizing logs by source)
 */
export enum ApiModule {
  AUTH = 'auth',
  WEB = 'web',
  ADMIN = 'admin',
  HUB = 'hub',
  PAYMENTS = 'payments',
  OTHER = 'other',
}

/**
 * API Log Interface
 * Tracks all API requests for monitoring, debugging, and security auditing
 */
export interface IApiLog extends Document {
  _id: Types.ObjectId;
  requestId: string;
  userId?: Types.ObjectId;
  userEmail?: string;
  method: string;
  path: string;
  route?: string; // Route pattern e.g., /api/v1/users/:id
  module: ApiModule; // Module categorization (auth, web, admin, hub, payments, other)
  statusCode: number;
  responseTime: number; // milliseconds
  ip: string;
  userAgent?: string;
  referer?: string;
  query?: Record<string, unknown>;
  // Note: We don't log request body for security (passwords, tokens, etc.)
  contentLength?: number;
  responseSize?: number;
  level: ApiLogLevel;
  errorCode?: string;
  errorMessage?: string;
  tags?: string[]; // Custom tags for categorization
  metadata?: Record<string, unknown>; // Additional context
  createdAt: Date;
}

/**
 * API Log Schema
 */
const apiLogSchema = new Schema<IApiLog>(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    userEmail: {
      type: String,
      index: true,
    },
    method: {
      type: String,
      required: true,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      index: true,
    },
    path: {
      type: String,
      required: true,
      index: true,
    },
    route: {
      type: String,
      index: true,
    },
    module: {
      type: String,
      enum: Object.values(ApiModule),
      default: ApiModule.OTHER,
      index: true,
    },
    statusCode: {
      type: Number,
      required: true,
      index: true,
    },
    responseTime: {
      type: Number,
      required: true,
    },
    ip: {
      type: String,
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
    },
    referer: {
      type: String,
    },
    query: {
      type: Schema.Types.Mixed,
    },
    contentLength: {
      type: Number,
    },
    responseSize: {
      type: Number,
    },
    level: {
      type: String,
      enum: Object.values(ApiLogLevel),
      default: ApiLogLevel.INFO,
      index: true,
    },
    errorCode: {
      type: String,
      index: true,
    },
    errorMessage: {
      type: String,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only createdAt needed
    collection: 'apiLogs',
  },
);

// Compound indexes for common queries
apiLogSchema.index({ userId: 1, createdAt: -1 });
apiLogSchema.index({ path: 1, method: 1, createdAt: -1 });
apiLogSchema.index({ statusCode: 1, createdAt: -1 });
apiLogSchema.index({ ip: 1, createdAt: -1 });
apiLogSchema.index({ level: 1, createdAt: -1 });
apiLogSchema.index({ module: 1, createdAt: -1 }); // Filter by module

// TTL index - auto-delete logs older than 30 days (backup to cron job)
apiLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Text index for searching error messages
apiLogSchema.index({ errorMessage: 'text', path: 'text' });

export const ApiLog: Model<IApiLog> = mongoose.model<IApiLog>('ApiLog', apiLogSchema);
