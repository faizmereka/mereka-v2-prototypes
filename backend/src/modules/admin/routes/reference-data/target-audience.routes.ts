import type { FastifyInstance } from 'fastify';
import {
  listActiveTargetAudiences,
  listTargetAudiences,
} from '../../controllers/reference-data/target-audience.controller';

/**
 * Target Audience Routes - Public (GET only)
 */
export async function adminTargetAudienceRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', {
    schema: { tags: ['Target Audiences'], summary: 'List target audiences' },
    handler: listTargetAudiences,
  });

  fastify.get('/active', {
    schema: { tags: ['Target Audiences'], summary: 'List active audiences' },
    handler: listActiveTargetAudiences,
  });
}
