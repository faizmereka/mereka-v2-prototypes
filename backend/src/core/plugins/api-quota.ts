import { env } from '@core/config/env';
import { apiQuotaService } from '@services/infrastructure';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { Types } from 'mongoose';

/**
 * API Quota Plugin Configuration
 */
export interface ApiQuotaConfig {
  enabled: boolean;
  skipPaths?: string[];
  skipUnauthenticated?: boolean; // Skip quota check for unauthenticated requests
}

const defaultConfig: ApiQuotaConfig = {
  enabled: true,
  skipPaths: ['/health', '/docs', '/', '/api/v1/auth/login', '/api/v1/auth/register'],
  skipUnauthenticated: true, // Rate limiting handles unauthenticated users
};

/**
 * API Quota Plugin
 * Enforces per-user API quotas (daily/monthly limits)
 */
async function apiQuotaPlugin(
  fastify: FastifyInstance,
  options: Partial<ApiQuotaConfig> = {},
): Promise<void> {
  const config: ApiQuotaConfig = { ...defaultConfig, ...options };

  if (!config.enabled) {
    fastify.log.info('API Quota plugin disabled');
    return;
  }

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip in test mode
    if (env.isTest) {
      return;
    }

    // Skip certain paths
    if (config.skipPaths?.some((path) => request.url.startsWith(path))) {
      return;
    }

    // Get user from request (set by auth middleware)
    const user = (request as unknown as { user?: { userId?: string; email?: string } }).user;

    // Skip if no user and configured to skip unauthenticated
    if (!user?.userId && config.skipUnauthenticated) {
      return;
    }

    // If user is authenticated, check quota
    if (user?.userId) {
      const userId = user.userId as unknown as Types.ObjectId;
      const result = await apiQuotaService.checkAndIncrement(userId, user.email);

      // Add quota headers
      if (result.quota) {
        reply.header('X-Quota-Plan', result.quota.plan);
        reply.header('X-Quota-Daily-Limit', result.quota.daily.limit);
        reply.header('X-Quota-Daily-Remaining', result.quota.daily.remaining);
        reply.header('X-Quota-Monthly-Limit', result.quota.monthly.limit);
        reply.header('X-Quota-Monthly-Remaining', result.quota.monthly.remaining);
      }

      if (!result.allowed) {
        if (result.retryAfter) {
          reply.header('Retry-After', result.retryAfter);
        }

        return reply.status(429).send({
          success: false,
          error: {
            code: 'QUOTA_EXCEEDED',
            message: result.reason || 'API quota exceeded',
            quota: result.quota,
            retryAfter: result.retryAfter,
          },
        });
      }
    }
  });

  fastify.log.info('API Quota plugin registered');
}

export default fp(apiQuotaPlugin, {
  name: 'api-quota',
  fastify: '5.x',
  // No plugin dependencies - checks for user set by auth middleware
});
