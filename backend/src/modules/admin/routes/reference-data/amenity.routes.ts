import type { FastifyInstance } from 'fastify';
import {
  getAllAmenities,
  getAmenityById,
} from '../../controllers/reference-data/amenity.controller';

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
 * Amenity Routes - Public (GET only)
 * For CRUD operations, use Admin API endpoints
 */
export async function adminAmenityRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/amenities - List all
  fastify.get('/', {
    schema: {
      tags: ['Amenities'],
      summary: 'Get all amenities',
      querystring: includeInactiveQuerySchema,
    },
    handler: getAllAmenities,
  });

  // GET /api/v1/amenities/:id - Get by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Amenities'],
      summary: 'Get amenity by ID',
      params: paramsWithIdSchema,
    },
    handler: getAmenityById,
  });
}
