import { Email, EmailStatus } from '@core/models/Email';
import { EmailTemplate } from '@core/models/EmailTemplate';
import { HubNotificationPreference } from '@core/models/HubNotificationPreference';
import { InAppNotificationLog, InAppNotificationStatus } from '@core/models/InAppNotificationLog';
import { InAppNotificationTemplate } from '@core/models/InAppNotificationTemplate';
import { UserNotificationPreference } from '@core/models/UserNotificationPreference';
import { WhatsAppLog, WhatsAppStatus } from '@core/models/WhatsAppLog';
import { WhatsAppTemplate } from '@core/models/WhatsAppTemplate';
import mongoose from 'mongoose';

/**
 * Result of triggering a communication
 */
export interface TriggerResult {
  inApp: { sent: boolean; logId?: string; error?: string };
  email: { sent: boolean; logId?: string; error?: string };
  whatsApp: { sent: boolean; logId?: string; error?: string };
}

/**
 * User data required for sending communications
 */
interface UserData {
  _id: mongoose.Types.ObjectId | string;
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * Communication Trigger Service
 *
 * Unified service for triggering notifications across all channels:
 * - In-App Notifications
 * - Email
 * - WhatsApp
 *
 * Features:
 * - Respects user notification preferences
 * - Respects hub notification preferences (if applicable)
 * - Logs to respective collections (no actual sending)
 * - Template-based messaging with variable substitution
 */
export class CommunicationTriggerService {
  /**
   * Trigger communication to a user across all enabled channels
   *
   * @param options - Communication options
   * @param options.templateId - The template ID (e.g., 'BOOKING_CONFIRMED')
   * @param options.userId - The recipient user ID
   * @param options.hubId - Optional hub ID for hub-context notifications
   * @param options.data - Template variables for substitution
   * @param options.channels - Optional array to limit channels (default: all)
   * @returns Result for each channel
   */
  async triggerCommunication(options: {
    templateId: string;
    userId: string;
    hubId?: string;
    data: Record<string, unknown>;
    channels?: ('inApp' | 'email' | 'whatsApp')[];
  }): Promise<TriggerResult> {
    const result: TriggerResult = {
      inApp: { sent: false },
      email: { sent: false },
      whatsApp: { sent: false },
    };

    try {
      // 1. Get user info - we need a User model lookup
      // For now, we'll use minimal data from options
      // In real implementation, you might want to fetch full user data
      const user: UserData = {
        _id: options.userId,
        name: options.data.userName as string | undefined,
        email: options.data.userEmail as string | undefined,
        phone: options.data.userPhone as string | undefined,
      };

      // 2. Check preferences
      const preferences = await this.checkPreferences(
        options.userId,
        options.hubId,
        options.templateId,
      );

      // 3. Determine which channels to use
      const channels = options.channels || ['inApp', 'email', 'whatsApp'];

      // 4. Process each channel in parallel
      const promises: Promise<void>[] = [];

      if (channels.includes('inApp') && preferences.inApp) {
        promises.push(
          this.createInAppNotification(options, user).then((res) => {
            result.inApp = res;
          }),
        );
      }

      if (channels.includes('email') && preferences.email && user.email) {
        promises.push(
          this.createEmailLog(options, user).then((res) => {
            result.email = res;
          }),
        );
      }

      if (channels.includes('whatsApp') && preferences.whatsApp && user.phone) {
        promises.push(
          this.createWhatsAppLog(options, user).then((res) => {
            result.whatsApp = res;
          }),
        );
      }

      await Promise.all(promises);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.inApp.error = message;
      result.email.error = message;
      result.whatsApp.error = message;
    }

    return result;
  }

  /**
   * Trigger communication with user data directly (skips user lookup)
   *
   * Use this when you already have user data available (e.g., from a populated booking)
   */
  async triggerCommunicationWithUser(options: {
    templateId: string;
    user: UserData;
    hubId?: string;
    data: Record<string, unknown>;
    channels?: ('inApp' | 'email' | 'whatsApp')[];
  }): Promise<TriggerResult> {
    const result: TriggerResult = {
      inApp: { sent: false },
      email: { sent: false },
      whatsApp: { sent: false },
    };

    try {
      const userId = options.user._id.toString();

      // Check preferences
      const preferences = await this.checkPreferences(userId, options.hubId, options.templateId);

      // Determine which channels to use
      const channels = options.channels || ['inApp', 'email', 'whatsApp'];

      // Process each channel in parallel
      const promises: Promise<void>[] = [];

      if (channels.includes('inApp') && preferences.inApp) {
        promises.push(
          this.createInAppNotification({ ...options, userId }, options.user).then((res) => {
            result.inApp = res;
          }),
        );
      }

      if (channels.includes('email') && preferences.email && options.user.email) {
        promises.push(
          this.createEmailLog({ ...options, userId }, options.user).then((res) => {
            result.email = res;
          }),
        );
      }

      if (channels.includes('whatsApp') && preferences.whatsApp && options.user.phone) {
        promises.push(
          this.createWhatsAppLog({ ...options, userId }, options.user).then((res) => {
            result.whatsApp = res;
          }),
        );
      }

      await Promise.all(promises);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.inApp.error = message;
      result.email.error = message;
      result.whatsApp.error = message;
    }

    return result;
  }

  /**
   * Check user and hub preferences for a template
   *
   * Logic:
   * - No preference stored = Enabled (default)
   * - Global mute = All disabled
   * - Explicit disable in user prefs = Disabled
   * - Explicit disable in hub prefs = Disabled (AND with user prefs)
   */
  private async checkPreferences(
    userId: string,
    hubId: string | undefined,
    templateId: string,
  ): Promise<{ inApp: boolean; email: boolean; whatsApp: boolean }> {
    // Default all enabled
    const result = { inApp: true, email: true, whatsApp: true };

    // Check user preferences
    const userPrefs = await UserNotificationPreference.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();

    if (userPrefs) {
      // Global mute
      if (userPrefs.globalMute) {
        return { inApp: false, email: false, whatsApp: false };
      }

      // Check per-template preferences
      const inAppPref = userPrefs.inApp?.find((p) => p.templateId === templateId);
      const emailPref = userPrefs.email?.find((p) => p.templateId === templateId);
      const whatsAppPref = userPrefs.whatsApp?.find((p) => p.templateId === templateId);

      if (inAppPref && !inAppPref.enabled) result.inApp = false;
      if (emailPref && !emailPref.enabled) result.email = false;
      if (whatsAppPref && !whatsAppPref.enabled) result.whatsApp = false;
    }

    // Check hub preferences if hubId provided (AND logic)
    if (hubId) {
      const hubPrefs = await HubNotificationPreference.findOne({
        hubId: new mongoose.Types.ObjectId(hubId),
      }).lean();

      if (hubPrefs) {
        const inAppPref = hubPrefs.inApp?.find((p) => p.templateId === templateId);
        const emailPref = hubPrefs.email?.find((p) => p.templateId === templateId);
        const whatsAppPref = hubPrefs.whatsApp?.find((p) => p.templateId === templateId);

        // Hub can disable notifications (AND logic)
        if (inAppPref && !inAppPref.enabled) result.inApp = false;
        if (emailPref && !emailPref.enabled) result.email = false;
        if (whatsAppPref && !whatsAppPref.enabled) result.whatsApp = false;
      }
    }

    return result;
  }

  /**
   * Create in-app notification log
   */
  private async createInAppNotification(
    options: {
      templateId: string;
      userId: string;
      hubId?: string;
      data: Record<string, unknown>;
    },
    _user: UserData,
  ): Promise<{ sent: boolean; logId?: string; error?: string }> {
    try {
      const template = await InAppNotificationTemplate.findOne({
        templateId: options.templateId.toUpperCase(),
        isActive: true,
      }).lean();

      if (!template) {
        return { sent: false, error: 'In-app notification template not found or inactive' };
      }

      // Resolve variables in title and body
      const title = this.resolveVariables(template.title, options.data);
      const message = this.resolveVariables(template.body, options.data);

      const log = await InAppNotificationLog.create({
        userId: new mongoose.Types.ObjectId(options.userId),
        hubId: options.hubId ? new mongoose.Types.ObjectId(options.hubId) : undefined,
        templateId: options.templateId.toUpperCase(),
        title,
        message,
        data: options.data,
        actions: template.actions,
        status: InAppNotificationStatus.SENT,
        sentAt: new Date(),
      });

      return { sent: true, logId: (log._id as mongoose.Types.ObjectId).toString() };
    } catch (error) {
      return {
        sent: false,
        error:
          error instanceof Error ? error.message : 'Unknown error creating in-app notification',
      };
    }
  }

  /**
   * Create email log (no actual sending)
   */
  private async createEmailLog(
    options: {
      templateId: string;
      userId: string;
      hubId?: string;
      data: Record<string, unknown>;
    },
    user: UserData,
  ): Promise<{ sent: boolean; logId?: string; error?: string }> {
    try {
      const template = await EmailTemplate.findOne({
        templateId: options.templateId.toUpperCase(),
        isActive: true,
      }).lean();

      if (!template) {
        return { sent: false, error: 'Email template not found or inactive' };
      }

      // Include hubId in data for hub communication log queries
      const emailData = {
        ...options.data,
        ...(options.hubId && { hubId: options.hubId }),
      };

      const log = await Email.create({
        toEmail: user.email,
        emailType: options.templateId.toUpperCase(),
        sendGridTemplateId: template.sendGridTemplateId,
        data: emailData,
        userId: new mongoose.Types.ObjectId(options.userId),
        status: EmailStatus.PENDING, // Would be SENT after actual sending
      });

      return { sent: true, logId: (log._id as mongoose.Types.ObjectId).toString() };
    } catch (error) {
      return {
        sent: false,
        error: error instanceof Error ? error.message : 'Unknown error creating email log',
      };
    }
  }

  /**
   * Create WhatsApp log (no actual sending)
   */
  private async createWhatsAppLog(
    options: {
      templateId: string;
      userId: string;
      hubId?: string;
      data: Record<string, unknown>;
    },
    user: UserData,
  ): Promise<{ sent: boolean; logId?: string; error?: string }> {
    try {
      const template = await WhatsAppTemplate.findOne({
        templateId: options.templateId.toUpperCase(),
        isActive: true,
      }).lean();

      if (!template) {
        return { sent: false, error: 'WhatsApp template not found or inactive' };
      }

      const log = await WhatsAppLog.create({
        toPhone: user.phone,
        templateId: options.templateId.toUpperCase(),
        whatsAppTemplateName: template.whatsAppTemplateName,
        data: options.data,
        userId: new mongoose.Types.ObjectId(options.userId),
        hubId: options.hubId ? new mongoose.Types.ObjectId(options.hubId) : undefined,
        status: WhatsAppStatus.PENDING, // Would be SENT after actual sending
      });

      return { sent: true, logId: (log._id as mongoose.Types.ObjectId).toString() };
    } catch (error) {
      return {
        sent: false,
        error: error instanceof Error ? error.message : 'Unknown error creating WhatsApp log',
      };
    }
  }

  /**
   * Resolve template variables
   * Replaces {{variableName}} with actual values from data
   */
  private resolveVariables(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = data[key];
      return value !== undefined && value !== null ? String(value) : match;
    });
  }

  /**
   * Trigger communication to multiple users
   * Useful for broadcasting to hub members, etc.
   */
  async triggerBulkCommunication(options: {
    templateId: string;
    userIds: string[];
    hubId?: string;
    data: Record<string, unknown>;
    channels?: ('inApp' | 'email' | 'whatsApp')[];
  }): Promise<Map<string, TriggerResult>> {
    const results = new Map<string, TriggerResult>();

    // Process in parallel with concurrency limit
    const concurrency = 10;
    for (let i = 0; i < options.userIds.length; i += concurrency) {
      const batch = options.userIds.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((userId) =>
          this.triggerCommunication({
            templateId: options.templateId,
            userId,
            hubId: options.hubId,
            data: options.data,
            channels: options.channels,
          }).then((result) => ({ userId, result })),
        ),
      );

      for (const { userId, result } of batchResults) {
        results.set(userId, result);
      }
    }

    return results;
  }
}

export const communicationTriggerService = new CommunicationTriggerService();
