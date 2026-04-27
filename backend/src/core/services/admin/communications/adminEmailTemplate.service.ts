import {
  EmailTemplate,
  type EmailTemplateCategory,
  type IEmailTemplate,
} from '@core/models/EmailTemplate';
import { NotificationScope, type TargetUserType } from '@core/models/enums/NotificationEnums';

/**
 * Admin Email Template Service
 * Handles email template CRUD operations
 *
 * Email template fields: templateId, name, title, description, category, sendGridTemplateId, scope, targetUserTypes
 */
export class AdminEmailTemplateService {
  /**
   * Create email template
   */
  async createEmailTemplate(data: {
    templateId: string;
    name: string;
    title: string;
    description: string;
    category: EmailTemplateCategory | string;
    sendGridTemplateId: string;
    scope?: NotificationScope | string;
    targetUserTypes?: (TargetUserType | string)[];
  }): Promise<IEmailTemplate> {
    const template = await EmailTemplate.create({
      ...data,
      scope: data.scope || NotificationScope.USER,
      targetUserTypes: data.targetUserTypes || [],
    });
    return template;
  }

  /**
   * Get email template by ID
   */
  async getEmailTemplateById(id: string): Promise<IEmailTemplate | null> {
    return EmailTemplate.findById(id).lean() as unknown as IEmailTemplate | null;
  }

  /**
   * Get email template by templateId
   */
  async getEmailTemplateByTemplateId(templateId: string): Promise<IEmailTemplate | null> {
    return EmailTemplate.findOne({
      templateId: templateId.toUpperCase(),
    }).lean() as unknown as IEmailTemplate | null;
  }

  /**
   * Get all email templates (with pagination and filters)
   */
  async getAllEmailTemplates(options?: {
    isActive?: boolean | string;
    scope?: NotificationScope | string;
    category?: EmailTemplateCategory | string;
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
      EmailTemplate.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      EmailTemplate.countDocuments(filter),
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
   * Update email template
   */
  async updateEmailTemplate(
    id: string,
    data: {
      name?: string;
      title?: string;
      description?: string;
      category?: EmailTemplateCategory | string;
      sendGridTemplateId?: string;
      isActive?: boolean;
      scope?: NotificationScope | string;
      targetUserTypes?: (TargetUserType | string)[];
    },
  ): Promise<IEmailTemplate | null> {
    return EmailTemplate.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    ).lean() as unknown as IEmailTemplate | null;
  }

  /**
   * Update email template by templateId
   */
  async updateEmailTemplateByTemplateId(
    templateId: string,
    data: {
      name?: string;
      title?: string;
      description?: string;
      category?: EmailTemplateCategory | string;
      sendGridTemplateId?: string;
      isActive?: boolean;
      scope?: NotificationScope | string;
      targetUserTypes?: (TargetUserType | string)[];
    },
  ): Promise<IEmailTemplate | null> {
    return EmailTemplate.findOneAndUpdate(
      { templateId: templateId.toUpperCase() },
      { $set: data },
      { new: true },
    ).lean() as unknown as IEmailTemplate | null;
  }

  /**
   * Delete email template
   */
  async deleteEmailTemplate(id: string): Promise<IEmailTemplate | null> {
    return EmailTemplate.findByIdAndDelete(id).lean() as unknown as IEmailTemplate | null;
  }

  /**
   * Set email template status (activate/deactivate)
   */
  async setEmailTemplateStatus(id: string, isActive: boolean): Promise<IEmailTemplate | null> {
    return EmailTemplate.findByIdAndUpdate(
      id,
      { $set: { isActive } },
      { new: true },
    ).lean() as unknown as IEmailTemplate | null;
  }

  /**
   * Search email templates
   */
  async searchEmailTemplates(query: string, options?: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { templateId: { $regex: query, $options: 'i' } },
        { sendGridTemplateId: { $regex: query, $options: 'i' } },
      ],
    };

    const [templates, total] = await Promise.all([
      EmailTemplate.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      EmailTemplate.countDocuments(filter),
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
   * Get email template stats
   */
  async getEmailTemplateStats() {
    const [total, activeCount, inactiveCount] = await Promise.all([
      EmailTemplate.countDocuments(),
      EmailTemplate.countDocuments({ isActive: true }),
      EmailTemplate.countDocuments({ isActive: false }),
    ]);

    return {
      total,
      active: activeCount,
      inactive: inactiveCount,
    };
  }
}

export const adminEmailTemplateService = new AdminEmailTemplateService();
