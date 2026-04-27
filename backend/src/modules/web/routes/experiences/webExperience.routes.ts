import {
  getExperienceBySlugSchema,
  getExperienceEventsSchema,
  getExperienceFeaturedSchema,
  getExperienceSlotsSchema,
  listExperiencesSchema,
} from '@schemas/web';
import type { FastifyInstance } from 'fastify';
import {
  getExperienceBySlug,
  getExperienceEvents,
  getExperienceSlots,
  getFeaturedExperiences,
  listExperiences,
} from '../../controllers/experiences';

/**
 * Web Experience Routes - Public API
 * No authentication required
 *
 * Routes:
 * GET /experiences - List public experiences
 * GET /experiences/:slug - Get experience detail by slug
 * GET /experiences/:slug/events - Get upcoming events for an experience
 * GET /experiences/:slug/featured - Get featured experiences from same hub (lazy load)
 * GET /experiences/:slug/slots - Get slots with ticket availability for booking widget
 */
export async function webExperienceRoutes(fastify: FastifyInstance) {
  // List public experiences
  fastify.get(
    '/',
    {
      schema: listExperiencesSchema,
    },
    listExperiences,
  );

  // Get experience detail by slug
  fastify.get(
    '/:slug',
    {
      schema: getExperienceBySlugSchema,
    },
    getExperienceBySlug,
  );

  // Get upcoming events for an experience
  fastify.get(
    '/:slug/events',
    {
      schema: getExperienceEventsSchema,
    },
    getExperienceEvents,
  );

  // Get featured experiences from same hub (lazy load)
  fastify.get(
    '/:slug/featured',
    {
      schema: getExperienceFeaturedSchema,
    },
    getFeaturedExperiences,
  );

  // Get slots with ticket availability for booking widget
  fastify.get(
    '/:slug/slots',
    {
      schema: getExperienceSlotsSchema,
    },
    getExperienceSlots,
  );
}
