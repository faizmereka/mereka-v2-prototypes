import {
  type IChannelPreferenceItem,
  type IUserHubNotificationPreference,
  UserHubNotificationPreference,
} from '@core/models/UserHubNotificationPreference';
import mongoose from 'mongoose';

/**
 * User Hub Notification Preference Service
 *
 * Manages user-specific notification preferences per hub.
 * Allows users to customize which notifications they receive from each hub they belong to.
 */
export class UserHubNotificationPreferenceService {
  /**
   * Get all hub notification preferences for a user
   * Returns preferences along with hub info for hubs the user belongs to
   */
  async getUserHubPreferences(
    userId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{
    preferences: (IUserHubNotificationPreference & {
      hub?: { _id: string; name: string; logo?: string };
    })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    // Get user's hub memberships first
    // This assumes there's a way to get hubs a user belongs to
    // For now, we'll get all preferences and populate hub info
    const [preferences, total] = await Promise.all([
      UserHubNotificationPreference.find({ userId: new mongoose.Types.ObjectId(userId) })
        .populate('hubId', 'name logo')
        .skip(skip)
        .limit(limit)
        .sort({ updatedAt: -1 })
        .lean(),
      UserHubNotificationPreference.countDocuments({ userId: new mongoose.Types.ObjectId(userId) }),
    ]);

    // Transform to include hub info in a cleaner format
    const transformedPreferences = preferences.map((pref) => ({
      ...pref,
      hub: pref.hubId as unknown as { _id: string; name: string; logo?: string },
    }));

    return {
      preferences: transformedPreferences as unknown as (IUserHubNotificationPreference & {
        hub?: { _id: string; name: string; logo?: string };
      })[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get notification preference for a specific hub
   */
  async getHubPreference(
    userId: string,
    hubId: string,
  ): Promise<IUserHubNotificationPreference | null> {
    return UserHubNotificationPreference.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      hubId: new mongoose.Types.ObjectId(hubId),
    }).lean() as unknown as IUserHubNotificationPreference | null;
  }

  /**
   * Create or update notification preference for a hub
   * Uses upsert to create if doesn't exist
   */
  async upsertHubPreference(
    userId: string,
    hubId: string,
    data: {
      muteAll?: boolean;
      inApp?: IChannelPreferenceItem[];
      email?: IChannelPreferenceItem[];
      whatsApp?: IChannelPreferenceItem[];
      mutedCategories?: string[];
    },
  ): Promise<IUserHubNotificationPreference> {
    const updateData: Record<string, unknown> = {};

    if (data.muteAll !== undefined) {
      updateData.muteAll = data.muteAll;
    }
    if (data.inApp !== undefined) {
      updateData.inApp = data.inApp;
    }
    if (data.email !== undefined) {
      updateData.email = data.email;
    }
    if (data.whatsApp !== undefined) {
      updateData.whatsApp = data.whatsApp;
    }
    if (data.mutedCategories !== undefined) {
      updateData.mutedCategories = data.mutedCategories;
    }

    const result = await UserHubNotificationPreference.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        hubId: new mongoose.Types.ObjectId(hubId),
      },
      { $set: updateData },
      { upsert: true, new: true },
    ).lean();

    return result as unknown as IUserHubNotificationPreference;
  }

  /**
   * Mute or unmute all notifications from a hub
   */
  async setHubMuteStatus(
    userId: string,
    hubId: string,
    mute: boolean,
  ): Promise<IUserHubNotificationPreference> {
    const result = await UserHubNotificationPreference.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        hubId: new mongoose.Types.ObjectId(hubId),
      },
      { $set: { muteAll: mute } },
      { upsert: true, new: true },
    ).lean();

    return result as unknown as IUserHubNotificationPreference;
  }

  /**
   * Update preferences for a specific channel
   */
  async updateChannelPreference(
    userId: string,
    hubId: string,
    channel: 'inApp' | 'email' | 'whatsApp',
    preferences: IChannelPreferenceItem[],
  ): Promise<IUserHubNotificationPreference> {
    const result = await UserHubNotificationPreference.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        hubId: new mongoose.Types.ObjectId(hubId),
      },
      { $set: { [channel]: preferences } },
      { upsert: true, new: true },
    ).lean();

    return result as unknown as IUserHubNotificationPreference;
  }

  /**
   * Toggle a specific template preference for a channel
   */
  async toggleTemplatePreference(
    userId: string,
    hubId: string,
    channel: 'inApp' | 'email' | 'whatsApp',
    templateId: string,
    enabled: boolean,
  ): Promise<IUserHubNotificationPreference> {
    // First, get existing preference
    let preference = await UserHubNotificationPreference.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      hubId: new mongoose.Types.ObjectId(hubId),
    });

    if (!preference) {
      // Create new preference with this template setting
      preference = await UserHubNotificationPreference.create({
        userId: new mongoose.Types.ObjectId(userId),
        hubId: new mongoose.Types.ObjectId(hubId),
        [channel]: [{ templateId, enabled }],
      });
      return preference.toObject() as IUserHubNotificationPreference;
    }

    // Update existing preference
    const channelPrefs = preference[channel] || [];
    const existingIndex = channelPrefs.findIndex((p) => p.templateId === templateId);

    if (existingIndex >= 0 && channelPrefs[existingIndex]) {
      channelPrefs[existingIndex].enabled = enabled;
    } else {
      channelPrefs.push({ templateId, enabled });
    }

    preference[channel] = channelPrefs;
    await preference.save();

    return preference.toObject() as IUserHubNotificationPreference;
  }

  /**
   * Add or remove a category from muted categories
   */
  async toggleCategoryMute(
    userId: string,
    hubId: string,
    category: string,
    mute: boolean,
  ): Promise<IUserHubNotificationPreference> {
    const operation = mute
      ? { $addToSet: { mutedCategories: category } }
      : { $pull: { mutedCategories: category } };

    const result = await UserHubNotificationPreference.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        hubId: new mongoose.Types.ObjectId(hubId),
      },
      operation,
      { upsert: true, new: true },
    ).lean();

    return result as unknown as IUserHubNotificationPreference;
  }

  /**
   * Delete hub preference (reset to defaults)
   */
  async deleteHubPreference(userId: string, hubId: string): Promise<boolean> {
    const result = await UserHubNotificationPreference.deleteOne({
      userId: new mongoose.Types.ObjectId(userId),
      hubId: new mongoose.Types.ObjectId(hubId),
    });

    return result.deletedCount > 0;
  }

  /**
   * Check if a notification should be sent to a user for a hub
   * Used by the communication trigger service
   */
  async shouldSendNotification(
    userId: string,
    hubId: string,
    templateId: string,
    channel: 'inApp' | 'email' | 'whatsApp',
    category?: string,
  ): Promise<boolean> {
    const preference = await this.getHubPreference(userId, hubId);

    // No preference means use defaults (send notification)
    if (!preference) {
      return true;
    }

    // Check if all notifications are muted for this hub
    if (preference.muteAll) {
      return false;
    }

    // Check if category is muted
    if (category && preference.mutedCategories.includes(category)) {
      return false;
    }

    // Check channel-specific preference
    const channelPrefs = preference[channel] || [];
    const templatePref = channelPrefs.find((p) => p.templateId === templateId);

    // If no specific preference for this template, allow (default enabled)
    if (!templatePref) {
      return true;
    }

    return templatePref.enabled;
  }

  /**
   * Get muted hubs for a user
   */
  async getMutedHubs(userId: string): Promise<string[]> {
    const mutedPrefs = await UserHubNotificationPreference.find({
      userId: new mongoose.Types.ObjectId(userId),
      muteAll: true,
    })
      .select('hubId')
      .lean();

    return mutedPrefs.map((p) => p.hubId.toString());
  }

  /**
   * Bulk check if notifications should be sent
   * More efficient for checking multiple templates at once
   */
  async shouldSendNotifications(
    userId: string,
    hubId: string,
    checks: Array<{
      templateId: string;
      channel: 'inApp' | 'email' | 'whatsApp';
      category?: string;
    }>,
  ): Promise<Map<string, boolean>> {
    const preference = await this.getHubPreference(userId, hubId);
    const results = new Map<string, boolean>();

    for (const check of checks) {
      const key = `${check.channel}:${check.templateId}`;

      // No preference means use defaults
      if (!preference) {
        results.set(key, true);
        continue;
      }

      // Check if all muted
      if (preference.muteAll) {
        results.set(key, false);
        continue;
      }

      // Check if category is muted
      if (check.category && preference.mutedCategories.includes(check.category)) {
        results.set(key, false);
        continue;
      }

      // Check channel preference
      const channelPrefs = preference[check.channel] || [];
      const templatePref = channelPrefs.find((p) => p.templateId === check.templateId);

      results.set(key, templatePref ? templatePref.enabled : true);
    }

    return results;
  }
}

export const userHubNotificationPreferenceService = new UserHubNotificationPreferenceService();
