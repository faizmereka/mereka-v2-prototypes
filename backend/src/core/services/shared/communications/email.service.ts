import { Email, EmailStatus, type EmailType, type IEmail } from '@core/models/Email';

/**
 * Email Service
 * Handles email log operations
 */
export class EmailService {
  /**
   * Get all email logs with pagination and filters
   */
  async getEmailLogs(options?: {
    status?: EmailStatus;
    emailType?: EmailType;
    toEmail?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    page?: number;
    limit?: number;
  }) {
    const { status, emailType, toEmail, startDate, endDate, page = 1, limit = 20 } = options || {};

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (emailType) filter.emailType = emailType;
    if (toEmail) filter.toEmail = { $regex: toEmail, $options: 'i' };

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        (filter.createdAt as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        (filter.createdAt as Record<string, Date>).$lte = endOfDay;
      }
    }

    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      Email.find(filter)
        .populate('userId', 'email name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Email.countDocuments(filter),
    ]);

    return {
      emails,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single email log by ID
   */
  async getEmailById(id: string): Promise<IEmail | null> {
    return Email.findById(id).populate('userId', 'email name').lean() as unknown as IEmail | null;
  }

  /**
   * Get email stats
   */
  async getEmailStats() {
    const [total, statusCounts, typeCounts, recentCount] = await Promise.all([
      Email.countDocuments(),
      Email.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Email.aggregate([
        { $group: { _id: '$emailType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Email.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    statusCounts.forEach((s) => {
      byStatus[s._id] = s.count;
    });

    const topTypes: Array<{ type: string; count: number }> = typeCounts.map((t) => ({
      type: t._id,
      count: t.count,
    }));

    return {
      total,
      last24Hours: recentCount,
      byStatus,
      topTypes,
      delivered: byStatus[EmailStatus.DELIVERED] || 0,
      failed: byStatus[EmailStatus.FAILED] || 0,
      bounced: byStatus[EmailStatus.BOUNCED] || 0,
    };
  }

  /**
   * Search email logs
   */
  async searchEmails(
    query: string,
    options?: { startDate?: string | Date; endDate?: string | Date; page?: number; limit?: number },
  ) {
    const { startDate, endDate, page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      $or: [
        { toEmail: { $regex: query, $options: 'i' } },
        { emailType: { $regex: query, $options: 'i' } },
        { sendGridTemplateId: { $regex: query, $options: 'i' } },
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

    const [emails, total] = await Promise.all([
      Email.find(filter)
        .populate('userId', 'email name')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Email.countDocuments(filter),
    ]);

    return {
      emails,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete email log
   */
  async deleteEmail(id: string): Promise<IEmail | null> {
    return Email.findByIdAndDelete(id).lean() as unknown as IEmail | null;
  }
}

export const emailService = new EmailService();
