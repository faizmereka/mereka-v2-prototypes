import { requireAuth } from '@core/middlewares/auth.middleware';
import { learnerOverviewResponseSchema } from '@schemas/web';
import type { FastifyInstance } from 'fastify';
import { getLearnerOverview } from '../../controllers/dashboard';

/**
 * Learner Dashboard Routes
 * All routes require authentication
 *
 * GET /me/overview - Get dashboard overview data
 */
export async function learnerDashboardRoutes(fastify: FastifyInstance) {
  // Get learner dashboard overview
  fastify.get(
    '/',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Learner Dashboard'],
        summary: 'Get dashboard overview',
        description:
          'Returns dashboard overview data including stats, upcoming bookings, and user info',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: learnerOverviewResponseSchema,
            },
          },
        },
      },
    },
    getLearnerOverview,
  );
}
