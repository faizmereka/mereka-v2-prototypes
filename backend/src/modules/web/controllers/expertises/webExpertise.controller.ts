import { webExpertiseService } from '@services/web';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Types
// ============================================================================

interface GetBySlugParams {
  slug: string;
}

interface ListExpertisesQuery {
  page?: number;
  limit?: number;
  city?: string;
  mode?: 'online' | 'physical';
  search?: string;
}

interface GetFeaturedQuery {
  limit?: number;
}

interface GetSlotsQuery {
  ticketId?: string;
  daysAhead?: number;
}

// ============================================================================
// Controllers
// ============================================================================

/**
 * Get expertise detail by slug
 * GET /expertises/:slug
 */
export async function getExpertiseBySlug(
  request: FastifyRequest<{ Params: GetBySlugParams }>,
  reply: FastifyReply,
) {
  const { slug } = request.params;
  // Get userId if authenticated (optional auth for public pages)
  const userId = (request.user as { sub?: string } | undefined)?.sub;

  try {
    const expertise = await webExpertiseService.getExpertiseBySlug(slug, userId);

    if (!expertise) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERTISE_NOT_FOUND',
          message: 'Expertise not found or is not publicly available',
        },
      });
    }

    return reply.send({
      success: true,
      data: expertise,
    });
  } catch (error) {
    request.log.error(error, 'Error fetching expertise by slug');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch expertise',
      },
    });
  }
}

/**
 * List public expertises
 * GET /expertises
 */
export async function listExpertises(
  request: FastifyRequest<{ Querystring: ListExpertisesQuery }>,
  reply: FastifyReply,
) {
  const { page = 1, limit = 20, city, mode, search } = request.query;

  try {
    const result = await webExpertiseService.listExpertises({
      page,
      limit,
      city,
      mode,
      search,
    });

    return reply.send({
      success: true,
      data: result.expertises,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error(error, 'Error listing expertises');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list expertises',
      },
    });
  }
}

/**
 * Get featured expertises from same hub (lazy load)
 * GET /expertises/:slug/featured
 */
export async function getFeaturedExpertises(
  request: FastifyRequest<{ Params: GetBySlugParams; Querystring: GetFeaturedQuery }>,
  reply: FastifyReply,
) {
  const { slug } = request.params;
  const { limit = 4 } = request.query;

  try {
    // First get the expertise to find hubId
    const expertise = await webExpertiseService.getExpertiseBySlug(slug);

    if (!expertise) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERTISE_NOT_FOUND',
          message: 'Expertise not found',
        },
      });
    }

    // Get featured expertises from same hub
    const featured = await webExpertiseService.getFeaturedExpertises(
      expertise.hub?._id || '',
      expertise._id,
      limit,
    );

    return reply.send({
      success: true,
      data: featured,
    });
  } catch (error) {
    request.log.error(error, 'Error fetching featured expertises');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch featured expertises',
      },
    });
  }
}

/**
 * Get expertise available slots for booking
 * GET /expertises/:slug/slots
 */
export async function getExpertiseSlots(
  request: FastifyRequest<{ Params: GetBySlugParams; Querystring: GetSlotsQuery }>,
  reply: FastifyReply,
) {
  const { slug } = request.params;
  const { ticketId, daysAhead = 30 } = request.query;

  try {
    const result = await webExpertiseService.getExpertiseSlots(slug, ticketId, daysAhead);

    if (!result) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERTISE_NOT_FOUND',
          message: 'Expertise not found or is not publicly available',
        },
      });
    }

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error(error, 'Error fetching expertise slots');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch expertise slots',
      },
    });
  }
}
