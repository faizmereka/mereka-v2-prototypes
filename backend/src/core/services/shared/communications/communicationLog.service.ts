import { Email } from '@core/models/Email';
import { InAppNotificationLog } from '@core/models/InAppNotificationLog';
import { WhatsAppLog } from '@core/models/WhatsAppLog';
import mongoose from 'mongoose';

/**
 * Unified Communication Log Item
 * Represents a single notification/email/whatsapp log entry
 */
export interface ICommunicationLogItem {
  _id: string;
  channel: 'inApp' | 'email' | 'whatsApp';
  templateId: string;
  title?: string;
  message?: string;
  recipient: string; // email address or phone number
  status: string;
  isRead?: boolean;
  data?: Record<string, unknown>;
  sentAt?: Date;
  createdAt: Date;
}

/**
 * Communication Log Response
 */
export interface ICommunicationLogResponse {
  logs: ICommunicationLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalInApp: number;
    totalEmail: number;
    totalWhatsApp: number;
    unreadInApp: number;
  };
}

/**
 * Communication Log Filters
 */
export interface ICommunicationLogFilters {
  channel?: 'inApp' | 'email' | 'whatsApp' | 'all';
  templateId?: string;
  status?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  page?: number;
  limit?: number;
}

/**
 * Communication Log Service
 * Provides unified access to all notification logs (InApp, Email, WhatsApp)
 * for both user (learner) and hub dashboards
 */
export class CommunicationLogService {
  /**
   * Get communication logs for a user (learner dashboard)
   * Fetches from all three channels: InApp, Email, WhatsApp
   */
  async getUserLogs(
    userId: string,
    filters: ICommunicationLogFilters = {},
  ): Promise<ICommunicationLogResponse> {
    const {
      channel = 'all',
      templateId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;
    const skip = (page - 1) * limit;

    // Build date filter
    const dateFilter: Record<string, unknown> = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) (dateFilter.createdAt as Record<string, Date>).$gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        (dateFilter.createdAt as Record<string, Date>).$lte = endOfDay;
      }
    }

    // Fetch logs based on channel filter
    const logs: ICommunicationLogItem[] = [];
    let totalInApp = 0;
    let totalEmail = 0;
    let totalWhatsApp = 0;
    let unreadInApp = 0;

    // InApp Notifications
    if (channel === 'all' || channel === 'inApp') {
      const inAppFilter: Record<string, unknown> = { userId, ...dateFilter };
      if (templateId) inAppFilter.templateId = templateId;
      if (status) inAppFilter.status = status;

      const [inAppLogs, inAppCount, unreadCount] = await Promise.all([
        channel === 'inApp'
          ? InAppNotificationLog.find(inAppFilter)
              .sort({ createdAt: -1 })
              .skip(skip)
              .limit(limit)
              .lean()
          : InAppNotificationLog.find(inAppFilter).sort({ createdAt: -1 }).lean(),
        InAppNotificationLog.countDocuments(inAppFilter),
        InAppNotificationLog.countDocuments({ userId, isRead: false }),
      ]);

      totalInApp = inAppCount;
      unreadInApp = unreadCount;

      for (const log of inAppLogs) {
        logs.push({
          _id: log._id.toString(),
          channel: 'inApp',
          templateId: log.templateId || '',
          title: log.title,
          message: log.message,
          recipient: 'In-App',
          status: log.isRead ? 'read' : 'unread',
          isRead: log.isRead,
          createdAt: log.createdAt,
          sentAt: log.sentAt,
        });
      }
    }

    // Email Logs
    if (channel === 'all' || channel === 'email') {
      const emailFilter: Record<string, unknown> = {
        userId: new mongoose.Types.ObjectId(userId),
        ...dateFilter,
      };
      if (templateId) emailFilter.emailType = templateId;
      if (status) emailFilter.status = status;

      const [emailLogs, emailCount] = await Promise.all([
        channel === 'email'
          ? Email.find(emailFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
          : Email.find(emailFilter).sort({ createdAt: -1 }).lean(),
        Email.countDocuments(emailFilter),
      ]);

      totalEmail = emailCount;

      for (const log of emailLogs) {
        logs.push({
          _id: log._id.toString(),
          channel: 'email',
          templateId: log.emailType,
          title: this.formatTemplateTitle(log.emailType),
          message: (log.data?.subject as string) || this.formatTemplateTitle(log.emailType),
          recipient: log.toEmail,
          status: log.status,
          data: log.data,
          createdAt: log.createdAt,
          sentAt: log.sentAt,
        });
      }
    }

    // WhatsApp Logs
    if (channel === 'all' || channel === 'whatsApp') {
      const whatsAppFilter: Record<string, unknown> = {
        userId: new mongoose.Types.ObjectId(userId),
        ...dateFilter,
      };
      if (templateId) whatsAppFilter.templateId = templateId;
      if (status) whatsAppFilter.status = status;

      const [whatsAppLogs, whatsAppCount] = await Promise.all([
        channel === 'whatsApp'
          ? WhatsAppLog.find(whatsAppFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
          : WhatsAppLog.find(whatsAppFilter).sort({ createdAt: -1 }).lean(),
        WhatsAppLog.countDocuments(whatsAppFilter),
      ]);

      totalWhatsApp = whatsAppCount;

      for (const log of whatsAppLogs) {
        logs.push({
          _id: log._id.toString(),
          channel: 'whatsApp',
          templateId: log.templateId,
          title: this.formatTemplateTitle(log.templateId),
          message: (log.data?.message as string) || this.formatTemplateTitle(log.templateId),
          recipient: log.toPhone,
          status: log.status,
          data: log.data,
          createdAt: log.createdAt,
          sentAt: log.sentAt,
        });
      }
    }

    // Sort all logs by createdAt descending
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination for 'all' channel
    const paginatedLogs = channel === 'all' ? logs.slice(skip, skip + limit) : logs;
    const total =
      channel === 'all'
        ? logs.length
        : channel === 'inApp'
          ? totalInApp
          : channel === 'email'
            ? totalEmail
            : totalWhatsApp;

    return {
      logs: paginatedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalInApp,
        totalEmail,
        totalWhatsApp,
        unreadInApp,
      },
    };
  }

  /**
   * Get communication logs for a hub (hub dashboard)
   * Fetches all logs related to the hub
   */
  async getHubLogs(
    hubId: string,
    filters: ICommunicationLogFilters = {},
  ): Promise<ICommunicationLogResponse> {
    const {
      channel = 'all',
      templateId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;
    const skip = (page - 1) * limit;

    // Build date filter
    const dateFilter: Record<string, unknown> = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) (dateFilter.createdAt as Record<string, Date>).$gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        (dateFilter.createdAt as Record<string, Date>).$lte = endOfDay;
      }
    }

    const logs: ICommunicationLogItem[] = [];
    const totalInApp = 0;
    let totalEmail = 0;
    let totalWhatsApp = 0;

    // For hub logs, we need to:
    // 1. Get Email logs where data contains hubId reference
    // 2. Get WhatsApp logs where hubId matches
    // 3. InApp notifications don't have hubId, so we skip them for hub dashboard
    //    (hub notifications go to individual users)

    // Email Logs for Hub
    if (channel === 'all' || channel === 'email') {
      // Email logs with hubId in data field
      const emailFilter: Record<string, unknown> = {
        $or: [{ 'data.hubId': hubId }, { 'data.hubId': new mongoose.Types.ObjectId(hubId) }],
        ...dateFilter,
      };
      if (templateId) emailFilter.emailType = templateId;
      if (status) emailFilter.status = status;

      const [emailLogs, emailCount] = await Promise.all([
        channel === 'email'
          ? Email.find(emailFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
          : Email.find(emailFilter).sort({ createdAt: -1 }).lean(),
        Email.countDocuments(emailFilter),
      ]);

      totalEmail = emailCount;

      for (const log of emailLogs) {
        logs.push({
          _id: log._id.toString(),
          channel: 'email',
          templateId: log.emailType,
          title: this.formatTemplateTitle(log.emailType),
          message: (log.data?.subject as string) || this.formatTemplateTitle(log.emailType),
          recipient: log.toEmail,
          status: log.status,
          data: log.data,
          createdAt: log.createdAt,
          sentAt: log.sentAt,
        });
      }
    }

    // WhatsApp Logs for Hub
    if (channel === 'all' || channel === 'whatsApp') {
      const whatsAppFilter: Record<string, unknown> = {
        hubId: new mongoose.Types.ObjectId(hubId),
        ...dateFilter,
      };
      if (templateId) whatsAppFilter.templateId = templateId;
      if (status) whatsAppFilter.status = status;

      const [whatsAppLogs, whatsAppCount] = await Promise.all([
        channel === 'whatsApp'
          ? WhatsAppLog.find(whatsAppFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
          : WhatsAppLog.find(whatsAppFilter).sort({ createdAt: -1 }).lean(),
        WhatsAppLog.countDocuments(whatsAppFilter),
      ]);

      totalWhatsApp = whatsAppCount;

      for (const log of whatsAppLogs) {
        logs.push({
          _id: log._id.toString(),
          channel: 'whatsApp',
          templateId: log.templateId,
          title: this.formatTemplateTitle(log.templateId),
          message: (log.data?.message as string) || this.formatTemplateTitle(log.templateId),
          recipient: log.toPhone,
          status: log.status,
          data: log.data,
          createdAt: log.createdAt,
          sentAt: log.sentAt,
        });
      }
    }

    // Sort all logs by createdAt descending
    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination for 'all' channel
    const paginatedLogs = channel === 'all' ? logs.slice(skip, skip + limit) : logs;
    const total =
      channel === 'all' ? logs.length : channel === 'email' ? totalEmail : totalWhatsApp;

    return {
      logs: paginatedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalInApp,
        totalEmail,
        totalWhatsApp,
        unreadInApp: 0, // Hub doesn't have unread inApp
      },
    };
  }

  /**
   * Get summary counts for user dashboard
   */
  async getUserLogsSummary(userId: string): Promise<{
    totalInApp: number;
    totalEmail: number;
    totalWhatsApp: number;
    unreadInApp: number;
  }> {
    const [totalInApp, unreadInApp, totalEmail, totalWhatsApp] = await Promise.all([
      InAppNotificationLog.countDocuments({ userId }),
      InAppNotificationLog.countDocuments({ userId, isRead: false }),
      Email.countDocuments({ userId: new mongoose.Types.ObjectId(userId) }),
      WhatsAppLog.countDocuments({ userId: new mongoose.Types.ObjectId(userId) }),
    ]);

    return {
      totalInApp,
      totalEmail,
      totalWhatsApp,
      unreadInApp,
    };
  }

  /**
   * Get summary counts for hub dashboard
   */
  async getHubLogsSummary(hubId: string): Promise<{
    totalEmail: number;
    totalWhatsApp: number;
  }> {
    const [totalEmail, totalWhatsApp] = await Promise.all([
      Email.countDocuments({
        $or: [{ 'data.hubId': hubId }, { 'data.hubId': new mongoose.Types.ObjectId(hubId) }],
      }),
      WhatsAppLog.countDocuments({ hubId: new mongoose.Types.ObjectId(hubId) }),
    ]);

    return {
      totalEmail,
      totalWhatsApp,
    };
  }

  /**
   * Format template ID to readable title
   */
  private formatTemplateTitle(templateId: string): string {
    if (!templateId) return 'Notification';
    return templateId
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export const communicationLogService = new CommunicationLogService();
