import { getHomeDataSchema, getHomeReviewsSchema } from '@schemas/web';
import type { FastifyInstance } from 'fastify';
import { getHomeData, getHomeReviews } from '../../controllers/home';

/**
 * Web Home Routes - Public API
 * No authentication required
 *
 * Routes:
 * GET /home - Get home page data (expertises + experiences)
 * GET /home/reviews - Get featured reviews for home page
 */
export async function webHomeRoutes(fastify: FastifyInstance) {
  // Get home page data
  fastify.get(
    '/',
    {
      schema: getHomeDataSchema,
    },
    getHomeData,
  );

  // Get featured reviews for home page
  fastify.get(
    '/reviews',
    {
      schema: getHomeReviewsSchema,
    },
    getHomeReviews,
  );
}
