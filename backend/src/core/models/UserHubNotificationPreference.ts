import mongoose from 'mongoose';

/**
 * Channel Preference Item
 * Stores preference for a specific template in a channel
 */
interface IChannelPreferenceItem {
  templateId: string;
  enabled: boolean;
}

/**
 * User Hub Notification Preference Schema
 *
 * Allows users to customize notification preferences per hub they belong to.
 *
 * Use Cases:
 * - User is member of 3 hubs, wants to mute notifications from 1 hub
 * - User wants email for Hub A, but only in-app for Hub B
 * - User wants to disable specific notification types for certain hubs
 *
 * Preference Resolution Order:
 * 1. Check Template (is active? is user in targetUserTypes?)
 * 2. Check Hub Preferences (HubNotificationPreference - is template enabled for hub?)
 * 3. Check User-Hub Preferences (this model - did user customize for this hub?)
 * 4. Check User Preferences (UserNotificationPreference - global user settings)
 * 5. Send via enabled channels
 */
const userHubNotificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      comment: 'Reference to the user',
    },
    hubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
      index: true,
      comment: 'Reference to the hub',
    },

    /**
     * Mute all notifications from this hub
     * When true, no notifications from this hub will be sent to the user
     */
    muteAll: {
      type: Boolean,
      default: false,
      comment: 'Mute all notifications from this hub',
    },

    /**
     * In-App notification preferences for this hub
     * Array of template-specific preferences
     */
    inApp: [
      {
        templateId: {
          type: String,
          required: true,
          comment: 'Template ID (e.g., BOOKING_CONFIRMED_LEARNER)',
        },
        enabled: {
          type: Boolean,
          default: true,
          comment: 'Whether this notification is enabled',
        },
      },
    ],

    /**
     * Email notification preferences for this hub
     * Array of template-specific preferences
     */
    email: [
      {
        templateId: {
          type: String,
          required: true,
          comment: 'Template ID (e.g., BOOKING_CONFIRMED_LEARNER)',
        },
        enabled: {
          type: Boolean,
          default: true,
          comment: 'Whether this notification is enabled',
        },
      },
    ],

    /**
     * WhatsApp notification preferences for this hub
     * Array of template-specific preferences
     */
    whatsApp: [
      {
        templateId: {
          type: String,
          required: true,
          comment: 'Template ID (e.g., BOOKING_CONFIRMED_LEARNER)',
        },
        enabled: {
          type: Boolean,
          default: true,
          comment: 'Whether this notification is enabled',
        },
      },
    ],

    /**
     * Category-level mute settings
     * Allows muting entire categories (e.g., mute all 'promotions' from this hub)
     */
    mutedCategories: {
      type: [String],
      default: [],
      comment: 'Categories to mute for this hub (e.g., ["promotions", "chats"])',
    },
  },
  {
    timestamps: true,
    collection: 'userHubNotificationPreferences',
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        const { __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Compound unique index - one preference document per user-hub combination
userHubNotificationPreferenceSchema.index({ userId: 1, hubId: 1 }, { unique: true });

// Index for querying all preferences for a user
userHubNotificationPreferenceSchema.index({ userId: 1 });

// Index for querying all preferences for a hub
userHubNotificationPreferenceSchema.index({ hubId: 1 });

// Index for finding muted hubs
userHubNotificationPreferenceSchema.index({ userId: 1, muteAll: 1 });

/**
 * TypeScript Interface for UserHubNotificationPreference
 */
export interface IUserHubNotificationPreference extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  hubId: mongoose.Types.ObjectId;
  muteAll: boolean;
  inApp: IChannelPreferenceItem[];
  email: IChannelPreferenceItem[];
  whatsApp: IChannelPreferenceItem[];
  mutedCategories: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input type for creating/updating preferences
 */
export interface UserHubNotificationPreferenceInput {
  userId: string;
  hubId: string;
  muteAll?: boolean;
  inApp?: IChannelPreferenceItem[];
  email?: IChannelPreferenceItem[];
  whatsApp?: IChannelPreferenceItem[];
  mutedCategories?: string[];
}

/**
 * Channel preference item type export
 */
export type { IChannelPreferenceItem };

export const UserHubNotificationPreference = mongoose.model<IUserHubNotificationPreference>(
  'UserHubNotificationPreference',
  userHubNotificationPreferenceSchema,
);
