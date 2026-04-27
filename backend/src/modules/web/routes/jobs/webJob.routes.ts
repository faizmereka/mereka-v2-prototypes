import { optionalAuth } from '@core/middlewares/auth.middleware';
import { getJobByIdSchema, getSimilarJobsSchema, listJobsSchema } from '@schemas/web';
import type { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { getJobById, getSimilarJobs, listJobs } from '../../controllers/jobs';

/**
 * Web Job Routes - Public API with Optional Auth
 * Optional authentication - if user is logged in, they can see client info
 *
 * Routes:
 * GET /jobs - List public jobs
 * GET /jobs/:id - Get job detail by ID (with optional auth for client info)
 * GET /jobs/:id/similar - Get similar jobs
 */
export async function webJobRoutes(fastify: FastifyInstance) {
  // List public jobs
  fastify.get(
    '/',
    {
      schema: listJobsSchema,
    },
    listJobs,
  );

  // Get job detail by ID (with optional auth for client info visibility)
  fastify.get(
    '/:id',
    {
      schema: getJobByIdSchema,
      preHandler: optionalAuth,
    },
    getJobById as RouteHandlerMethod,
  );

  // Get similar jobs
  fastify.get(
    '/:id/similar',
    {
      schema: getSimilarJobsSchema,
    },
    getSimilarJobs,
  );
}
