import mongoose from 'mongoose';

/**
 * In-App Notification Status Enum
 */
export enum InAppNotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

/**
 * Notification Action Interface
 * Matches the template action structure
 */
export interface INotificationAction {
  label: string;
  type: 'primary' | 'secondary';
  url?: string;
  actionType?: string;
}

/**
 * In-App Notification Log Schema
 * Stores actual notification instances sent to users
 *
 * Renamed from Notification for clarity - this stores notification logs.
 *
 * Fields:
 * - userId: User receiving this notification
 * - hubId: Optional hub context for hub-level notifications
 * - templateId: Reference to notification template used
 * - title: Notification title/heading
 * - message: Notification message content
 * - image: Optional image/avatar for notification
 * - actions: Action buttons (from template or custom)
 * - data: Additional data payload
 * - status: Notification status (PENDING, SENT, DELIVERED, READ, FAILED)
 * - isRead: Whether user has read this notification
 * - readAt: When the notification was read
 * - sentAt: When the notification was sent
 */
const inAppNotificationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    hubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
      index: true,
      comment: 'Optional hub context for hub-level notifications',
    },
    templateId: {
      type: String,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      comment: 'Optional image/avatar for notification',
    },
    actions: [
      {
        label: { type: String, required: true },
        type: { type: String, enum: ['primary', 'secondary'], default: 'primary' },
        url: { type: String },
        actionType: { type: String },
      },
    ],
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      comment: 'Additional data payload',
    },
    status: {
      type: String,
      enum: Object.values(InAppNotificationStatus),
      default: InAppNotificationStatus.PENDING,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    sentAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'inAppNotificationLogs',
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        const { __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Indexes
inAppNotificationLogSchema.index({ userId: 1, createdAt: -1 });
inAppNotificationLogSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
inAppNotificationLogSchema.index({ userId: 1, status: 1 });
inAppNotificationLogSchema.index({ hubId: 1, createdAt: -1 });
inAppNotificationLogSchema.index({ createdAt: -1 });

/**
 * TypeScript Interface for InAppNotificationLog
 */
export interface IInAppNotificationLog extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  hubId?: mongoose.Types.ObjectId;
  templateId?: string;
  title: string;
  message: string;
  image?: string;
  actions?: INotificationAction[];
  data?: Record<string, unknown>;
  status: InAppNotificationStatus;
  isRead: boolean;
  readAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const InAppNotificationLog = mongoose.model<IInAppNotificationLog>(
  'InAppNotificationLog',
  inAppNotificationLogSchema,
);
