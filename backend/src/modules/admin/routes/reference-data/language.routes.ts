import type { FastifyInstance } from 'fastify';
import {
  getLanguageById,
  listActiveLanguages,
  listLanguages,
} from '../../controllers/reference-data/language.controller';

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
 * Language Routes - Public (GET only)
 */
export async function adminLanguageRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', {
    schema: {
      tags: ['Languages'],
      summary: 'Get all languages',
      querystring: includeInactiveQuerySchema,
    },
    handler: listLanguages,
  });

  fastify.get('/active', {
    schema: { tags: ['Languages'], summary: 'Get active languages' },
    handler: listActiveLanguages,
  });

  fastify.get('/:id', {
    schema: { tags: ['Languages'], summary: 'Get language by ID', params: paramsWithIdSchema },
    handler: getLanguageById,
  });
}
