import { requireAuth } from '@core/middlewares/auth.middleware';
import { learnerAccountResponseSchema, updateLearnerAccountSchema } from '@schemas/web';
import type { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { getLearnerAccount, updateLearnerAccount } from '../../controllers/account';

/**
 * Learner Account Routes
 * All routes require authentication
 *
 * GET /me/account - Get account details
 * PUT /me/account - Update account details
 */
export async function learnerAccountRoutes(fastify: FastifyInstance) {
  // Get learner account details
  fastify.get(
    '/',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Learner Account'],
        summary: 'Get account details',
        description: 'Returns account details for the authenticated learner',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: learnerAccountResponseSchema,
            },
          },
        },
      },
    },
    getLearnerAccount,
  );

  // Update learner account details
  fastify.put(
    '/',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Learner Account'],
        summary: 'Update account details',
        description: 'Updates account details for the authenticated learner',
        security: [{ bearerAuth: [] }],
        body: updateLearnerAccountSchema.body,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: learnerAccountResponseSchema,
            },
          },
        },
      },
    },
    updateLearnerAccount as RouteHandlerMethod,
  );
}
