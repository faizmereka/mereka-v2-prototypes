import type { FastifyInstance } from 'fastify';
import {
  getAllExperienceTypes,
  getExperienceTypeById,
} from '../../controllers/reference-data/experience-type.controller';

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
 * Experience Type Routes - Public (GET only)
 */
export async function adminExperienceTypeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', {
    schema: {
      tags: ['Experience Types'],
      summary: 'Get all experience types',
      querystring: includeInactiveQuerySchema,
    },
    handler: getAllExperienceTypes,
  });

  fastify.get('/:id', {
    schema: {
      tags: ['Experience Types'],
      summary: 'Get experience type by ID',
      params: paramsWithIdSchema,
    },
    handler: getExperienceTypeById,
  });
}
