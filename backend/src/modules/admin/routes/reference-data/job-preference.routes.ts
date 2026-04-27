import type { FastifyInstance } from 'fastify';
import {
  getAllJobPreferences,
  getJobPreferenceById,
} from '../../controllers/reference-data/job-preference.controller';

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
 * Job Preference Routes - Public (GET only)
 */
export async function adminJobPreferenceRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', {
    schema: {
      tags: ['Job Preferences'],
      summary: 'Get all job preferences',
      querystring: includeInactiveQuerySchema,
    },
    handler: getAllJobPreferences,
  });

  fastify.get('/:id', {
    schema: {
      tags: ['Job Preferences'],
      summary: 'Get job preference by ID',
      params: paramsWithIdSchema,
    },
    handler: getJobPreferenceById,
  });
}
