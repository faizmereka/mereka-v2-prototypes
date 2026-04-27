import fastifyCookie from '@fastify/cookie';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';

import { env } from './core/config/env';
import { initializeFirebase } from './core/config/firebase';
import { registerCors } from './core/plugins/cors';
import { registerAuthDecorator, registerJwt } from './core/plugins/jwt';
import { finalizeModuleSwagger, initModuleSwagger, registerSwagger } from './core/plugins/swagger';
import { setupSocketIO } from './core/websocket';

/**
 * Build and configure Fastify application
 */
export async function buildApp(): Promise<FastifyInstance> {
  // Initialize Firebase Admin SDK (if configured)
  try {
    initializeFirebase();
  } catch (error) {
    console.warn('Firebase initialization skipped:', error);
  }

  // Initialize Fastify with logging and native JSON Schema validation
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport: env.isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
              colorize: true,
            },
          }
        : undefined,
    },
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: true,
        useDefaults: true,
      },
    },
  });

  // Add raw body parser for Stripe webhooks
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    async (req: FastifyRequest, body: Buffer) => {
      // Store raw body for Stripe signature verification
      req.rawBody = body;
      // Parse JSON for normal use
      return JSON.parse(body.toString('utf8'));
    },
  );

  // Register plugins
  await registerCors(fastify);
  await fastify.register(fastifyCookie, {
    secret: env.JWT_SECRET, // Cookie signing secret
  });
  await registerJwt(fastify);
  registerAuthDecorator(fastify);

  // Register rate limiting plugin (before routes)
  const rateLimitPlugin = await import('./core/plugins/rate-limit');
  await fastify.register(rateLimitPlugin.default, {
    max: 100, // 100 requests per minute per IP/user
    windowMs: 60 * 1000,
  });

  // Register request logging plugin
  const requestLoggerPlugin = await import('./core/plugins/request-logger');
  await fastify.register(requestLoggerPlugin.default);

  // Register API quota plugin (after JWT, checks per-user quotas)
  const apiQuotaPlugin = await import('./core/plugins/api-quota');
  await fastify.register(apiQuotaPlugin.default);

  // Health check endpoint
  fastify.get('/health', {
    schema: {
      tags: ['Health'],
      description: 'Health check endpoint - returns server status',
    },
    handler: async (_request, reply) => {
      return reply.send({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: env.NODE_ENV,
        mongodb: 'connected',
      });
    },
  });

  // Root endpoint
  fastify.get('/', {
    schema: {
      hide: true, // Hide from Swagger docs
    },
    handler: async (_request, reply) => {
      return reply.send({
        message: 'Mereka Backend API',
        version: '1.0.0',
        documentation: '/docs',
        health: '/health',
      });
    },
  });

  // ===============================
  // REGISTER MODULES WITH SEPARATE SWAGGER DOCS
  // ===============================

  // Shared Module (Auth + Payments + Checkout) with /docs/shared
  await fastify.register(
    async (sharedScope) => {
      // 1. Initialize swagger BEFORE routes (to capture only this module's routes)
      await initModuleSwagger(sharedScope, 'shared');

      // 2. Register routes
      const { authModule, checkoutModule, permissionsModule } = await import('./modules/shared');
      await sharedScope.register(authModule, { prefix: env.API_PREFIX });
      await sharedScope.register(checkoutModule, { prefix: `${env.API_PREFIX}/checkout` });
      await sharedScope.register(permissionsModule, { prefix: env.API_PREFIX });

      // 3. Finalize swagger UI AFTER routes
      await finalizeModuleSwagger(sharedScope, 'shared');
    },
    { prefix: '' },
  );

  // Web Module with /docs/web
  await fastify.register(
    async (webScope) => {
      // 1. Initialize swagger BEFORE routes
      await initModuleSwagger(webScope, 'web');

      // 2. Register routes
      const { webModule, webhookModule } = await import('./modules/web');
      await webScope.register(webModule, { prefix: env.API_PREFIX });
      await webScope.register(webhookModule, { prefix: env.API_PREFIX });

      // 3. Finalize swagger UI AFTER routes
      await finalizeModuleSwagger(webScope, 'web');
    },
    { prefix: '' },
  );

  // Admin Module with /docs/admin
  await fastify.register(
    async (adminScope) => {
      // 1. Initialize swagger BEFORE routes
      await initModuleSwagger(adminScope, 'admin');

      // 2. Register routes
      const { adminAuthModule, adminModule } = await import('./modules/admin');
      await adminScope.register(adminAuthModule, { prefix: `${env.API_PREFIX}/admin` });
      await adminScope.register(adminModule, { prefix: `${env.API_PREFIX}/admin` });

      // 3. Finalize swagger UI AFTER routes
      await finalizeModuleSwagger(adminScope, 'admin');
    },
    { prefix: '' },
  );

  // Hub Module with /docs/hub
  await fastify.register(
    async (hubScope) => {
      // 1. Initialize swagger BEFORE routes
      await initModuleSwagger(hubScope, 'hub');

      // 2. Register routes
      const { hubModule } = await import('./modules/hub');
      await hubScope.register(hubModule, { prefix: env.API_PREFIX });

      // 3. Finalize swagger UI AFTER routes
      await finalizeModuleSwagger(hubScope, 'hub');
    },
    { prefix: '' },
  );

  // Main Swagger documentation at /docs (shows all APIs combined)
  await registerSwagger(fastify);

  // Register cron jobs plugin (start scheduled jobs)
  if (!env.isTest) {
    const cronJobsPlugin = await import('./core/plugins/cron-jobs');
    await fastify.register(cronJobsPlugin.default);
  }

  // Initialize Socket.IO for real-time messaging
  // @covers AC-RT-001, AC-RT-002, AC-RT-003, AC-RT-004
  if (!env.isTest) {
    setupSocketIO(fastify);
  }

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error({
      error,
      url: request.url,
      method: request.method,
      params: request.params,
      query: request.query,
    });

    // Validation errors
    if (typeof error === 'object' && error !== null && 'validation' in error) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: (error as { validation: unknown }).validation,
        },
      });
    }

    // Default error response
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? (error as { statusCode: number }).statusCode
        : 500;

    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: unknown }).code)
        : 'INTERNAL_SERVER_ERROR';

    const errorMessage =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Unknown error';

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: errorCode,
        message: env.isProduction ? 'Internal server error' : errorMessage,
      },
    });
  });

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method}:${request.url} not found`,
      },
    });
  });

  return fastify;
}
// trigger build Wed Mar 25 07:33:01 +0545 2026
