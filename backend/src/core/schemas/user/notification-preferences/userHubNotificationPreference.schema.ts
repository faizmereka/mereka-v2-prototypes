/**
 * User Hub Notification Preference Schemas
 * API schemas for user-per-hub notification preferences
 */

const objectIdPattern = '^[0-9a-fA-F]{24}$';

/**
 * Channel preference item schema
 */
const channelPreferenceItemSchema = {
  type: 'object',
  required: ['templateId', 'enabled'],
  properties: {
    templateId: {
      type: 'string',
      minLength: 1,
      description: 'Template ID (e.g., BOOKING_CONFIRMED_LEARNER)',
    },
    enabled: {
      type: 'boolean',
      description: 'Whether this notification is enabled',
    },
  },
} as const;

/**
 * Hub ID parameter schema
 */
export const userHubNotificationPreferenceHubIdParamSchema = {
  params: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Hub ID (MongoDB ObjectId)',
      },
    },
  },
} as const;

/**
 * Get user hub notification preferences query schema
 * Used when listing all hub preferences for a user
 */
export const getUserHubNotificationPreferencesQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      page: {
        type: 'number',
        minimum: 1,
        default: 1,
        description: 'Page number',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 20,
        description: 'Items per page',
      },
    },
  },
} as const;

/**
 * Update user hub notification preference body schema
 */
export const updateUserHubNotificationPreferenceBodySchema = {
  body: {
    type: 'object',
    properties: {
      muteAll: {
        type: 'boolean',
        description: 'Mute all notifications from this hub',
      },
      inApp: {
        type: 'array',
        items: channelPreferenceItemSchema,
        description: 'In-app notification preferences',
      },
      email: {
        type: 'array',
        items: channelPreferenceItemSchema,
        description: 'Email notification preferences',
      },
      whatsApp: {
        type: 'array',
        items: channelPreferenceItemSchema,
        description: 'WhatsApp notification preferences',
      },
      mutedCategories: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'chats',
            'bookings',
            'jobs',
            'promotions',
            'system',
            'experiences',
            'members',
            'payments',
          ],
        },
        description: 'Categories to mute for this hub',
      },
    },
  },
} as const;

/**
 * Mute/unmute hub body schema
 */
export const muteHubNotificationsBodySchema = {
  body: {
    type: 'object',
    required: ['mute'],
    properties: {
      mute: {
        type: 'boolean',
        description: 'Whether to mute (true) or unmute (false) all notifications from this hub',
      },
    },
  },
} as const;

/**
 * Update channel preference body schema
 * For updating a single channel's preferences
 */
export const updateChannelPreferenceBodySchema = {
  body: {
    type: 'object',
    required: ['channel', 'preferences'],
    properties: {
      channel: {
        type: 'string',
        enum: ['inApp', 'email', 'whatsApp'],
        description: 'The notification channel to update',
      },
      preferences: {
        type: 'array',
        items: channelPreferenceItemSchema,
        description: 'Template preferences for this channel',
      },
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface ChannelPreferenceItem {
  templateId: string;
  enabled: boolean;
}

export interface UserHubNotificationPreferenceHubIdParam {
  hubId: string;
}

export interface GetUserHubNotificationPreferencesQuery {
  page?: number;
  limit?: number;
}

export interface UpdateUserHubNotificationPreferenceInput {
  muteAll?: boolean;
  inApp?: ChannelPreferenceItem[];
  email?: ChannelPreferenceItem[];
  whatsApp?: ChannelPreferenceItem[];
  mutedCategories?: string[];
}

export interface MuteHubNotificationsInput {
  mute: boolean;
}

export interface UpdateChannelPreferenceInput {
  channel: 'inApp' | 'email' | 'whatsApp';
  preferences: ChannelPreferenceItem[];
}
