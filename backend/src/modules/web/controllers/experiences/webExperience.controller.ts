import { webExperienceService } from '@services/web';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Types
// ============================================================================

interface GetBySlugParams {
  slug: string;
}

interface GetEventsQuery {
  page?: number;
  limit?: number;
}

interface ListExperiencesQuery {
  page?: number;
  limit?: number;
  category?: string;
  type?: 'Physical' | 'Virtual' | 'Hybrid';
  city?: string;
  search?: string;
}

interface GetFeaturedQuery {
  limit?: number;
}

interface GetSlotsQuery {
  limit?: number;
}

// ============================================================================
// Controllers
// ============================================================================

/**
 * Get experience detail by slug
 * GET /experiences/:slug
 */
export async function getExperienceBySlug(
  request: FastifyRequest<{ Params: GetBySlugParams }>,
  reply: FastifyReply,
) {
  const { slug } = request.params;
  // Get userId if authenticated (optional auth for public pages)
  const userId = (request.user as { sub?: string } | undefined)?.sub;

  try {
    const experience = await webExperienceService.getExperienceBySlug(slug, userId);

    if (!experience) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERIENCE_NOT_FOUND',
          message: 'Experience not found or is not publicly available',
        },
      });
    }

    return reply.send({
      success: true,
      data: experience,
    });
  } catch (error) {
    request.log.error(error, 'Error fetching experience by slug');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch experience',
      },
    });
  }
}

/**
 * Get upcoming events for an experience
 * GET /experiences/:slug/events
 */
export async function getExperienceEvents(
  request: FastifyRequest<{ Params: GetBySlugParams; Querystring: GetEventsQuery }>,
  reply: FastifyReply,
) {
  const { slug } = request.params;
  const { page = 1, limit = 10 } = request.query;

  try {
    const result = await webExperienceService.getUpcomingEventsPaginated(slug, {
      page,
      limit,
    });

    if (!result) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERIENCE_NOT_FOUND',
          message: 'Experience not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: result.events,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error(error, 'Error fetching experience events');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch experience events',
      },
    });
  }
}

/**
 * List public experiences
 * GET /experiences
 */
export async function listExperiences(
  request: FastifyRequest<{ Querystring: ListExperiencesQuery }>,
  reply: FastifyReply,
) {
  const { page = 1, limit = 20, category, type, city, search } = request.query;

  try {
    const result = await webExperienceService.listExperiences({
      page,
      limit,
      category,
      type,
      city,
      search,
    });

    return reply.send({
      success: true,
      data: result.experiences,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error(error, 'Error listing experiences');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list experiences',
      },
    });
  }
}

/**
 * Get featured experiences from same hub (lazy load)
 * GET /experiences/:slug/featured
 */
export async function getFeaturedExperiences(
  request: FastifyRequest<{ Params: GetBySlugParams; Querystring: GetFeaturedQuery }>,
  reply: FastifyReply,
) {
  const { slug } = request.params;
  const { limit = 4 } = request.query;

  try {
    // First get the experience to find hubId
    const experience = await webExperienceService.getExperienceBySlug(slug);

    if (!experience) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERIENCE_NOT_FOUND',
          message: 'Experience not found',
        },
      });
    }

    // Get featured experiences from same hub
    const featured = await webExperienceService.getFeaturedExperiences(
      experience.hub._id,
      experience._id,
      limit,
    );

    return reply.send({
      success: true,
      data: featured,
    });
  } catch (error) {
    request.log.error(error, 'Error fetching featured experiences');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch featured experiences',
      },
    });
  }
}

/**
 * Get experience slots with ticket availability for booking widget
 * GET /experiences/:slug/slots
 */
export async function getExperienceSlots(
  request: FastifyRequest<{ Params: GetBySlugParams; Querystring: GetSlotsQuery }>,
  reply: FastifyReply,
) {
  const { slug } = request.params;
  const { limit = 100 } = request.query;

  try {
    const result = await webExperienceService.getExperienceSlots(slug, limit);

    if (!result) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERIENCE_NOT_FOUND',
          message: 'Experience not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error(error, 'Error fetching experience slots');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch experience slots',
      },
    });
  }
}
