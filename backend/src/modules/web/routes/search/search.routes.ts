import { searchQuerySchema } from '@core/schemas/web/search';
import type { FastifyInstance } from 'fastify';
import { search } from '../../controllers/search';

/**
 * Search routes
 * Base path: /api/search
 */
export async function searchRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/search
   * Unified search across all entities (experts, hubs, expertise, experiences)
   */
  fastify.get('/', {
    schema: {
      tags: ['Search'],
      summary: 'Search across all entities',
      description: 'Searches experts, hubs, expertise, and experiences',
      ...searchQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      type: {
                        type: 'string',
                        enum: ['experts', 'hubs', 'expertise', 'experiences'],
                      },
                      title: { type: 'string' },
                      image: { type: 'string' },
                      slug: { type: 'string' },
                    },
                  },
                },
                total: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    handler: search,
  });
}
