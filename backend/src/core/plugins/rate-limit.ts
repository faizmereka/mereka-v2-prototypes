import { env } from '@core/config/env';
import type { IRateLimitConfig } from '@core/models/SystemConfig';
import { systemConfigService } from '@services/infrastructure';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

/**
 * In-memory rate limit store
 * For production, consider using Redis for distributed rate limiting
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Cached database config - refreshes every 30 seconds
 */
let cachedDbConfig: IRateLimitConfig | null = null;
let cacheLastUpdated = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Get cached rate limit config from database
 */
async function getCachedDbConfig(log?: {
  warn: (obj: unknown, msg: string) => void;
}): Promise<IRateLimitConfig | null> {
  const now = Date.now();

  // Return cached config if still valid
  if (cachedDbConfig && now - cacheLastUpdated < CACHE_TTL_MS) {
    return cachedDbConfig;
  }

  // Fetch fresh config from database
  try {
    cachedDbConfig = await systemConfigService.getRateLimits();
    cacheLastUpdated = now;
    return cachedDbConfig;
  } catch (error) {
    log?.warn({ error }, 'Failed to fetch rate limit config from DB, using cached or defaults');
    return cachedDbConfig; // Return stale cache if available
  }
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  max: number; // Maximum requests per window
  windowMs: number; // Time window in milliseconds
  keyGenerator?: (request: FastifyRequest) => string;
  skipPaths?: string[];
  skipSuccessfulRequests?: boolean;
  message?: string;
}

const defaultConfig: RateLimitConfig = {
  max: 3000, // 3000 requests per minute
  windowMs: 60 * 1000, // per minute
  skipPaths: ['/health', '/docs'],
  skipSuccessfulRequests: false,
  message: 'Too many requests, please try again later',
};

/**
 * Check if user is a super admin
 */
function isSuperAdmin(request: FastifyRequest): boolean {
  const adminUser = (request as unknown as { adminUser?: { role?: string } }).adminUser;
  return adminUser?.role === 'superAdmin';
}

/**
 * Clean up expired entries periodically
 */
function startCleanup(): void {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 60 * 1000); // Clean every minute
}

/**
 * Rate Limit Plugin
 * Prevents abuse by limiting requests per IP/user
 */
async function rateLimitPlugin(
  fastify: FastifyInstance,
  options: Partial<RateLimitConfig> = {},
): Promise<void> {
  const config: RateLimitConfig = { ...defaultConfig, ...options };

  // Start cleanup process
  startCleanup();

  // Default key generator - use user ID if authenticated, otherwise IP
  const keyGenerator =
    config.keyGenerator ||
    ((request: FastifyRequest): string => {
      const user = (request as unknown as { user?: { userId?: string } }).user;
      if (user?.userId) {
        return `user:${user.userId}`;
      }
      return `ip:${getClientIP(request)}`;
    });

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip rate limiting in test mode
    if (env.isTest) {
      return;
    }

    // Skip certain paths
    if (config.skipPaths?.some((path) => request.url.startsWith(path))) {
      return;
    }

    // Check cached database config for skip paths and super admin exemption
    const dbConfig = await getCachedDbConfig(request.log);

    if (dbConfig) {
      // Skip rate limiting for skip paths from database config
      if (dbConfig.skipPaths?.some((path) => request.url.startsWith(path))) {
        return;
      }

      // Skip rate limiting for super admin if enabled
      if (dbConfig.skipSuperAdmin && isSuperAdmin(request)) {
        request.log.debug('Rate limiting skipped for super admin');
        return;
      }
    }

    // Use DB config values if available, otherwise fall back to defaults
    // Check if user is authenticated to apply different limits
    const user = (request as unknown as { user?: { userId?: string } }).user;
    const isAuthenticated = !!user?.userId;

    // Get rate limit from DB config based on auth status
    let effectiveMax = config.max;
    if (dbConfig) {
      effectiveMax = isAuthenticated
        ? (dbConfig.authenticated?.perMinute ?? config.max)
        : (dbConfig.unauthenticated?.perMinute ?? config.max);
    }
    const effectiveWindowMs = config.windowMs; // Always 1 minute for perMinute limits
    const effectiveMessage = config.message;

    const key = keyGenerator(request);
    const now = Date.now();

    // Get or create entry
    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt < now) {
      // Create new entry
      entry = {
        count: 0,
        resetAt: now + effectiveWindowMs,
      };
    }

    // Increment count
    entry.count++;
    rateLimitStore.set(key, entry);

    // Calculate remaining
    const remaining = Math.max(0, effectiveMax - entry.count);
    const resetTime = Math.ceil((entry.resetAt - now) / 1000);

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', effectiveMax);
    reply.header('X-RateLimit-Remaining', remaining);
    reply.header('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    // Check if limit exceeded
    if (entry.count > effectiveMax) {
      reply.header('Retry-After', resetTime);

      return reply.status(429).send({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: effectiveMessage,
          retryAfter: resetTime,
          limit: effectiveMax,
          windowMs: effectiveWindowMs,
        },
      });
    }
  });

  // Optionally decrement on successful requests
  if (config.skipSuccessfulRequests) {
    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
      if (reply.statusCode < 400) {
        const key = keyGenerator(request);
        const entry = rateLimitStore.get(key);
        if (entry && entry.count > 0) {
          entry.count--;
          rateLimitStore.set(key, entry);
        }
      }
    });
  }

  fastify.log.info(
    `Rate limit plugin registered: ${config.max} requests per ${config.windowMs / 1000}s`,
  );
}

/**
 * Get client IP address
 */
function getClientIP(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    return (ips[0] || '').trim();
  }

  const realIP = request.headers['x-real-ip'];
  if (realIP) {
    return typeof realIP === 'string' ? realIP : realIP[0] || '';
  }

  return request.ip;
}

/**
 * Stricter rate limit for authentication endpoints
 */
export const authRateLimitConfig: RateLimitConfig = {
  max: 10, // 10 attempts
  windowMs: 15 * 60 * 1000, // per 15 minutes
  message: 'Too many authentication attempts, please try again in 15 minutes',
};

/**
 * Stricter rate limit for sensitive operations
 */
export const sensitiveRateLimitConfig: RateLimitConfig = {
  max: 5, // 5 attempts
  windowMs: 60 * 60 * 1000, // per hour
  message: 'Too many requests for this sensitive operation',
};

export default fp(rateLimitPlugin, {
  name: 'rate-limit',
  fastify: '5.x',
});
