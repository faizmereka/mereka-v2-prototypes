import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import { ApiModule } from '@core/models/ApiLog';
import type {
  GetApiLogStatsInput,
  GetSuspiciousActivityInput,
  QueryApiLogsInput,
} from '@schemas/shared';
import {
  getApiLogStatsSchema,
  getSuspiciousActivitySchema,
  queryApiLogsSchema,
} from '@schemas/shared';
import { apiLogService, systemConfigService } from '@services/infrastructure';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Types } from 'mongoose';

/**
 * Check if error is a MongoDB timeout error
 */
function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('maxTimeMS') ||
      error.message.includes('operation exceeded time limit') ||
      error.name === 'MongoServerError' ||
      (error as unknown as { code?: number }).code === 50
    );
  }
  return false;
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error: unknown, context: string): string {
  if (isTimeoutError(error)) {
    return `Query took too long. Try using filters or a shorter date range.`;
  }
  return error instanceof Error ? error.message : `Failed to ${context}`;
}

/**
 * API Monitoring Routes
 * Admin-only routes for viewing logs, rate limit config, and security metrics
 */
export async function adminApiMonitoringRoutes(fastify: FastifyInstance): Promise<void> {
  // ============================================
  // API LOG ROUTES
  // ============================================

  /**
   * Query API logs
   */
  fastify.get<{ Querystring: QueryApiLogsInput }>(
    '/logs',
    {
      preHandler: [requireAdminAuth],
      schema: {
        tags: ['API Monitoring'],
        summary: 'Query API logs',
        description: 'Search and filter API request logs (Admin only)',
        querystring: queryApiLogsSchema.querystring,
      },
    },
    async (request: FastifyRequest<{ Querystring: QueryApiLogsInput }>, reply: FastifyReply) => {
      try {
        const { page, limit, tags, startDate, endDate, ...filters } = request.query;

        const result = await apiLogService.query(
          {
            ...filters,
            userId: filters.userId ? (filters.userId as unknown as Types.ObjectId) : undefined,
            tags: tags ? tags.split(',').map((t) => t.trim()) : undefined,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
          },
          { page, limit },
        );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to query API logs');
        const statusCode = isTimeoutError(error) ? 408 : 500;
        return reply.status(statusCode).send({
          success: false,
          error: {
            code: isTimeoutError(error) ? 'QUERY_TIMEOUT' : 'QUERY_LOGS_ERROR',
            message: getErrorMessage(error, 'query logs'),
          },
        });
      }
    },
  );

  /**
   * Get API log statistics
   */
  fastify.get<{ Querystring: GetApiLogStatsInput }>(
    '/logs/stats',
    {
      preHandler: [requireAdminAuth],
      schema: {
        tags: ['API Monitoring'],
        summary: 'Get API log statistics',
        description: 'Get aggregated statistics for API requests',
        querystring: getApiLogStatsSchema.querystring,
      },
    },
    async (request: FastifyRequest<{ Querystring: GetApiLogStatsInput }>, reply: FastifyReply) => {
      try {
        const { startDate, endDate } = request.query;

        // Default to last 24 hours
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate
          ? new Date(startDate)
          : new Date(end.getTime() - 24 * 60 * 60 * 1000);

        const stats = await apiLogService.getStats(start, end);

        return reply.send({
          success: true,
          data: {
            ...stats,
            period: { start: start.toISOString(), end: end.toISOString() },
          },
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to get API log stats');
        const statusCode = isTimeoutError(error) ? 408 : 500;
        return reply.status(statusCode).send({
          success: false,
          error: {
            code: isTimeoutError(error) ? 'STATS_TIMEOUT' : 'STATS_ERROR',
            message: getErrorMessage(error, 'get stats'),
          },
        });
      }
    },
  );

  // Simple schemas for routes (JSON Schema)
  const paginationSchema = {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
    },
  } as const;

  /**
   * Get error logs
   */
  fastify.get<{ Querystring: { page?: number; limit?: number } }>(
    '/logs/errors',
    {
      preHandler: [requireAdminAuth],
      schema: {
        tags: ['API Monitoring'],
        summary: 'Get error logs',
        description: 'Get recent error logs',
        querystring: paginationSchema,
      },
    },
    async (request, reply) => {
      try {
        const { page = 1, limit = 50 } = request.query;
        const result = await apiLogService.getErrors({ page, limit });

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to get error logs');
        const statusCode = isTimeoutError(error) ? 408 : 500;
        return reply.status(statusCode).send({
          success: false,
          error: {
            code: isTimeoutError(error) ? 'ERROR_LOGS_TIMEOUT' : 'ERROR_LOGS_ERROR',
            message: getErrorMessage(error, 'get error logs'),
          },
        });
      }
    },
  );

  /**
   * Get suspicious activity
   */
  fastify.get<{ Querystring: GetSuspiciousActivityInput }>(
    '/logs/suspicious',
    {
      preHandler: [requireAdminAuth],
      schema: {
        tags: ['API Monitoring'],
        summary: 'Get suspicious activity',
        description: 'Detect potential attacks or abuse patterns',
        querystring: getSuspiciousActivitySchema.querystring,
      },
    },
    async (
      request: FastifyRequest<{ Querystring: GetSuspiciousActivityInput }>,
      reply: FastifyReply,
    ) => {
      try {
        const result = await apiLogService.getSuspiciousActivity(request.query);

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to get suspicious activity');
        const statusCode = isTimeoutError(error) ? 408 : 500;
        return reply.status(statusCode).send({
          success: false,
          error: {
            code: isTimeoutError(error) ? 'SUSPICIOUS_TIMEOUT' : 'SUSPICIOUS_ACTIVITY_ERROR',
            message: getErrorMessage(error, 'get suspicious activity'),
          },
        });
      }
    },
  );

  // ============================================
  // RATE LIMIT CONFIG ROUTES
  // ============================================

  // Rate limit config schema (JSON Schema)
  const rateLimitConfigSchema = {
    type: 'object',
    required: ['skipPaths', 'skipSuperAdmin', 'unauthenticated', 'authenticated'],
    properties: {
      skipPaths: { type: 'array', items: { type: 'string' } },
      skipSuperAdmin: { type: 'boolean' },
      unauthenticated: {
        type: 'object',
        required: ['perMinute', 'perDay'],
        properties: {
          perMinute: { type: 'integer', minimum: 1 },
          perDay: { type: 'integer', minimum: 1 },
        },
      },
      authenticated: {
        type: 'object',
        required: ['perMinute', 'perDay'],
        properties: {
          perMinute: { type: 'integer', minimum: 1 },
          perDay: { type: 'integer', minimum: 1 },
        },
      },
    },
  } as const;

  interface RateLimitConfig {
    skipPaths: string[];
    skipSuperAdmin: boolean;
    unauthenticated: { perMinute: number; perDay: number };
    authenticated: { perMinute: number; perDay: number };
  }

  /**
   * Get rate limit configuration (from MongoDB)
   */
  fastify.get(
    '/config/rate-limits',
    {
      preHandler: [requireAdminAuth],
      schema: {
        tags: ['API Monitoring'],
        summary: 'Get rate limit configuration',
        description: 'Get the current rate limit configuration from database',
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const rateLimits = await systemConfigService.getRateLimits();
        return reply.send({
          success: true,
          data: rateLimits,
        });
      } catch (error) {
        _request.log.error({ error }, 'Failed to get rate limit config');
        return reply.status(500).send({
          success: false,
          error: {
            code: 'GET_CONFIG_ERROR',
            message: error instanceof Error ? error.message : 'Failed to get configuration',
          },
        });
      }
    },
  );

  /**
   * Update rate limit configuration (to MongoDB)
   */
  fastify.put<{ Body: RateLimitConfig }>(
    '/config/rate-limits',
    {
      preHandler: [requireAdminAuth],
      schema: {
        tags: ['API Monitoring'],
        summary: 'Update rate limit configuration',
        description: 'Update the rate limit configuration in database',
        body: rateLimitConfigSchema,
      },
    },
    async (request: FastifyRequest<{ Body: RateLimitConfig }>, reply: FastifyReply) => {
      try {
        // Config is already validated by Fastify's JSON Schema validation
        const validatedConfig = request.body;

        // Get admin user info for audit
        const adminUser = (request as unknown as { adminUser?: { email?: string } }).adminUser;

        // Update config in MongoDB
        const updatedConfig = await systemConfigService.updateRateLimits(
          validatedConfig,
          adminUser?.email,
        );

        request.log.info(
          { config: updatedConfig, updatedBy: adminUser?.email },
          'Rate limit config updated',
        );

        return reply.send({
          success: true,
          data: updatedConfig,
          message: 'Rate limit configuration updated successfully',
        });
      } catch (error) {
        request.log.error({ error }, 'Failed to update rate limit config');
        return reply.status(400).send({
          success: false,
          error: {
            code: 'UPDATE_CONFIG_ERROR',
            message: error instanceof Error ? error.message : 'Failed to update configuration',
          },
        });
      }
    },
  );

  // ============================================
  // MODULE ENUM ROUTE (for frontend dropdown)
  // ============================================

  /**
   * Get available API modules
   */
  fastify.get(
    '/modules',
    {
      preHandler: [requireAdminAuth],
      schema: {
        tags: ['API Monitoring'],
        summary: 'Get available API modules',
        description: 'Get list of module names for filtering',
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        success: true,
        data: Object.values(ApiModule),
      });
    },
  );
}
