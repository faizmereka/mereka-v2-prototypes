import { EmailTemplate } from '@core/models/EmailTemplate';
import { NotificationScope, TargetUserType } from '@core/models/enums/NotificationEnums';
import { InAppNotificationTemplate } from '@core/models/InAppNotificationTemplate';
import {
  type IPreferenceItem,
  type IUserNotificationPreference,
  SummaryFrequency,
  UserNotificationPreference,
} from '@core/models/UserNotificationPreference';
import { WhatsAppTemplate } from '@core/models/WhatsAppTemplate';
import mongoose from 'mongoose';

/**
 * Category label mapping for UI display
 */
const CATEGORY_LABELS: Record<string, string> = {
  chats: 'Chats',
  bookings: 'Bookings',
  jobs: 'Jobs',
  promotions: 'Promotions',
  system: 'System',
  experiences: 'Experiences',
  members: 'Team & Members',
  payments: 'Payments',
};

/**
 * Channel preference item for API response
 */
interface IChannelPreference {
  available: boolean; // Whether this channel exists for this template
  enabled: boolean; // User's preference (only relevant if available)
}

/**
 * Preference item with all channel preferences for API response
 */
interface IPreferenceItemResponse {
  templateId: string;
  title: string;
  description: string;
  inApp: IChannelPreference;
  email: IChannelPreference;
  whatsApp: IChannelPreference;
}

/**
 * Category with preference items for API response
 */
interface ICategoryResponse {
  category: string;
  label: string;
  items: IPreferenceItemResponse[];
}

/**
 * Full preferences response for API
 */
export interface IUserPreferencesResponse {
  categories: ICategoryResponse[];
  summaryFrequency: SummaryFrequency;
  globalMute: boolean;
}

/**
 * User Notification Preference Service
 * Manages user notification preferences across all channels
 *
 * Key behaviors:
 * - No preference stored = Enabled (default)
 * - Explicit disable: { templateId: 'X', enabled: false }
 * - Lazy creation: Document created on first access
 */
export class UserNotificationPreferenceService {
  /**
   * Get or create user preference document
   */
  async getOrCreatePreference(userId: string): Promise<IUserNotificationPreference> {
    let preference = await UserNotificationPreference.findOne({ userId });

    if (!preference) {
      preference = await UserNotificationPreference.create({
        userId: new mongoose.Types.ObjectId(userId),
        inApp: [],
        email: [],
        whatsApp: [],
        summaryFrequency: SummaryFrequency.WEEKLY,
        globalMute: false,
      });
    }

    return preference;
  }

  /**
   * Get user preferences grouped by category for settings UI
   * Filters templates for learner dashboard: USER scope and LEARNER targetUserType
   */
  async getUserPreferences(userId: string): Promise<IUserPreferencesResponse> {
    // Get user's current preferences
    const preference = await this.getOrCreatePreference(userId);

    // Filter for USER scope templates that target LEARNER or all users
    const templateFilter = {
      isActive: true,
      scope: NotificationScope.USER,
      $or: [
        { targetUserTypes: { $size: 0 } }, // Empty array means all users
        { targetUserTypes: { $exists: false } }, // Field doesn't exist
        { targetUserTypes: { $in: [TargetUserType.LEARNER] } }, // Array contains learner
      ],
    };

    // Get active templates from each channel filtered by scope and targetUserTypes
    const [inAppTemplates, emailTemplates, whatsAppTemplates] = await Promise.all([
      InAppNotificationTemplate.find(templateFilter).lean(),
      EmailTemplate.find(templateFilter).lean(),
      WhatsAppTemplate.find(templateFilter).lean(),
    ]);

    // Create lookup maps for user preferences
    const inAppPrefs = new Map(preference.inApp.map((p) => [p.templateId, p.enabled]));
    const emailPrefs = new Map(preference.email.map((p) => [p.templateId, p.enabled]));
    const whatsAppPrefs = new Map(preference.whatsApp.map((p) => [p.templateId, p.enabled]));

    // Build a combined map of all templates by templateId
    const templateMap = new Map<
      string,
      {
        title: string;
        description: string;
        category: string;
        hasInApp: boolean;
        hasEmail: boolean;
        hasWhatsApp: boolean;
      }
    >();

    // Add in-app templates
    for (const template of inAppTemplates) {
      templateMap.set(template.templateId, {
        title: template.title,
        description: template.description,
        category: template.category,
        hasInApp: true,
        hasEmail: false,
        hasWhatsApp: false,
      });
    }

    // Add/merge email templates
    for (const template of emailTemplates) {
      const existing = templateMap.get(template.templateId);
      if (existing) {
        existing.hasEmail = true;
      } else {
        templateMap.set(template.templateId, {
          title: template.title,
          description: template.description,
          category: template.category,
          hasInApp: false,
          hasEmail: true,
          hasWhatsApp: false,
        });
      }
    }

    // Add/merge WhatsApp templates
    for (const template of whatsAppTemplates) {
      const existing = templateMap.get(template.templateId);
      if (existing) {
        existing.hasWhatsApp = true;
      } else {
        templateMap.set(template.templateId, {
          title: template.title,
          description: template.description,
          category: template.category,
          hasInApp: false,
          hasEmail: false,
          hasWhatsApp: true,
        });
      }
    }

    // Group templates by category
    const categoryMap = new Map<string, IPreferenceItemResponse[]>();

    for (const [templateId, template] of templateMap) {
      const item: IPreferenceItemResponse = {
        templateId,
        title: template.title,
        description: template.description,
        // Include availability and enabled status for each channel
        inApp: {
          available: template.hasInApp,
          enabled: template.hasInApp ? (inAppPrefs.get(templateId) ?? true) : false,
        },
        email: {
          available: template.hasEmail,
          enabled: template.hasEmail ? (emailPrefs.get(templateId) ?? true) : false,
        },
        whatsApp: {
          available: template.hasWhatsApp,
          enabled: template.hasWhatsApp ? (whatsAppPrefs.get(templateId) ?? true) : false,
        },
      };

      const items = categoryMap.get(template.category) || [];
      items.push(item);
      categoryMap.set(template.category, items);
    }

    // Build categories response
    const categories: ICategoryResponse[] = [];
    for (const [category, items] of categoryMap) {
      categories.push({
        category,
        label: CATEGORY_LABELS[category] || category,
        items,
      });
    }

    // Sort categories by a predefined order
    const categoryOrder = [
      'bookings',
      'experiences',
      'jobs',
      'payments',
      'members',
      'chats',
      'system',
      'promotions',
    ];
    categories.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.category);
      const bIndex = categoryOrder.indexOf(b.category);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    return {
      categories,
      summaryFrequency: preference.summaryFrequency,
      globalMute: preference.globalMute,
    };
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    userId: string,
    updates: {
      inApp?: IPreferenceItem[];
      email?: IPreferenceItem[];
      whatsApp?: IPreferenceItem[];
      summaryFrequency?: SummaryFrequency;
      globalMute?: boolean;
    },
  ): Promise<IUserNotificationPreference> {
    const preference = await this.getOrCreatePreference(userId);

    // Merge preference updates
    if (updates.inApp) {
      preference.inApp = this.mergePreferences(preference.inApp, updates.inApp);
    }
    if (updates.email) {
      preference.email = this.mergePreferences(preference.email, updates.email);
    }
    if (updates.whatsApp) {
      preference.whatsApp = this.mergePreferences(preference.whatsApp, updates.whatsApp);
    }
    if (updates.summaryFrequency !== undefined) {
      preference.summaryFrequency = updates.summaryFrequency;
    }
    if (updates.globalMute !== undefined) {
      preference.globalMute = updates.globalMute;
    }

    await preference.save();
    return preference;
  }

  /**
   * Check if a specific notification is enabled for a user
   */
  async isNotificationEnabled(
    userId: string,
    templateId: string,
    channel: 'inApp' | 'email' | 'whatsApp',
  ): Promise<boolean> {
    const preference = await UserNotificationPreference.findOne({ userId });

    // If no preference document, default to enabled
    if (!preference) {
      return true;
    }

    // If globally muted, return false
    if (preference.globalMute) {
      return false;
    }

    // Check specific preference
    const channelPrefs = preference[channel];
    const pref = channelPrefs.find((p) => p.templateId === templateId);

    // Default to enabled if no explicit preference
    return pref?.enabled ?? true;
  }

  /**
   * Toggle a specific notification preference
   */
  async togglePreference(
    userId: string,
    templateId: string,
    channel: 'inApp' | 'email' | 'whatsApp',
    enabled: boolean,
  ): Promise<IUserNotificationPreference> {
    const preference = await this.getOrCreatePreference(userId);

    const channelPrefs = preference[channel];
    const existingPref = channelPrefs.find((p) => p.templateId === templateId);

    if (existingPref) {
      existingPref.enabled = enabled;
    } else {
      channelPrefs.push({ templateId, enabled });
    }

    await preference.save();
    return preference;
  }

  /**
   * Merge preference updates with existing preferences
   */
  private mergePreferences(
    existing: IPreferenceItem[] | undefined,
    updates: IPreferenceItem[],
  ): IPreferenceItem[] {
    const merged = new Map<string, boolean>();

    // Add existing preferences
    if (existing) {
      for (const pref of existing) {
        merged.set(pref.templateId, pref.enabled);
      }
    }

    // Apply updates
    for (const update of updates) {
      merged.set(update.templateId, update.enabled);
    }

    // Convert back to array
    return Array.from(merged.entries()).map(([templateId, enabled]) => ({ templateId, enabled }));
  }

  /**
   * Delete user preferences (e.g., when user is deleted)
   */
  async deletePreferences(userId: string): Promise<boolean> {
    const result = await UserNotificationPreference.deleteOne({ userId });
    return result.deletedCount > 0;
  }
}

export const userNotificationPreferenceService = new UserNotificationPreferenceService();
