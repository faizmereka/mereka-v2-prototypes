import { requireAuth } from '@core/middlewares/auth.middleware';
import { hubCheckSlugBodySchema, hubUpdateLearnerProfileBodySchema } from '@schemas/hub';
import type { FastifyInstance } from 'fastify';
import {
  checkSlugAvailability,
  getMyProfile,
  updateMyProfile,
} from '../../controllers/profiles/learner-profile.controller';

/**
 * Learner Profile routes
 */
export async function learnerProfileRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Get current user's learner profile
   */
  fastify.get('/profile/me', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Learner Profile'],
      summary: 'Get my learner profile',
      description: 'Get current logged-in user learner profile',
      security: [{ bearerAuth: [] }],
    },
    handler: getMyProfile,
  });

  /**
   * Update learner profile
   */
  fastify.patch('/profile/me', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Learner Profile'],
      summary: 'Update my learner profile',
      description: 'Update learner profile and optionally change slug',
      body: hubUpdateLearnerProfileBodySchema.body,
      security: [{ bearerAuth: [] }],
    },
    handler: updateMyProfile,
  });

  /**
   * Check slug availability
   */
  fastify.post('/slug/check', {
    schema: {
      tags: ['Learner Profile'],
      summary: 'Check slug availability',
      description: 'Check if a slug is available for use',
      body: hubCheckSlugBodySchema.body,
    },
    handler: checkSlugAvailability,
  });
}
