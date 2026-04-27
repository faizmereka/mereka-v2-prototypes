import { NotificationScope, type TargetUserType } from '@core/models/enums/NotificationEnums';
import {
  type IInAppNotificationTemplate,
  InAppNotificationTemplate,
  type NotificationCategory,
} from '@core/models/InAppNotificationTemplate';

/**
 * Admin In-App Notification Template Service
 * Simple CRUD operations for in-app notification template management
 *
 * Uses InAppNotificationTemplate model (collection: 'inAppNotificationTemplates')
 */
export class AdminNotificationTemplateService {
  /**
   * Create notification template
   */
  async createNotificationTemplate(data: {
    templateId: string;
    name: string;
    title: string;
    description: string;
    category: NotificationCategory | string;
    body: string;
    scope?: NotificationScope | string;
    targetUserTypes?: (TargetUserType | string)[];
  }): Promise<IInAppNotificationTemplate> {
    const template = await InAppNotificationTemplate.create({
      ...data,
      scope: data.scope || NotificationScope.USER,
      targetUserTypes: data.targetUserTypes || [],
    });
    return template;
  }

  /**
   * Get notification template by ID
   */
  async getNotificationTemplateById(id: string) {
    return await InAppNotificationTemplate.findById(id).lean();
  }

  /**
   * Get notification template by templateId
   */
  async getNotificationTemplateByTemplateId(templateId: string) {
    return await InAppNotificationTemplate.findOne({ templateId }).lean();
  }

  /**
   * Get all notification templates
   */
  async getAllNotificationTemplates(options?: {
    isActive?: boolean | string;
    scope?: NotificationScope | string;
    category?: NotificationCategory | string;
    targetUserType?: TargetUserType | string;
    page?: number;
    limit?: number;
  }) {
    const { isActive, scope, category, targetUserType, page = 1, limit = 20 } = options || {};

    const filter: Record<string, unknown> = {};
    if (isActive !== undefined) {
      // Convert string 'true'/'false' to boolean
      filter.isActive = typeof isActive === 'string' ? isActive === 'true' : isActive;
    }
    if (scope) {
      filter.scope = scope;
    }
    if (category) {
      filter.category = category;
    }
    if (targetUserType) {
      // Templates that target this user type OR templates with empty targetUserTypes (all users)
      filter.$or = [{ targetUserTypes: targetUserType }, { targetUserTypes: { $size: 0 } }];
    }

    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      InAppNotificationTemplate.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      InAppNotificationTemplate.countDocuments(filter),
    ]);

    return {
      templates,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update notification template
   */
  async updateNotificationTemplate(
    id: string,
    data: Partial<{
      name: string;
      title: string;
      description: string;
      category: NotificationCategory | string;
      body: string;
      isActive: boolean;
      scope: NotificationScope | string;
      targetUserTypes: (TargetUserType | string)[];
    }>,
  ): Promise<IInAppNotificationTemplate | null> {
    return await InAppNotificationTemplate.findByIdAndUpdate(id, { $set: data }, { new: true });
  }

  /**
   * Delete notification template
   */
  async deleteNotificationTemplate(id: string): Promise<IInAppNotificationTemplate | null> {
    return await InAppNotificationTemplate.findByIdAndDelete(id);
  }

  /**
   * Activate/deactivate notification template
   */
  async setNotificationTemplateStatus(
    id: string,
    isActive: boolean,
  ): Promise<IInAppNotificationTemplate | null> {
    return await InAppNotificationTemplate.findByIdAndUpdate(
      id,
      { $set: { isActive } },
      { new: true },
    );
  }

  /**
   * Search notification templates
   */
  async searchNotificationTemplates(query: string) {
    return await InAppNotificationTemplate.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { templateId: { $regex: query, $options: 'i' } },
        { title: { $regex: query, $options: 'i' } },
        { body: { $regex: query, $options: 'i' } },
      ],
    })
      .limit(50)
      .lean();
  }
}

export const adminNotificationTemplateService = new AdminNotificationTemplateService();
