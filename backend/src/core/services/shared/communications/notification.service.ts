import {
  type IInAppNotificationLog,
  InAppNotificationLog,
  InAppNotificationStatus,
} from '@core/models/InAppNotificationLog';
import mongoose from 'mongoose';

/**
 * In-App Notification Service
 * Handles notification CRUD and user notification management
 *
 * Uses InAppNotificationLog model (collection: 'inAppNotificationLogs')
 */
export class NotificationService {
  /**
   * Create a notification
   */
  async createNotification(data: {
    userId: string;
    hubId?: string;
    templateId?: string;
    title: string;
    message: string;
  }): Promise<IInAppNotificationLog> {
    const { userId, hubId, ...rest } = data;
    const notificationData: Record<string, unknown> = {
      ...rest,
      userId: new mongoose.Types.ObjectId(userId),
    };
    if (hubId) {
      notificationData.hubId = new mongoose.Types.ObjectId(hubId);
    }
    const notification = await InAppNotificationLog.create(notificationData);
    return notification;
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(id: string): Promise<IInAppNotificationLog | null> {
    return InAppNotificationLog.findById(id).lean() as unknown as IInAppNotificationLog | null;
  }

  /**
   * Get all notifications (admin - with pagination and filters)
   */
  async getAllNotifications(options?: {
    userId?: string;
    hubId?: string;
    templateId?: string;
    status?: InAppNotificationStatus;
    isRead?: boolean | string;
    page?: number;
    limit?: number;
    startDate?: string | Date;
    endDate?: string | Date;
  }) {
    const {
      userId,
      hubId,
      templateId,
      status,
      isRead,
      page = 1,
      limit = 20,
      startDate,
      endDate,
    } = options || {};

    const filter: Record<string, unknown> = {};

    if (userId) filter.userId = userId;
    if (hubId) filter.hubId = hubId;
    if (templateId) filter.templateId = templateId;
    if (status) filter.status = status;
    if (isRead !== undefined) {
      // Convert string 'true'/'false' to boolean
      filter.isRead = typeof isRead === 'string' ? isRead === 'true' : isRead;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) (filter.createdAt as Record<string, Date>).$gte = new Date(startDate);
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        (filter.createdAt as Record<string, Date>).$lte = endOfDay;
      }
    }

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      InAppNotificationLog.find(filter)
        .populate('userId', 'name email')
        .populate('hubId', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      InAppNotificationLog.countDocuments(filter),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get notifications for a specific user (user-scoped only, no hubId)
   * Used for learner dashboard - shows personal notifications
   */
  async getUserNotifications(
    userId: string,
    options?: {
      isRead?: boolean | string;
      page?: number;
      limit?: number;
    },
  ) {
    const { isRead, page = 1, limit = 20 } = options || {};

    // Filter for user-scoped notifications (no hubId)
    const filter: Record<string, unknown> = {
      userId,
      $or: [{ hubId: { $exists: false } }, { hubId: null }],
    };

    if (isRead !== undefined) {
      // Convert string 'true'/'false' to boolean
      filter.isRead = typeof isRead === 'string' ? isRead === 'true' : isRead;
    }

    const skip = (page - 1) * limit;

    // Count unread for user-scoped notifications only
    const unreadFilter = {
      userId,
      isRead: false,
      $or: [{ hubId: { $exists: false } }, { hubId: null }],
    };

    const [notifications, total, unreadCount] = await Promise.all([
      InAppNotificationLog.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      InAppNotificationLog.countDocuments(filter),
      InAppNotificationLog.countDocuments(unreadFilter),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all notifications for a user (both user-scoped and hub-scoped)
   * Used for global notification count/dropdown
   */
  async getAllUserNotifications(
    userId: string,
    options?: {
      isRead?: boolean | string;
      page?: number;
      limit?: number;
    },
  ) {
    const { isRead, page = 1, limit = 20 } = options || {};

    const filter: Record<string, unknown> = { userId };

    if (isRead !== undefined) {
      filter.isRead = typeof isRead === 'string' ? isRead === 'true' : isRead;
    }

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      InAppNotificationLog.find(filter)
        .populate('hubId', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      InAppNotificationLog.countDocuments(filter),
      InAppNotificationLog.countDocuments({ userId, isRead: false }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get hub-specific notifications for a user
   * Used for hub dashboard - shows hub-related notifications
   */
  async getHubNotifications(
    userId: string,
    hubId: string,
    options?: {
      isRead?: boolean | string;
      page?: number;
      limit?: number;
    },
  ) {
    const { isRead, page = 1, limit = 20 } = options || {};

    // Filter for hub-scoped notifications
    const filter: Record<string, unknown> = {
      userId,
      hubId: new mongoose.Types.ObjectId(hubId),
    };

    if (isRead !== undefined) {
      filter.isRead = typeof isRead === 'string' ? isRead === 'true' : isRead;
    }

    const skip = (page - 1) * limit;

    // Count unread for this specific hub
    const unreadFilter = {
      userId,
      hubId: new mongoose.Types.ObjectId(hubId),
      isRead: false,
    };

    const [notifications, total, unreadCount] = await Promise.all([
      InAppNotificationLog.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      InAppNotificationLog.countDocuments(filter),
      InAppNotificationLog.countDocuments(unreadFilter),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get unread count for hub-specific notifications
   */
  async getHubUnreadCount(userId: string, hubId: string): Promise<number> {
    return InAppNotificationLog.countDocuments({
      userId,
      hubId: new mongoose.Types.ObjectId(hubId),
      isRead: false,
    });
  }

  /**
   * Mark all hub notifications as read for a user
   */
  async markAllHubAsRead(userId: string, hubId: string): Promise<{ modifiedCount: number }> {
    const result = await InAppNotificationLog.updateMany(
      { userId, hubId: new mongoose.Types.ObjectId(hubId), isRead: false },
      { $set: { isRead: true, readAt: new Date(), status: InAppNotificationStatus.READ } },
    );
    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<IInAppNotificationLog | null> {
    return InAppNotificationLog.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { isRead: true, readAt: new Date(), status: InAppNotificationStatus.READ } },
      { new: true },
    ).lean() as unknown as IInAppNotificationLog | null;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await InAppNotificationLog.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true, readAt: new Date(), status: InAppNotificationStatus.READ } },
    );
    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Delete notification (user can delete their own)
   */
  async deleteNotification(
    notificationId: string,
    userId?: string,
  ): Promise<IInAppNotificationLog | null> {
    const filter: Record<string, unknown> = { _id: notificationId };
    if (userId) filter.userId = userId;

    return InAppNotificationLog.findOneAndDelete(
      filter,
    ).lean() as unknown as IInAppNotificationLog | null;
  }

  /**
   * Delete notification by admin (no userId check)
   */
  async adminDeleteNotification(notificationId: string): Promise<IInAppNotificationLog | null> {
    return InAppNotificationLog.findByIdAndDelete(
      notificationId,
    ).lean() as unknown as IInAppNotificationLog | null;
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return InAppNotificationLog.countDocuments({ userId, isRead: false });
  }

  /**
   * Get notification stats (admin)
   */
  async getNotificationStats() {
    const [total, byStatus, byTemplateId, recentActivity] = await Promise.all([
      InAppNotificationLog.countDocuments(),
      InAppNotificationLog.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { status: '$_id', count: 1, _id: 0 } },
      ]),
      InAppNotificationLog.aggregate([
        { $match: { templateId: { $exists: true, $ne: null } } },
        { $group: { _id: '$templateId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { templateId: '$_id', count: 1, _id: 0 } },
      ]),
      InAppNotificationLog.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    return {
      total,
      byStatus,
      byTemplateId,
      recentActivity,
    };
  }

  /**
   * Update notification status
   */
  async updateNotificationStatus(
    notificationId: string,
    status: InAppNotificationStatus,
  ): Promise<IInAppNotificationLog | null> {
    const updateData: Record<string, unknown> = { status };

    if (status === InAppNotificationStatus.SENT) {
      updateData.sentAt = new Date();
    } else if (status === InAppNotificationStatus.READ) {
      updateData.isRead = true;
      updateData.readAt = new Date();
    }

    return InAppNotificationLog.findByIdAndUpdate(
      notificationId,
      { $set: updateData },
      { new: true },
    ).lean() as unknown as IInAppNotificationLog | null;
  }

  /**
   * Bulk delete old notifications (admin cleanup)
   */
  async deleteOldNotifications(olderThanDays: number): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const result = await InAppNotificationLog.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true,
    });
    return { deletedCount: result.deletedCount };
  }

  /**
   * Search notifications (admin)
   */
  async searchNotifications(
    query: string,
    options?: { startDate?: string | Date; endDate?: string | Date; page?: number; limit?: number },
  ) {
    const { startDate, endDate, page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { message: { $regex: query, $options: 'i' } },
        { templateId: { $regex: query, $options: 'i' } },
      ],
    };

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        (filter.createdAt as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        (filter.createdAt as Record<string, Date>).$lte = endOfDay;
      }
    }

    const [notifications, total] = await Promise.all([
      InAppNotificationLog.find(filter)
        .populate('userId', 'name email')
        .populate('hubId', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      InAppNotificationLog.countDocuments(filter),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const notificationService = new NotificationService();
