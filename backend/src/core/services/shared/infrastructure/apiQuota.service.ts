import { ApiQuota, type IApiQuota, QUOTA_LIMITS, QuotaPlan } from '@core/models/ApiQuota';
import type { Types } from 'mongoose';

/**
 * API Quota Plain Object (lean query result)
 */
export interface ApiQuotaPlain {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  userEmail?: string;
  plan: QuotaPlan;
  limits: {
    requestsPerDay: number;
    requestsPerMonth: number;
    requestsPerMinute: number;
  };
  usage: {
    daily: number;
    monthly: number;
    lastDailyReset: Date;
    lastMonthlyReset: Date;
  };
  isBlocked: boolean;
  blockedReason?: string;
  blockedAt?: Date;
  blockedUntil?: Date;
  warnings: number;
  lastWarningAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Quota check result
 */
export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  quota?: {
    plan: QuotaPlan;
    daily: { used: number; limit: number; remaining: number };
    monthly: { used: number; limit: number; remaining: number };
    perMinute: number;
  };
  retryAfter?: number; // seconds
}

/**
 * API Quota Service
 * Manages user API quotas and rate limiting
 */
export class ApiQuotaService {
  /**
   * Get or create quota for a user
   */
  async getOrCreateQuota(userId: Types.ObjectId, userEmail?: string): Promise<IApiQuota> {
    let quota = await ApiQuota.findOne({ userId });

    if (!quota) {
      const defaultLimits = QUOTA_LIMITS[QuotaPlan.FREE];
      quota = await ApiQuota.create({
        userId,
        userEmail,
        plan: QuotaPlan.FREE,
        limits: {
          requestsPerDay: defaultLimits.daily,
          requestsPerMonth: defaultLimits.monthly,
          requestsPerMinute: defaultLimits.perMinute,
        },
        usage: {
          daily: 0,
          monthly: 0,
          lastDailyReset: new Date(),
          lastMonthlyReset: new Date(),
        },
      });
    }

    return quota;
  }

  /**
   * Check if user can make a request and increment usage
   */
  async checkAndIncrement(userId: Types.ObjectId, userEmail?: string): Promise<QuotaCheckResult> {
    const quota = await this.getOrCreateQuota(userId, userEmail);

    // Check if user is blocked
    if (quota.isBlocked) {
      if (quota.blockedUntil && new Date() > quota.blockedUntil) {
        // Unblock user if block period has passed
        await this.unblockUser(userId);
      } else {
        return {
          allowed: false,
          reason: quota.blockedReason || 'User is blocked from API access',
          retryAfter: quota.blockedUntil
            ? Math.ceil((quota.blockedUntil.getTime() - Date.now()) / 1000)
            : undefined,
        };
      }
    }

    // Reset counters if needed
    const now = new Date();
    const updates: Record<string, unknown> = {};

    // Check daily reset
    const lastDailyReset = new Date(quota.usage.lastDailyReset);
    if (now.toDateString() !== lastDailyReset.toDateString()) {
      updates['usage.daily'] = 0;
      updates['usage.lastDailyReset'] = now;
      quota.usage.daily = 0;
    }

    // Check monthly reset
    const lastMonthlyReset = new Date(quota.usage.lastMonthlyReset);
    if (
      now.getMonth() !== lastMonthlyReset.getMonth() ||
      now.getFullYear() !== lastMonthlyReset.getFullYear()
    ) {
      updates['usage.monthly'] = 0;
      updates['usage.lastMonthlyReset'] = now;
      quota.usage.monthly = 0;
    }

    // Check limits
    if (quota.usage.daily >= quota.limits.requestsPerDay) {
      await this.recordWarning(userId);
      const resetTime = new Date(now);
      resetTime.setDate(resetTime.getDate() + 1);
      resetTime.setHours(0, 0, 0, 0);

      return {
        allowed: false,
        reason: 'Daily quota exceeded',
        quota: this.formatQuota(quota),
        retryAfter: Math.ceil((resetTime.getTime() - now.getTime()) / 1000),
      };
    }

    if (quota.usage.monthly >= quota.limits.requestsPerMonth) {
      await this.recordWarning(userId);
      const resetTime = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      return {
        allowed: false,
        reason: 'Monthly quota exceeded',
        quota: this.formatQuota(quota),
        retryAfter: Math.ceil((resetTime.getTime() - now.getTime()) / 1000),
      };
    }

    // Increment usage
    updates['usage.daily'] = quota.usage.daily + 1;
    updates['usage.monthly'] = quota.usage.monthly + 1;

    await ApiQuota.updateOne({ userId }, { $set: updates });

    return {
      allowed: true,
      quota: {
        plan: quota.plan,
        daily: {
          used: quota.usage.daily + 1,
          limit: quota.limits.requestsPerDay,
          remaining: quota.limits.requestsPerDay - quota.usage.daily - 1,
        },
        monthly: {
          used: quota.usage.monthly + 1,
          limit: quota.limits.requestsPerMonth,
          remaining: quota.limits.requestsPerMonth - quota.usage.monthly - 1,
        },
        perMinute: quota.limits.requestsPerMinute,
      },
    };
  }

  /**
   * Format quota for response
   */
  private formatQuota(quota: IApiQuota): QuotaCheckResult['quota'] {
    return {
      plan: quota.plan,
      daily: {
        used: quota.usage.daily,
        limit: quota.limits.requestsPerDay,
        remaining: Math.max(0, quota.limits.requestsPerDay - quota.usage.daily),
      },
      monthly: {
        used: quota.usage.monthly,
        limit: quota.limits.requestsPerMonth,
        remaining: Math.max(0, quota.limits.requestsPerMonth - quota.usage.monthly),
      },
      perMinute: quota.limits.requestsPerMinute,
    };
  }

  /**
   * Record a quota warning
   */
  private async recordWarning(userId: Types.ObjectId): Promise<void> {
    const result = await ApiQuota.findOneAndUpdate(
      { userId },
      {
        $inc: { warnings: 1 },
        $set: { lastWarningAt: new Date() },
      },
      { new: true },
    );

    // Auto-block after too many warnings (e.g., 10 in a day)
    if (result && result.warnings >= 10) {
      await this.blockUser(userId, 'Excessive quota violations', 24); // Block for 24 hours
    }
  }

  /**
   * Get user quota
   */
  async getQuota(userId: Types.ObjectId): Promise<ApiQuotaPlain | null> {
    const result = await ApiQuota.findOne({ userId }).lean();
    return result as unknown as ApiQuotaPlain | null;
  }

  /**
   * Update user plan
   */
  async updatePlan(userId: Types.ObjectId, plan: QuotaPlan): Promise<ApiQuotaPlain | null> {
    const limits = QUOTA_LIMITS[plan];

    const result = await ApiQuota.findOneAndUpdate(
      { userId },
      {
        $set: {
          plan,
          'limits.requestsPerDay': limits.daily,
          'limits.requestsPerMonth': limits.monthly,
          'limits.requestsPerMinute': limits.perMinute,
        },
      },
      { new: true },
    ).lean();
    return result as unknown as ApiQuotaPlain | null;
  }

  /**
   * Set custom limits for a user
   */
  async setCustomLimits(
    userId: Types.ObjectId,
    limits: { daily?: number; monthly?: number; perMinute?: number },
  ): Promise<ApiQuotaPlain | null> {
    const updates: Record<string, number> = {};
    if (limits.daily !== undefined) updates['limits.requestsPerDay'] = limits.daily;
    if (limits.monthly !== undefined) updates['limits.requestsPerMonth'] = limits.monthly;
    if (limits.perMinute !== undefined) updates['limits.requestsPerMinute'] = limits.perMinute;

    const result = await ApiQuota.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true },
    ).lean();
    return result as unknown as ApiQuotaPlain | null;
  }

  /**
   * Block a user
   */
  async blockUser(
    userId: Types.ObjectId,
    reason: string,
    durationHours?: number,
  ): Promise<ApiQuotaPlain | null> {
    const updates: Record<string, unknown> = {
      isBlocked: true,
      blockedReason: reason,
      blockedAt: new Date(),
    };

    if (durationHours) {
      updates.blockedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    }

    const result = await ApiQuota.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true },
    ).lean();
    return result as unknown as ApiQuotaPlain | null;
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: Types.ObjectId): Promise<ApiQuotaPlain | null> {
    const result = await ApiQuota.findOneAndUpdate(
      { userId },
      {
        $set: { isBlocked: false, warnings: 0 },
        $unset: { blockedReason: 1, blockedAt: 1, blockedUntil: 1 },
      },
      { new: true },
    ).lean();
    return result as unknown as ApiQuotaPlain | null;
  }

  /**
   * Get all quotas (admin)
   */
  async getAllQuotas(
    filters: { plan?: QuotaPlan; isBlocked?: boolean } = {},
    options: { page?: number; limit?: number } = {},
  ): Promise<{ quotas: ApiQuotaPlain[]; total: number }> {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filters.plan) query.plan = filters.plan;
    if (filters.isBlocked !== undefined) query.isBlocked = filters.isBlocked;

    const [quotas, total] = await Promise.all([
      ApiQuota.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      ApiQuota.countDocuments(query),
    ]);

    return { quotas: quotas as unknown as ApiQuotaPlain[], total };
  }

  /**
   * Get quota statistics
   */
  async getStats(): Promise<{
    totalUsers: number;
    byPlan: Record<QuotaPlan, number>;
    blockedUsers: number;
    usersNearDailyLimit: number;
    usersNearMonthlyLimit: number;
  }> {
    const [stats] = await ApiQuota.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          byPlan: [{ $group: { _id: '$plan', count: { $sum: 1 } } }],
          blocked: [{ $match: { isBlocked: true } }, { $count: 'count' }],
          nearDailyLimit: [
            {
              $match: {
                $expr: {
                  $gte: [{ $divide: ['$usage.daily', '$limits.requestsPerDay'] }, 0.8],
                },
              },
            },
            { $count: 'count' },
          ],
          nearMonthlyLimit: [
            {
              $match: {
                $expr: {
                  $gte: [{ $divide: ['$usage.monthly', '$limits.requestsPerMonth'] }, 0.8],
                },
              },
            },
            { $count: 'count' },
          ],
        },
      },
    ]);

    const byPlan: Record<QuotaPlan, number> = {
      [QuotaPlan.FREE]: 0,
      [QuotaPlan.BASIC]: 0,
      [QuotaPlan.PREMIUM]: 0,
      [QuotaPlan.ENTERPRISE]: 0,
      [QuotaPlan.UNLIMITED]: 0,
    };

    for (const item of stats?.byPlan || []) {
      if (item._id in byPlan) {
        byPlan[item._id as QuotaPlan] = item.count;
      }
    }

    return {
      totalUsers: stats?.total?.[0]?.count || 0,
      byPlan,
      blockedUsers: stats?.blocked?.[0]?.count || 0,
      usersNearDailyLimit: stats?.nearDailyLimit?.[0]?.count || 0,
      usersNearMonthlyLimit: stats?.nearMonthlyLimit?.[0]?.count || 0,
    };
  }

  /**
   * Reset daily usage for all users (called by cron job)
   */
  async resetDailyUsage(): Promise<number> {
    const result = await ApiQuota.updateMany(
      {},
      {
        $set: {
          'usage.daily': 0,
          'usage.lastDailyReset': new Date(),
        },
      },
    );
    return result.modifiedCount;
  }

  /**
   * Reset monthly usage for all users (called by cron job)
   */
  async resetMonthlyUsage(): Promise<number> {
    const result = await ApiQuota.updateMany(
      {},
      {
        $set: {
          'usage.monthly': 0,
          'usage.lastMonthlyReset': new Date(),
          warnings: 0, // Reset warnings monthly
        },
      },
    );
    return result.modifiedCount;
  }
}

// Export singleton instance
export const apiQuotaService = new ApiQuotaService();
