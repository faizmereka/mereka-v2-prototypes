import { getMyExpertProfile, updateMyExpertProfile } from '@controllers/hub';
import { requireAuth } from '@core/middlewares/auth.middleware';
import { hubUpdateExpertProfileBodySchema } from '@schemas/hub';
import type { FastifyInstance } from 'fastify';

/**
 * Expert Profile Routes
 * Handles expert onboarding profile operations
 * Base path: /expert/profile
 */
export async function hubExpertProfileRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Get my expert profile
   * GET /expert/profile/me
   */
  fastify.get('/me', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Expert Profile'],
      summary: 'Get my expert profile',
      description:
        'Get current user expert profile with skills, languages, portfolio, employment, and education populated',
      security: [{ bearerAuth: [] }],
    },
    handler: getMyExpertProfile,
  });

  /**
   * Update my expert profile
   * PATCH /expert/profile
   */
  fastify.patch('/', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Expert Profile'],
      summary: 'Update my expert profile',
      description:
        'Update expert profile fields including basic info, skills, languages, portfolio, employment, and education',
      body: hubUpdateExpertProfileBodySchema.body,
      security: [{ bearerAuth: [] }],
    },
    handler: updateMyExpertProfile,
  });
}
