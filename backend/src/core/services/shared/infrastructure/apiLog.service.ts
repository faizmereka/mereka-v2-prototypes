import { ApiLog, ApiLogLevel, type ApiModule } from '@core/models/ApiLog';
import type { Types } from 'mongoose';

// Query timeout in milliseconds (30 seconds)
const QUERY_TIMEOUT_MS = 30000;
// Max date range for stats queries (7 days)
const MAX_STATS_DAYS = 7;

/**
 * API Log Plain Object (lean query result)
 */
export interface ApiLogPlain {
  _id: Types.ObjectId;
  requestId: string;
  userId?: Types.ObjectId;
  userEmail?: string;
  method: string;
  path: string;
  route?: string;
  module?: ApiModule;
  statusCode: number;
  responseTime: number;
  ip: string;
  userAgent?: string;
  referer?: string;
  query?: Record<string, unknown>;
  contentLength?: number;
  responseSize?: number;
  level: ApiLogLevel;
  errorCode?: string;
  errorMessage?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * API Log Entry Input
 */
export interface CreateApiLogInput {
  requestId: string;
  userId?: Types.ObjectId;
  userEmail?: string;
  method: string;
  path: string;
  route?: string;
  module?: ApiModule;
  statusCode: number;
  responseTime: number;
  ip: string;
  userAgent?: string;
  referer?: string;
  query?: Record<string, unknown>;
  contentLength?: number;
  responseSize?: number;
  errorCode?: string;
  errorMessage?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Query filters for API logs
 */
export interface ApiLogFilters {
  userId?: Types.ObjectId;
  method?: string;
  path?: string;
  module?: ApiModule;
  statusCode?: number;
  statusCodeGte?: number;
  statusCodeLte?: number;
  ip?: string;
  level?: ApiLogLevel;
  errorCode?: string;
  tags?: string[];
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

/**
 * API Log Service
 * Handles logging and querying of API requests
 */
export class ApiLogService {
  /**
   * Create a new API log entry
   * Uses fire-and-forget pattern to not block requests
   */
  async log(input: CreateApiLogInput): Promise<void> {
    try {
      const level = this.determineLogLevel(input.statusCode);

      await ApiLog.create({
        ...input,
        level,
      });
    } catch (error) {
      // Don't throw - logging should never break the request
      console.error('Failed to create API log:', error);
    }
  }

  /**
   * Batch create log entries (for bulk operations)
   */
  async logBatch(inputs: CreateApiLogInput[]): Promise<void> {
    try {
      const logs = inputs.map((input) => ({
        ...input,
        level: this.determineLogLevel(input.statusCode),
      }));

      await ApiLog.insertMany(logs, { ordered: false });
    } catch (error) {
      console.error('Failed to create batch API logs:', error);
    }
  }

  /**
   * Determine log level based on status code
   */
  private determineLogLevel(statusCode: number): ApiLogLevel {
    if (statusCode >= 500) return ApiLogLevel.ERROR;
    if (statusCode >= 400) return ApiLogLevel.WARN;
    return ApiLogLevel.INFO;
  }

  /**
   * Query API logs with filters
   * Uses maxTimeMS to prevent hanging queries
   */
  async query(
    filters: ApiLogFilters,
    options: { page?: number; limit?: number; sort?: Record<string, 1 | -1> } = {},
  ): Promise<{ logs: ApiLogPlain[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 50, sort = { createdAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const query = this.buildQuery(filters);
    const hasFilters = Object.keys(filters).length > 0;

    const [logs, total] = await Promise.all([
      ApiLog.find(query).sort(sort).skip(skip).limit(limit).maxTimeMS(QUERY_TIMEOUT_MS).lean(),
      // Use estimatedDocumentCount when no filters (much faster)
      hasFilters
        ? ApiLog.countDocuments(query).maxTimeMS(QUERY_TIMEOUT_MS)
        : ApiLog.estimatedDocumentCount(),
    ]);

    return {
      logs: logs as unknown as ApiLogPlain[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Build MongoDB query from filters
   */
  private buildQuery(filters: ApiLogFilters): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.method) query.method = filters.method;
    if (filters.path) query.path = { $regex: filters.path, $options: 'i' };
    if (filters.module) query.module = filters.module;
    if (filters.ip) query.ip = filters.ip;
    if (filters.level) query.level = filters.level;
    if (filters.errorCode) query.errorCode = filters.errorCode;

    if (filters.statusCode) {
      query.statusCode = filters.statusCode;
    } else if (filters.statusCodeGte || filters.statusCodeLte) {
      query.statusCode = {};
      if (filters.statusCodeGte)
        (query.statusCode as Record<string, number>).$gte = filters.statusCodeGte;
      if (filters.statusCodeLte)
        (query.statusCode as Record<string, number>).$lte = filters.statusCodeLte;
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) (query.createdAt as Record<string, Date>).$gte = filters.startDate;
      if (filters.endDate) (query.createdAt as Record<string, Date>).$lte = filters.endDate;
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    return query;
  }

  /**
   * Get logs by user ID
   */
  async getByUserId(
    userId: Types.ObjectId,
    options: { page?: number; limit?: number } = {},
  ): Promise<{ logs: ApiLogPlain[]; total: number }> {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;
    const query = { userId };

    const [logs, total] = await Promise.all([
      ApiLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .maxTimeMS(QUERY_TIMEOUT_MS)
        .lean(),
      ApiLog.countDocuments(query).maxTimeMS(QUERY_TIMEOUT_MS),
    ]);

    return { logs: logs as unknown as ApiLogPlain[], total };
  }

  /**
   * Get error logs
   */
  async getErrors(
    options: { page?: number; limit?: number; startDate?: Date } = {},
  ): Promise<{ logs: ApiLogPlain[]; total: number }> {
    const { page = 1, limit = 50, startDate } = options;
    const skip = (page - 1) * limit;

    // Default to last 24 hours if no start date to prevent slow queries
    const effectiveStartDate = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const query: Record<string, unknown> = {
      level: ApiLogLevel.ERROR,
      createdAt: { $gte: effectiveStartDate },
    };

    const [logs, total] = await Promise.all([
      ApiLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .maxTimeMS(QUERY_TIMEOUT_MS)
        .lean(),
      ApiLog.countDocuments(query).maxTimeMS(QUERY_TIMEOUT_MS),
    ]);

    return { logs: logs as unknown as ApiLogPlain[], total };
  }

  /**
   * Get request statistics for a time period
   * Limits date range to MAX_STATS_DAYS to prevent slow queries
   */
  async getStats(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalRequests: number;
    uniqueUsers: number;
    uniqueIPs: number;
    avgResponseTime: number;
    errorRate: number;
    statusCodeDistribution: Record<string, number>;
    topPaths: Array<{ path: string; count: number }>;
    topUsers: Array<{ userId: string; count: number }>;
  }> {
    // Limit date range to prevent slow queries
    const maxStartDate = new Date(endDate.getTime() - MAX_STATS_DAYS * 24 * 60 * 60 * 1000);
    const effectiveStartDate = startDate < maxStartDate ? maxStartDate : startDate;

    const matchStage = {
      createdAt: { $gte: effectiveStartDate, $lte: endDate },
    };

    // Run separate queries instead of $facet with $addToSet to avoid memory issues
    const [basicStats, uniqueUsers, uniqueIPs, statusCodes, topPaths, topUsers] = await Promise.all(
      [
        // Basic stats (count, avg response time, errors)
        ApiLog.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: null,
              totalRequests: { $sum: 1 },
              avgResponseTime: { $avg: '$responseTime' },
              errors: {
                $sum: { $cond: [{ $eq: ['$level', 'error'] }, 1, 0] },
              },
            },
          },
        ]).option({ maxTimeMS: QUERY_TIMEOUT_MS }),

        // Count unique users (memory-efficient)
        ApiLog.distinct('userId', matchStage).maxTimeMS(QUERY_TIMEOUT_MS),

        // Count unique IPs (memory-efficient)
        ApiLog.distinct('ip', matchStage).maxTimeMS(QUERY_TIMEOUT_MS),

        // Status code distribution
        ApiLog.aggregate([
          { $match: matchStage },
          { $group: { _id: '$statusCode', count: { $sum: 1 } } },
          { $limit: 50 }, // Limit status codes
        ]).option({ maxTimeMS: QUERY_TIMEOUT_MS }),

        // Top paths
        ApiLog.aggregate([
          { $match: matchStage },
          { $group: { _id: '$path', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]).option({ maxTimeMS: QUERY_TIMEOUT_MS }),

        // Top users
        ApiLog.aggregate([
          { $match: { ...matchStage, userId: { $exists: true, $ne: null } } },
          { $group: { _id: '$userId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]).option({ maxTimeMS: QUERY_TIMEOUT_MS }),
      ],
    );

    const totals = basicStats?.[0] || {
      totalRequests: 0,
      avgResponseTime: 0,
      errors: 0,
    };

    const statusCodeDistribution: Record<string, number> = {};
    for (const item of statusCodes || []) {
      statusCodeDistribution[String(item._id)] = item.count;
    }

    return {
      totalRequests: totals.totalRequests,
      uniqueUsers: uniqueUsers?.length || 0,
      uniqueIPs: uniqueIPs?.length || 0,
      avgResponseTime: Math.round(totals.avgResponseTime || 0),
      errorRate:
        totals.totalRequests > 0
          ? Math.round((totals.errors / totals.totalRequests) * 10000) / 100
          : 0,
      statusCodeDistribution,
      topPaths: (topPaths || []).map((p: { _id: string; count: number }) => ({
        path: p._id,
        count: p.count,
      })),
      topUsers: (topUsers || []).map((u: { _id: string; count: number }) => ({
        userId: String(u._id),
        count: u.count,
      })),
    };
  }

  /**
   * Get suspicious activity (potential attacks)
   * Uses separate queries instead of $facet for better performance
   */
  async getSuspiciousActivity(options: { minutes?: number; threshold?: number } = {}): Promise<{
    highVolumeIPs: Array<{ ip: string; count: number }>;
    highErrorRateIPs: Array<{ ip: string; errorRate: number; count: number }>;
    blockedAttempts: number;
  }> {
    // Limit to max 60 minutes to prevent slow queries
    const { minutes = 15, threshold = 100 } = options;
    const effectiveMinutes = Math.min(minutes, 60);
    const since = new Date(Date.now() - effectiveMinutes * 60 * 1000);
    const matchStage = { createdAt: { $gte: since } };

    // Run separate queries for better performance
    const [highVolumeIPs, errorsByIP, blockedCount] = await Promise.all([
      // High volume IPs
      ApiLog.aggregate([
        { $match: matchStage },
        { $group: { _id: '$ip', count: { $sum: 1 } } },
        { $match: { count: { $gte: threshold } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]).option({ maxTimeMS: QUERY_TIMEOUT_MS }),

      // High error rate IPs
      ApiLog.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$ip',
            total: { $sum: 1 },
            errors: {
              $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] },
            },
          },
        },
        { $match: { total: { $gte: 10 } } }, // Filter early to reduce processing
        {
          $project: {
            ip: '$_id',
            count: '$total',
            errorRate: {
              $multiply: [{ $divide: ['$errors', '$total'] }, 100],
            },
          },
        },
        { $match: { errorRate: { $gte: 50 } } },
        { $sort: { errorRate: -1 } },
        { $limit: 20 },
      ]).option({ maxTimeMS: QUERY_TIMEOUT_MS }),

      // Blocked attempts count
      ApiLog.countDocuments({ ...matchStage, statusCode: 429 }).maxTimeMS(QUERY_TIMEOUT_MS),
    ]);

    return {
      highVolumeIPs: (highVolumeIPs || []).map((i: { _id: string; count: number }) => ({
        ip: i._id,
        count: i.count,
      })),
      highErrorRateIPs: (errorsByIP || []).map(
        (i: { ip: string; errorRate: number; count: number }) => ({
          ip: i.ip,
          errorRate: Math.round(i.errorRate * 100) / 100,
          count: i.count,
        }),
      ),
      blockedAttempts: blockedCount || 0,
    };
  }

  /**
   * Clean up old logs (manual cleanup, TTL handles automatic)
   */
  async cleanup(daysOld: number): Promise<number> {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const result = await ApiLog.deleteMany({ createdAt: { $lt: cutoff } });
    return result.deletedCount;
  }
}

// Export singleton instance
export const apiLogService = new ApiLogService();
