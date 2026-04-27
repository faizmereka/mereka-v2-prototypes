import { EmailTemplate } from '@core/models/EmailTemplate';
import { NotificationScope, type TargetUserType } from '@core/models/enums/NotificationEnums';
import {
  HubNotificationPreference,
  HubSummaryFrequency,
  type IHubNotificationPreference,
} from '@core/models/HubNotificationPreference';
import { InAppNotificationTemplate } from '@core/models/InAppNotificationTemplate';
import type { IPreferenceItem } from '@core/models/UserNotificationPreference';
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
 * Hub-relevant categories (exclude user-only categories)
 */
const HUB_CATEGORIES = ['bookings', 'experiences', 'jobs', 'members', 'payments', 'system'];

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
 * Full preferences response for hub settings API
 */
export interface IHubPreferencesResponse {
  categories: ICategoryResponse[];
  notifyOwner: boolean;
  notifyAdmins: boolean;
  summaryFrequency: HubSummaryFrequency;
}

/**
 * Hub Notification Preference Service
 * Manages hub-level notification preferences
 *
 * Key behaviors:
 * - No preference stored = Enabled (default)
 * - Explicit disable: { templateId: 'X', enabled: false }
 * - Lazy creation: Document created on first access
 * - Controls who receives hub notifications (owner, admins)
 */
export class HubNotificationPreferenceService {
  /**
   * Get or create hub preference document
   */
  async getOrCreatePreference(hubId: string): Promise<IHubNotificationPreference> {
    let preference = await HubNotificationPreference.findOne({ hubId });

    if (!preference) {
      preference = await HubNotificationPreference.create({
        hubId: new mongoose.Types.ObjectId(hubId),
        inApp: [],
        email: [],
        whatsApp: [],
        notifyOwner: true,
        notifyAdmins: true,
        summaryFrequency: HubSummaryFrequency.WEEKLY,
      });
    }

    return preference;
  }

  /**
   * Get hub preferences grouped by category for settings UI
   * Filters templates based on user's role in the hub
   * @param hubId - Hub ID
   * @param userRoles - User's roles in the hub (e.g., ['hub_owner', 'hub_admin'])
   */
  async getHubPreferences(
    hubId: string,
    userRoles: TargetUserType[] = [],
  ): Promise<IHubPreferencesResponse> {
    // Get hub's current preferences
    const preference = await this.getOrCreatePreference(hubId);

    // Build filter for HUB scope templates that target the user's roles
    const templateFilter = {
      isActive: true,
      category: { $in: HUB_CATEGORIES },
      scope: NotificationScope.HUB,
      $or: [
        { targetUserTypes: { $size: 0 } }, // Empty array means all hub users
        { targetUserTypes: { $exists: false } }, // Field doesn't exist
        ...(userRoles.length > 0 ? [{ targetUserTypes: { $in: userRoles } }] : []),
      ],
    };

    // Get all active templates from each channel filtered by scope and user roles
    const [inAppTemplates, emailTemplates, whatsAppTemplates] = await Promise.all([
      InAppNotificationTemplate.find(templateFilter).lean(),
      EmailTemplate.find(templateFilter).lean(),
      WhatsAppTemplate.find(templateFilter).lean(),
    ]);

    // Create lookup maps for hub preferences
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
    const categoryOrder = ['bookings', 'experiences', 'jobs', 'payments', 'members', 'system'];
    categories.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.category);
      const bIndex = categoryOrder.indexOf(b.category);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    return {
      categories,
      notifyOwner: preference.notifyOwner,
      notifyAdmins: preference.notifyAdmins,
      summaryFrequency: preference.summaryFrequency,
    };
  }

  /**
   * Update hub preferences
   */
  async updatePreferences(
    hubId: string,
    updates: {
      inApp?: IPreferenceItem[];
      email?: IPreferenceItem[];
      whatsApp?: IPreferenceItem[];
      notifyOwner?: boolean;
      notifyAdmins?: boolean;
      summaryFrequency?: HubSummaryFrequency;
    },
  ): Promise<IHubNotificationPreference> {
    const preference = await this.getOrCreatePreference(hubId);

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
    if (updates.notifyOwner !== undefined) {
      preference.notifyOwner = updates.notifyOwner;
    }
    if (updates.notifyAdmins !== undefined) {
      preference.notifyAdmins = updates.notifyAdmins;
    }
    if (updates.summaryFrequency !== undefined) {
      preference.summaryFrequency = updates.summaryFrequency;
    }

    await preference.save();
    return preference;
  }

  /**
   * Check if a specific notification is enabled for a hub
   */
  async isNotificationEnabled(
    hubId: string,
    templateId: string,
    channel: 'inApp' | 'email' | 'whatsApp',
  ): Promise<boolean> {
    const preference = await HubNotificationPreference.findOne({ hubId });

    // If no preference document, default to enabled
    if (!preference) {
      return true;
    }

    // Check specific preference
    const channelPrefs = preference[channel];
    const pref = channelPrefs.find((p) => p.templateId === templateId);

    // Default to enabled if no explicit preference
    return pref?.enabled ?? true;
  }

  /**
   * Toggle a specific notification preference for a hub
   */
  async togglePreference(
    hubId: string,
    templateId: string,
    channel: 'inApp' | 'email' | 'whatsApp',
    enabled: boolean,
  ): Promise<IHubNotificationPreference> {
    const preference = await this.getOrCreatePreference(hubId);

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
   * Get notification recipients for a hub based on preferences
   */
  async getNotificationRecipients(hubId: string): Promise<{
    notifyOwner: boolean;
    notifyAdmins: boolean;
  }> {
    const preference = await HubNotificationPreference.findOne({ hubId });

    return {
      notifyOwner: preference?.notifyOwner ?? true,
      notifyAdmins: preference?.notifyAdmins ?? true,
    };
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
   * Delete hub preferences (e.g., when hub is deleted)
   */
  async deletePreferences(hubId: string): Promise<boolean> {
    const result = await HubNotificationPreference.deleteOne({ hubId });
    return result.deletedCount > 0;
  }
}

export const hubNotificationPreferenceService = new HubNotificationPreferenceService();
