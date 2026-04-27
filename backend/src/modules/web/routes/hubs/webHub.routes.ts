import { optionalAuth } from '@core/middlewares/auth.middleware';
import {
  getHubBySlugSchema,
  getHubExpertsSchema,
  getHubServicesSchema,
  listHubsSchema,
} from '@schemas/web';
import type { FastifyInstance, RouteHandlerMethod } from 'fastify';
import { getHubBySlug, getHubExperts, getHubServices, listHubs } from '../../controllers/hubs';

/**
 * Web Hub Routes - Public API with Optional Auth
 * Optional authentication - if user is logged in and is a member, they can see draft hubs
 *
 * Routes:
 * GET /hubs - List public hubs
 * GET /hubs/:slug - Get hub detail by slug (owners can see draft hubs)
 * GET /hubs/:slug/experts - Get hub experts
 * GET /hubs/:slug/services - Get hub services (expertises & experiences)
 */
export async function webHubRoutes(fastify: FastifyInstance) {
  // List public hubs
  fastify.get(
    '/',
    {
      schema: listHubsSchema,
    },
    listHubs,
  );

  // Get hub detail by slug (with optional auth for owner access to draft hubs)
  fastify.get(
    '/:slug',
    {
      schema: getHubBySlugSchema,
      preHandler: optionalAuth,
    },
    getHubBySlug as RouteHandlerMethod,
  );

  // Get hub experts (with optional auth for owner access to draft hubs)
  fastify.get(
    '/:slug/experts',
    {
      schema: getHubExpertsSchema,
      preHandler: optionalAuth,
    },
    getHubExperts as RouteHandlerMethod,
  );

  // Get hub services (with optional auth for owner access to draft hubs)
  fastify.get(
    '/:slug/services',
    {
      schema: getHubServicesSchema,
      preHandler: optionalAuth,
    },
    getHubServices as RouteHandlerMethod,
  );
}
