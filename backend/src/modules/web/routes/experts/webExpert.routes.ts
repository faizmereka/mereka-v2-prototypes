import { optionalAuth } from '@core/middlewares/auth.middleware';
import {
  getExpertBySlugSchema,
  getExpertReviewsSchema,
  getExpertServicesSchema,
  listExpertsSchema,
} from '@schemas/web';
import type { FastifyInstance, RouteHandlerMethod } from 'fastify';
import {
  getExpertBySlug,
  getExpertReviews,
  getExpertServices,
  listExperts,
} from '../../controllers/experts';

/**
 * Web Expert Routes - Public API with Optional Auth
 * Optional authentication - if user is logged in and is the profile owner, they can see incomplete profiles
 *
 * Routes:
 * GET /experts - List public experts
 * GET /experts/:slug - Get expert detail by username/slug (owners can see incomplete profiles)
 * GET /experts/:slug/services - Get expert services (expertises & experiences)
 * GET /experts/:slug/reviews - Get expert reviews
 */
export async function webExpertRoutes(fastify: FastifyInstance) {
  // List public experts
  fastify.get(
    '/',
    {
      schema: listExpertsSchema,
    },
    listExperts,
  );

  // Get expert detail by slug (with optional auth for owner access to incomplete profiles)
  fastify.get(
    '/:slug',
    {
      schema: getExpertBySlugSchema,
      preHandler: optionalAuth,
    },
    getExpertBySlug as RouteHandlerMethod,
  );

  // Get expert services (expertises & experiences)
  fastify.get(
    '/:slug/services',
    {
      schema: getExpertServicesSchema,
    },
    getExpertServices,
  );

  // Get expert reviews
  fastify.get(
    '/:slug/reviews',
    {
      schema: getExpertReviewsSchema,
    },
    getExpertReviews,
  );
}
