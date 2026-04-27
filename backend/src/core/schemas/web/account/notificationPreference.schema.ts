/**
 * User Notification Preference Schema
 * Schemas for managing user notification preferences from account settings
 */

/**
 * Preference item schema
 */
const preferenceItemSchema = {
  type: 'object',
  properties: {
    templateId: { type: 'string' },
    enabled: { type: 'boolean' },
  },
  required: ['templateId', 'enabled'],
} as const;

/**
 * Update user notification preferences schema
 */
export const updateUserNotificationPreferencesBodySchema = {
  body: {
    type: 'object',
    properties: {
      inApp: {
        type: 'array',
        items: preferenceItemSchema,
        description: 'In-app notification preferences',
      },
      email: {
        type: 'array',
        items: preferenceItemSchema,
        description: 'Email notification preferences',
      },
      whatsApp: {
        type: 'array',
        items: preferenceItemSchema,
        description: 'WhatsApp notification preferences',
      },
      summaryFrequency: {
        type: 'string',
        enum: ['daily', 'weekly', 'monthly', 'none'],
        description: 'How often to receive summary emails',
      },
      globalMute: {
        type: 'boolean',
        description: 'Master switch to mute all notifications',
      },
    },
  },
} as const;

/**
 * Toggle single preference schema
 */
export const toggleUserPreferenceBodySchema = {
  body: {
    type: 'object',
    required: ['templateId', 'channel', 'enabled'],
    properties: {
      templateId: {
        type: 'string',
        description: 'Template ID to toggle',
      },
      channel: {
        type: 'string',
        enum: ['inApp', 'email', 'whatsApp'],
        description: 'Notification channel',
      },
      enabled: {
        type: 'boolean',
        description: 'Whether to enable or disable',
      },
    },
  },
} as const;

/**
 * TypeScript interfaces
 */
export interface PreferenceItem {
  templateId: string;
  enabled: boolean;
}

export interface UpdateUserNotificationPreferencesInput {
  inApp?: PreferenceItem[];
  email?: PreferenceItem[];
  whatsApp?: PreferenceItem[];
  summaryFrequency?: 'daily' | 'weekly' | 'monthly' | 'none';
  globalMute?: boolean;
}

export interface ToggleUserPreferenceInput {
  templateId: string;
  channel: 'inApp' | 'email' | 'whatsApp';
  enabled: boolean;
}
