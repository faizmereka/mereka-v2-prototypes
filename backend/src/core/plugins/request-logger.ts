import { ApiModule } from '@core/models/ApiLog';
import { apiLogService } from '@services/infrastructure';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import type { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
    startTime: number;
  }
}

/**
 * Request Logger Plugin
 * Logs all API requests to MongoDB for monitoring and auditing
 */
async function requestLoggerPlugin(fastify: FastifyInstance): Promise<void> {
  // Add request ID and start time to every request
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    request.requestId = (request.headers['x-request-id'] as string) || uuidv4();
    request.startTime = Date.now();
  });

  // Log request after response is sent
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip logging for health checks and static assets
    if (shouldSkipLogging(request.url)) {
      return;
    }

    // Ensure we have required values with fallbacks
    const requestId = request.requestId || uuidv4();
    const startTime = request.startTime || Date.now();
    const responseTime = Math.max(0, Date.now() - startTime);

    // Get user info if authenticated
    const user = (request as unknown as { user?: { userId?: string; email?: string } }).user;
    const userId = user?.userId;
    const userEmail = user?.email;

    // Sanitize query params (remove sensitive data)
    const sanitizedQuery = sanitizeQuery(request.query as Record<string, unknown>);

    // Get error info if present (set by onError hook)
    const errorInfo = (
      request as FastifyRequest & { _errorInfo?: { code: string; message: string; name: string } }
    )._errorInfo;

    // Detect module from path
    const module = detectModule(request.url);

    // Fire and forget - don't await
    void apiLogService.log({
      requestId,
      userId: userId ? (userId as unknown as Types.ObjectId) : undefined,
      userEmail,
      method: request.method,
      path: request.url.split('?')[0] || request.url, // Remove query string
      route: request.routeOptions?.url || request.url,
      module,
      statusCode: reply.statusCode,
      responseTime,
      ip: getClientIP(request),
      userAgent: request.headers['user-agent'],
      referer: request.headers.referer,
      query: sanitizedQuery,
      contentLength: getContentLength(request),
      responseSize: getResponseSize(reply),
      errorCode: errorInfo?.code,
      errorMessage: errorInfo?.message,
      tags: generateTags(request, reply),
      metadata: {
        protocol: request.protocol,
        hostname: request.hostname,
        ...(errorInfo && { errorName: errorInfo.name }),
      },
    });
  });

  // Store error info for logging in onResponse (avoid duplicate logging)
  fastify.addHook(
    'onError',
    async (request: FastifyRequest, _reply: FastifyReply, error: Error) => {
      // Store error info on request for use in onResponse hook
      (
        request as FastifyRequest & { _errorInfo?: { code: string; message: string; name: string } }
      )._errorInfo = {
        code: (error as { code?: string }).code || 'INTERNAL_ERROR',
        message: error.message,
        name: error.name,
      };
    },
  );

  fastify.log.info('Request logger plugin registered');
}

/**
 * Check if request should be skipped for logging
 */
function shouldSkipLogging(url: string): boolean {
  const skipPaths = ['/health', '/favicon.ico', '/docs', '/docs/', '/docs/static/', '/docs/json'];

  return skipPaths.some((path) => url.startsWith(path));
}

/**
 * Get client IP address (handles proxies)
 */
function getClientIP(request: FastifyRequest): string {
  // Check for forwarded headers (behind proxy/load balancer)
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
 * Sanitize query parameters (remove sensitive data)
 */
function sanitizeQuery(query: Record<string, unknown>): Record<string, unknown> {
  if (!query || Object.keys(query).length === 0) {
    return {};
  }

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'apikey',
    'api_key',
  ];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(query)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Get content length from request
 */
function getContentLength(request: FastifyRequest): number | undefined {
  const contentLength = request.headers['content-length'];
  if (contentLength) {
    const parsed = Number.parseInt(contentLength, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

/**
 * Get response size
 */
function getResponseSize(reply: FastifyReply): number | undefined {
  const contentLength = reply.getHeader('content-length');
  if (contentLength) {
    const parsed = Number.parseInt(String(contentLength), 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

/**
 * Generate tags based on request/response
 */
function generateTags(request: FastifyRequest, reply: FastifyReply): string[] {
  const tags: string[] = [];

  // Add method tag
  tags.push(request.method.toLowerCase());

  // Add status category tag
  if (reply.statusCode >= 500) {
    tags.push('server-error');
  } else if (reply.statusCode >= 400) {
    tags.push('client-error');
  } else if (reply.statusCode >= 300) {
    tags.push('redirect');
  } else {
    tags.push('success');
  }

  // Add route category if it exists
  const routeUrl = request.routeOptions?.url;
  if (routeUrl) {
    if (routeUrl.includes('/auth')) tags.push('auth');
    if (routeUrl.includes('/users')) tags.push('users');
    if (routeUrl.includes('/experiences')) tags.push('experiences');
    if (routeUrl.includes('/bookings')) tags.push('bookings');
    if (routeUrl.includes('/payments') || routeUrl.includes('/stripe')) tags.push('payments');
    if (routeUrl.includes('/webhook')) tags.push('webhook');
  }

  return tags;
}

/**
 * Detect API module from request path
 */
function detectModule(url: string): ApiModule {
  const path = url.toLowerCase();

  // Auth module
  if (path.includes('/auth')) {
    return ApiModule.AUTH;
  }

  // Admin module
  if (path.includes('/admin')) {
    return ApiModule.ADMIN;
  }

  // Hub module
  if (path.includes('/hub')) {
    return ApiModule.HUB;
  }

  // Payments module
  if (path.includes('/payments') || path.includes('/stripe') || path.includes('/webhook')) {
    return ApiModule.PAYMENTS;
  }

  // Web module (experiences, bookings, users, etc.)
  if (
    path.includes('/experiences') ||
    path.includes('/bookings') ||
    path.includes('/users') ||
    path.includes('/profiles') ||
    path.includes('/hubs') ||
    path.includes('/web')
  ) {
    return ApiModule.WEB;
  }

  return ApiModule.OTHER;
}

export default fp(requestLoggerPlugin, {
  name: 'request-logger',
  fastify: '5.x',
});
