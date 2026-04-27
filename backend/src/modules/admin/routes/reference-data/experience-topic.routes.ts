import type { FastifyInstance } from 'fastify';
import {
  getExperienceTopicById,
  listExperienceTopics,
} from '../../controllers/reference-data/experience-topic.controller';

/**
 * Experience Topic Routes - Public (GET only)
 */
export async function adminExperienceTopicRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', {
    schema: {
      tags: ['Experience Topics'],
      summary: 'List experience topics',
      description: 'List topics, optionally filtered by theme',
    },
    handler: listExperienceTopics,
  });

  fastify.get('/:id', {
    schema: {
      tags: ['Experience Topics'],
      summary: 'Get topic by ID',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
    handler: getExperienceTopicById,
  });
}
