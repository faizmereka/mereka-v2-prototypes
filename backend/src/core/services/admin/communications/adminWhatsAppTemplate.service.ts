import { NotificationScope, type TargetUserType } from '@core/models/enums/NotificationEnums';
import { type IWhatsAppTemplate, WhatsAppTemplate } from '@core/models/WhatsAppTemplate';

/**
 * Admin WhatsApp Template Service
 * Handles WhatsApp template CRUD operations
 *
 * WhatsApp template fields: templateId, name, title, description, category,
 * whatsAppTemplateName, languageCode, bodyPreview, isActive, scope, targetUserTypes
 */
export class AdminWhatsAppTemplateService {
  /**
   * Create WhatsApp template
   */
  async createWhatsAppTemplate(data: {
    templateId: string;
    name: string;
    title: string;
    description: string;
    category: string;
    whatsAppTemplateName: string;
    languageCode?: string;
    bodyPreview: string;
    scope?: NotificationScope | string;
    targetUserTypes?: (TargetUserType | string)[];
  }): Promise<IWhatsAppTemplate> {
    const templateData = {
      ...data,
      templateId: data.templateId.toUpperCase(),
      scope: data.scope || NotificationScope.USER,
      targetUserTypes: data.targetUserTypes || [],
    };
    return WhatsAppTemplate.create(templateData);
  }

  /**
   * Get WhatsApp template by MongoDB ID
   */
  async getWhatsAppTemplateById(id: string): Promise<IWhatsAppTemplate | null> {
    return WhatsAppTemplate.findById(id).lean() as unknown as IWhatsAppTemplate | null;
  }

  /**
   * Get WhatsApp template by templateId
   */
  async getWhatsAppTemplateByTemplateId(templateId: string): Promise<IWhatsAppTemplate | null> {
    return WhatsAppTemplate.findOne({
      templateId: templateId.toUpperCase(),
    }).lean() as unknown as IWhatsAppTemplate | null;
  }

  /**
   * Get all WhatsApp templates (with pagination and filters)
   */
  async getAllWhatsAppTemplates(options?: {
    isActive?: boolean | string;
    category?: string;
    scope?: NotificationScope | string;
    targetUserType?: TargetUserType | string;
    page?: number;
    limit?: number;
  }) {
    const { isActive, category, scope, targetUserType, page = 1, limit = 20 } = options || {};

    const filter: Record<string, unknown> = {};
    if (isActive !== undefined) {
      filter.isActive = typeof isActive === 'string' ? isActive === 'true' : isActive;
    }
    if (category) {
      filter.category = category;
    }
    if (scope) {
      filter.scope = scope;
    }
    if (targetUserType) {
      // Templates that target this user type OR templates with empty targetUserTypes (all users)
      filter.$or = [{ targetUserTypes: targetUserType }, { targetUserTypes: { $size: 0 } }];
    }

    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      WhatsAppTemplate.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      WhatsAppTemplate.countDocuments(filter),
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
   * Update WhatsApp template by MongoDB ID
   */
  async updateWhatsAppTemplate(
    id: string,
    data: {
      name?: string;
      title?: string;
      description?: string;
      category?: string;
      whatsAppTemplateName?: string;
      languageCode?: string;
      bodyPreview?: string;
      isActive?: boolean;
      scope?: NotificationScope | string;
      targetUserTypes?: (TargetUserType | string)[];
    },
  ): Promise<IWhatsAppTemplate | null> {
    return WhatsAppTemplate.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    ).lean() as unknown as IWhatsAppTemplate | null;
  }

  /**
   * Update WhatsApp template by templateId
   */
  async updateWhatsAppTemplateByTemplateId(
    templateId: string,
    data: {
      name?: string;
      title?: string;
      description?: string;
      category?: string;
      whatsAppTemplateName?: string;
      languageCode?: string;
      bodyPreview?: string;
      isActive?: boolean;
      scope?: NotificationScope | string;
      targetUserTypes?: (TargetUserType | string)[];
    },
  ): Promise<IWhatsAppTemplate | null> {
    return WhatsAppTemplate.findOneAndUpdate(
      { templateId: templateId.toUpperCase() },
      { $set: data },
      { new: true },
    ).lean() as unknown as IWhatsAppTemplate | null;
  }

  /**
   * Delete WhatsApp template
   */
  async deleteWhatsAppTemplate(id: string): Promise<IWhatsAppTemplate | null> {
    return WhatsAppTemplate.findByIdAndDelete(id).lean() as unknown as IWhatsAppTemplate | null;
  }

  /**
   * Set WhatsApp template status (activate/deactivate)
   */
  async setWhatsAppTemplateStatus(
    id: string,
    isActive: boolean,
  ): Promise<IWhatsAppTemplate | null> {
    return WhatsAppTemplate.findByIdAndUpdate(
      id,
      { $set: { isActive } },
      { new: true },
    ).lean() as unknown as IWhatsAppTemplate | null;
  }

  /**
   * Search WhatsApp templates
   */
  async searchWhatsAppTemplates(query: string, options?: { page?: number; limit?: number }) {
    const { page = 1, limit = 50 } = options || {};
    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        { templateId: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } },
        { title: { $regex: query, $options: 'i' } },
        { whatsAppTemplateName: { $regex: query, $options: 'i' } },
      ],
    };

    const [templates, total] = await Promise.all([
      WhatsAppTemplate.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      WhatsAppTemplate.countDocuments(filter),
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
   * Get WhatsApp template stats
   */
  async getWhatsAppTemplateStats() {
    const [total, activeCount, inactiveCount, byCategory] = await Promise.all([
      WhatsAppTemplate.countDocuments(),
      WhatsAppTemplate.countDocuments({ isActive: true }),
      WhatsAppTemplate.countDocuments({ isActive: false }),
      WhatsAppTemplate.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $project: { category: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    return {
      total,
      active: activeCount,
      inactive: inactiveCount,
      byCategory,
    };
  }
}

export const adminWhatsAppTemplateService = new AdminWhatsAppTemplateService();
