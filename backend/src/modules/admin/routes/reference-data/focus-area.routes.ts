import type { FastifyInstance } from 'fastify';
import {
  getAllFocusAreas,
  getFocusAreaById,
} from '../../controllers/reference-data/focus-area.controller';

const includeInactiveQuerySchema = {
  type: 'object',
  properties: {
    includeInactive: { type: 'string', enum: ['true', 'false'] },
  },
} as const;

const paramsWithIdSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', pattern: '^[a-f\\d]{24}$' },
  },
} as const;

/**
 * Focus Area Routes - Public (GET only)
 */
export async function adminFocusAreaRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', {
    schema: {
      tags: ['Focus Areas'],
      summary: 'Get all focus areas',
      querystring: includeInactiveQuerySchema,
    },
    handler: getAllFocusAreas,
  });

  fastify.get('/:id', {
    schema: { tags: ['Focus Areas'], summary: 'Get focus area by ID', params: paramsWithIdSchema },
    handler: getFocusAreaById,
  });
}
