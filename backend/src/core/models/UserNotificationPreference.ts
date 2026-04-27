import mongoose from 'mongoose';

/**
 * Summary Frequency Options
 */
export enum SummaryFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  NONE = 'none',
}

/**
 * Preference Item Interface
 * Stores enabled/disabled state for a specific template
 */
export interface IPreferenceItem {
  templateId: string;
  enabled: boolean;
}

/**
 * Preference Item Schema
 * Used for per-template preferences in each channel
 */
const preferenceItemSchema = new mongoose.Schema(
  {
    templateId: { type: String, required: true },
    enabled: { type: Boolean, default: true },
  },
  { _id: false },
);

/**
 * User Notification Preference Schema
 * Stores per-user notification preferences
 *
 * How it works:
 * - No preference stored = Enabled (default)
 * - Explicit disable: { templateId: 'X', enabled: false }
 * - Lazy creation: Document created on first access
 *
 * Fields:
 * - userId: Reference to user
 * - inApp: Per-template preferences for in-app notifications
 * - email: Per-template preferences for email notifications
 * - whatsApp: Per-template preferences for WhatsApp notifications
 * - summaryFrequency: How often to receive summary emails
 * - globalMute: Master switch to mute all notifications
 */
const userNotificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
      comment: 'Reference to user',
    },
    inApp: {
      type: [preferenceItemSchema],
      default: [],
      comment: 'Per-template preferences for in-app notifications',
    },
    email: {
      type: [preferenceItemSchema],
      default: [],
      comment: 'Per-template preferences for email notifications',
    },
    whatsApp: {
      type: [preferenceItemSchema],
      default: [],
      comment: 'Per-template preferences for WhatsApp notifications',
    },
    summaryFrequency: {
      type: String,
      enum: Object.values(SummaryFrequency),
      default: SummaryFrequency.WEEKLY,
      comment: 'How often to receive summary emails',
    },
    globalMute: {
      type: Boolean,
      default: false,
      comment: 'Master switch to mute all notifications',
    },
  },
  {
    timestamps: true,
    collection: 'userNotificationPreferences',
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        const { __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Indexes
userNotificationPreferenceSchema.index({ userId: 1 }, { unique: true });

/**
 * TypeScript Interface for UserNotificationPreference
 */
export interface IUserNotificationPreference extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  inApp: IPreferenceItem[];
  email: IPreferenceItem[];
  whatsApp: IPreferenceItem[];
  summaryFrequency: SummaryFrequency;
  globalMute: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const UserNotificationPreference = mongoose.model<IUserNotificationPreference>(
  'UserNotificationPreference',
  userNotificationPreferenceSchema,
);
