import {
  getExpertiseBySlugSchema,
  getExpertiseFeaturedSchema,
  getExpertiseSlotsSchema,
  listExpertisesSchema,
} from '@schemas/web';
import type { FastifyInstance } from 'fastify';
import {
  getExpertiseBySlug,
  getExpertiseSlots,
  getFeaturedExpertises,
  listExpertises,
} from '../../controllers/expertises';

/**
 * Web Expertise Routes - Public API
 * No authentication required
 *
 * Routes:
 * GET /expertises - List public expertises
 * GET /expertises/:slug - Get expertise detail by slug
 * GET /expertises/:slug/slots - Get expertise available slots for booking
 * GET /expertises/:slug/featured - Get featured expertises from same hub (lazy load)
 */
export async function webExpertiseRoutes(fastify: FastifyInstance) {
  // List public expertises
  fastify.get(
    '/',
    {
      schema: listExpertisesSchema,
    },
    listExpertises,
  );

  // Get expertise detail by slug
  fastify.get(
    '/:slug',
    {
      schema: getExpertiseBySlugSchema,
    },
    getExpertiseBySlug,
  );

  // Get expertise available slots for booking
  fastify.get(
    '/:slug/slots',
    {
      schema: getExpertiseSlotsSchema,
    },
    getExpertiseSlots,
  );

  // Get featured expertises from same hub (lazy load)
  fastify.get(
    '/:slug/featured',
    {
      schema: getExpertiseFeaturedSchema,
    },
    getFeaturedExpertises,
  );
}
