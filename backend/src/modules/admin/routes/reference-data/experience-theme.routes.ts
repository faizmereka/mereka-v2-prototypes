import type { FastifyInstance } from 'fastify';
import {
  getExperienceThemeById,
  listActiveExperienceThemes,
  listExperienceThemes,
} from '../../controllers/reference-data/experience-theme.controller';

const paramsWithIdSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', pattern: '^[a-f\\d]{24}$' },
  },
} as const;

/**
 * Experience Theme Routes - Public (GET only)
 */
export async function adminExperienceThemeRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', {
    schema: { tags: ['Experience Themes'], summary: 'List experience themes' },
    handler: listExperienceThemes,
  });

  fastify.get('/active', {
    schema: { tags: ['Experience Themes'], summary: 'List active themes' },
    handler: listActiveExperienceThemes,
  });

  fastify.get('/:id', {
    schema: { tags: ['Experience Themes'], summary: 'Get theme by ID', params: paramsWithIdSchema },
    handler: getExperienceThemeById,
  });
}
