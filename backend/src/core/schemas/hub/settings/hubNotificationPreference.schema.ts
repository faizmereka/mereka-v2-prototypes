/**
 * Hub Notification Preference Schema
 * Schemas for managing hub notification preferences from hub settings
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
 * Update hub notification preferences schema
 */
export const updateHubNotificationPreferencesBodySchema = {
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
      notifyOwner: {
        type: 'boolean',
        description: 'Whether to notify hub owner',
      },
      notifyAdmins: {
        type: 'boolean',
        description: 'Whether to notify hub admins',
      },
      summaryFrequency: {
        type: 'string',
        enum: ['daily', 'weekly', 'monthly', 'none'],
        description: 'How often to receive summary emails',
      },
    },
  },
} as const;

/**
 * Toggle single hub preference schema
 */
export const toggleHubPreferenceBodySchema = {
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
export interface HubPreferenceItem {
  templateId: string;
  enabled: boolean;
}

export interface UpdateHubNotificationPreferencesInput {
  inApp?: HubPreferenceItem[];
  email?: HubPreferenceItem[];
  whatsApp?: HubPreferenceItem[];
  notifyOwner?: boolean;
  notifyAdmins?: boolean;
  summaryFrequency?: 'daily' | 'weekly' | 'monthly' | 'none';
}

export interface ToggleHubPreferenceInput {
  templateId: string;
  channel: 'inApp' | 'email' | 'whatsApp';
  enabled: boolean;
}
