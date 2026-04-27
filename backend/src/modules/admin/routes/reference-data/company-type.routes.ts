import type { FastifyInstance } from 'fastify';
import {
  getAllCompanyTypes,
  getCompanyTypeById,
} from '../../controllers/reference-data/company-type.controller';

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
 * Company Type Routes - Public (GET only)
 */
export async function adminCompanyTypeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', {
    schema: {
      tags: ['Company Types'],
      summary: 'Get all company types',
      querystring: includeInactiveQuerySchema,
    },
    handler: getAllCompanyTypes,
  });

  fastify.get('/:id', {
    schema: {
      tags: ['Company Types'],
      summary: 'Get company type by ID',
      params: paramsWithIdSchema,
    },
    handler: getCompanyTypeById,
  });
}
