import type { FastifyInstance } from 'fastify';
import {
  getAllFacilities,
  getFacilityById,
} from '../../controllers/reference-data/facility.controller';

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
 * Facility Routes - Public (GET only)
 */
export async function adminFacilityRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', {
    schema: {
      tags: ['Facilities'],
      summary: 'Get all facilities',
      querystring: includeInactiveQuerySchema,
    },
    handler: getAllFacilities,
  });

  fastify.get('/:id', {
    schema: { tags: ['Facilities'], summary: 'Get facility by ID', params: paramsWithIdSchema },
    handler: getFacilityById,
  });
}
