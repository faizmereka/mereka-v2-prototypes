import fastifyCors from '@fastify/cors';

import type { FastifyInstance } from 'fastify';

/**
 * Register CORS plugin
 */
export async function registerCors(fastify: FastifyInstance): Promise<void> {
  // Allow all origins for now
  await fastify.register(fastifyCors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
      'Cookie',
    ],
    exposedHeaders: [
      'Content-Range',
      'X-Content-Range',
      'Content-Length',
      'Content-Type',
      'Date',
      'Server',
      'Set-Cookie',
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // 24 hours
  });

  fastify.log.info('🌐 CORS plugin registered');
  fastify.log.info({ allowedOrigins: '*' }, 'Allowed origins configured - All origins allowed');
}
