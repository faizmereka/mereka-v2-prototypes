import { requireAuth } from '@core/middlewares/auth.middleware';
import { checkSlugParamsSchema, checkSlugQuerySchema } from '@schemas/shared';
import type { FastifyInstance } from 'fastify';
import { checkSlugAvailability } from '../controllers/slug.controller';

/**
 * Slug routes - Slug availability and management
 */
export async function slugRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Check slug availability
   */
  fastify.get('/check/:slug', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Slug'],
      summary: 'Check slug availability',
      description: 'Check if a slug is available for a specific resource type',
      params: checkSlugParamsSchema,
      querystring: checkSlugQuerySchema,
      security: [{ bearerAuth: [] }],
    },
    handler: checkSlugAvailability,
  });
}
