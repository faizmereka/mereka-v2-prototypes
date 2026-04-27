import mongoose from 'mongoose';
import type { IPreferenceItem } from './UserNotificationPreference';

/**
 * Summary Frequency Options
 */
export enum HubSummaryFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  NONE = 'none',
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
 * Hub Notification Preference Schema
 * Stores per-hub notification preferences
 *
 * How it works:
 * - No preference stored = Enabled (default)
 * - Explicit disable: { templateId: 'X', enabled: false }
 * - Lazy creation: Document created on first access
 * - Controls which roles receive notifications
 *
 * Fields:
 * - hubId: Reference to hub
 * - inApp: Per-template preferences for in-app notifications
 * - email: Per-template preferences for email notifications
 * - whatsApp: Per-template preferences for WhatsApp notifications
 * - notifyOwner: Whether to notify hub owner
 * - notifyAdmins: Whether to notify hub admins
 * - summaryFrequency: How often to receive summary emails
 */
const hubNotificationPreferenceSchema = new mongoose.Schema(
  {
    hubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
      unique: true,
      index: true,
      comment: 'Reference to hub',
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
    notifyOwner: {
      type: Boolean,
      default: true,
      comment: 'Whether to notify hub owner',
    },
    notifyAdmins: {
      type: Boolean,
      default: true,
      comment: 'Whether to notify hub admins',
    },
    summaryFrequency: {
      type: String,
      enum: Object.values(HubSummaryFrequency),
      default: HubSummaryFrequency.WEEKLY,
      comment: 'How often to receive summary emails',
    },
  },
  {
    timestamps: true,
    collection: 'hubNotificationPreferences',
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        const { __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Indexes
hubNotificationPreferenceSchema.index({ hubId: 1 }, { unique: true });

/**
 * TypeScript Interface for HubNotificationPreference
 */
export interface IHubNotificationPreference extends mongoose.Document {
  hubId: mongoose.Types.ObjectId;
  inApp: IPreferenceItem[];
  email: IPreferenceItem[];
  whatsApp: IPreferenceItem[];
  notifyOwner: boolean;
  notifyAdmins: boolean;
  summaryFrequency: HubSummaryFrequency;
  createdAt: Date;
  updatedAt: Date;
}

export const HubNotificationPreference = mongoose.model<IHubNotificationPreference>(
  'HubNotificationPreference',
  hubNotificationPreferenceSchema,
);
