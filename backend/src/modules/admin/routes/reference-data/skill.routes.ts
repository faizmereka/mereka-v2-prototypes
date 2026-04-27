import type { FastifyInstance } from 'fastify';
import {
  getAllSkills,
  getSkillById,
  getSkillsByFocusArea,
} from '../../controllers/reference-data/skill.controller';

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

const paramsWithFocusAreaIdSchema = {
  type: 'object',
  required: ['focusAreaId'],
  properties: {
    focusAreaId: { type: 'string', pattern: '^[a-f\\d]{24}$' },
  },
} as const;

/**
 * Skill Routes - Public (GET only)
 */
export async function adminSkillRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', {
    schema: {
      tags: ['Skills'],
      summary: 'Get all skills',
      querystring: includeInactiveQuerySchema,
    },
    handler: getAllSkills,
  });

  fastify.get('/:id', {
    schema: { tags: ['Skills'], summary: 'Get skill by ID', params: paramsWithIdSchema },
    handler: getSkillById,
  });

  fastify.get('/by-focus-area/:focusAreaId', {
    schema: {
      tags: ['Skills'],
      summary: 'Get skills by focus area',
      params: paramsWithFocusAreaIdSchema,
    },
    handler: getSkillsByFocusArea,
  });
}
