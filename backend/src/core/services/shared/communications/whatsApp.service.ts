import { type IWhatsAppLog, WhatsAppLog, WhatsAppStatus } from '@core/models/WhatsAppLog';
import mongoose from 'mongoose';

/**
 * WhatsApp Service
 * Handles WhatsApp log operations
 */
export class WhatsAppService {
  /**
   * Create WhatsApp log entry (called by CommunicationTriggerService)
   */
  async createWhatsAppLog(data: {
    toPhone: string;
    templateId: string;
    whatsAppTemplateName: string;
    data?: Record<string, unknown>;
    userId?: string;
    hubId?: string;
  }): Promise<IWhatsAppLog> {
    const logData = {
      ...data,
      userId: data.userId ? new mongoose.Types.ObjectId(data.userId) : undefined,
      hubId: data.hubId ? new mongoose.Types.ObjectId(data.hubId) : undefined,
      status: WhatsAppStatus.PENDING,
    };
    return WhatsAppLog.create(logData);
  }

  /**
   * Get all WhatsApp logs with pagination and filters
   */
  async getWhatsAppLogs(options?: {
    status?: WhatsAppStatus;
    templateId?: string;
    toPhone?: string;
    userId?: string;
    hubId?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      templateId,
      toPhone,
      userId,
      hubId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = options || {};

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (templateId) filter.templateId = templateId;
    if (toPhone) filter.toPhone = { $regex: toPhone, $options: 'i' };
    if (userId) filter.userId = new mongoose.Types.ObjectId(userId);
    if (hubId) filter.hubId = new mongoose.Types.ObjectId(hubId);

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

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      WhatsAppLog.find(filter)
        .populate('userId', 'email name phone')
        .populate('hubId', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      WhatsAppLog.countDocuments(filter),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single WhatsApp log by ID
   */
  async getWhatsAppLogById(id: string): Promise<IWhatsAppLog | null> {
    return WhatsAppLog.findById(id)
      .populate('userId', 'email name phone')
      .populate('hubId', 'name')
      .lean() as unknown as IWhatsAppLog | null;
  }

  /**
   * Get WhatsApp stats
   */
  async getWhatsAppStats() {
    const [total, statusCounts, templateCounts, recentCount] = await Promise.all([
      WhatsAppLog.countDocuments(),
      WhatsAppLog.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      WhatsAppLog.aggregate([
        { $group: { _id: '$templateId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      WhatsAppLog.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    statusCounts.forEach((s) => {
      byStatus[s._id] = s.count;
    });

    const topTemplates = templateCounts.map((t) => ({
      templateId: t._id,
      count: t.count,
    }));

    return {
      total,
      last24Hours: recentCount,
      byStatus,
      topTemplates,
      sent: byStatus[WhatsAppStatus.SENT] || 0,
      delivered: byStatus[WhatsAppStatus.DELIVERED] || 0,
      failed: byStatus[WhatsAppStatus.FAILED] || 0,
    };
  }

  /**
   * Search WhatsApp logs
   */
  async searchWhatsAppLogs(
    query: string,
    options?: { startDate?: string | Date; endDate?: string | Date; page?: number; limit?: number },
  ) {
    const { startDate, endDate, page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      $or: [
        { toPhone: { $regex: query, $options: 'i' } },
        { templateId: { $regex: query, $options: 'i' } },
        { whatsAppTemplateName: { $regex: query, $options: 'i' } },
      ],
    };

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

    const [logs, total] = await Promise.all([
      WhatsAppLog.find(filter)
        .populate('userId', 'email name phone')
        .populate('hubId', 'name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      WhatsAppLog.countDocuments(filter),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete WhatsApp log
   */
  async deleteWhatsAppLog(id: string): Promise<IWhatsAppLog | null> {
    return WhatsAppLog.findByIdAndDelete(id).lean() as unknown as IWhatsAppLog | null;
  }

  /**
   * Update WhatsApp log status (for webhook callbacks)
   */
  async updateWhatsAppLogStatus(
    id: string,
    status: WhatsAppStatus,
    additionalData?: { deliveredAt?: Date; readAt?: Date; error?: string },
  ): Promise<IWhatsAppLog | null> {
    const updateData: Record<string, unknown> = { status, ...additionalData };
    if (status === WhatsAppStatus.SENT) updateData.sentAt = new Date();
    if (status === WhatsAppStatus.DELIVERED) updateData.deliveredAt = new Date();
    if (status === WhatsAppStatus.READ) updateData.readAt = new Date();

    return WhatsAppLog.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    ).lean() as unknown as IWhatsAppLog | null;
  }
}

export const whatsAppService = new WhatsAppService();
