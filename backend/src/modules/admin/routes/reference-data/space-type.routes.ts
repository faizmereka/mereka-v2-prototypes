import type { FastifyInstance } from 'fastify';
import {
  getAllSpaceTypes,
  getSpaceTypeById,
} from '../../controllers/reference-data/space-type.controller';

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
 * Space Type Routes - Public (GET only)
 */
export async function adminSpaceTypeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', {
    schema: {
      tags: ['Space Types'],
      summary: 'Get all space types',
      querystring: includeInactiveQuerySchema,
    },
    handler: getAllSpaceTypes,
  });

  fastify.get('/:id', {
    schema: { tags: ['Space Types'], summary: 'Get space type by ID', params: paramsWithIdSchema },
    handler: getSpaceTypeById,
  });
}
