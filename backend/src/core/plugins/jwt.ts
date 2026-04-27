import { env } from '@core/config/env';
import fastifyJwt from '@fastify/jwt';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Register JWT plugin
 */
export async function registerJwt(fastify: FastifyInstance): Promise<void> {
  await fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  });

  fastify.log.info('🔐 JWT plugin registered');
}

/**
 * JWT authentication decorator
 */
export function registerAuthDecorator(fastify: FastifyInstance): void {
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (_err) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
      });
    }
  });
}
