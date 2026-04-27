import { webExpertService } from '@core/services/web/experts';
import type { FastifyReply, FastifyRequest } from 'fastify';

interface AuthUser {
  sub: string; // MongoDB user ID from JWT
  email: string;
}

// ============================================================================
// Types
// ============================================================================

interface ExpertListQuery {
  page?: number;
  limit?: number;
  focusArea?: string;
  skill?: string;
  city?: string;
  country?: string;
  search?: string;
  hubId?: string;
}

interface ExpertDetailParams {
  slug: string;
}

interface ExpertServicesQuery {
  limit?: number;
  type?: 'expertise' | 'experience' | 'all';
}

interface ExpertReviewsQuery {
  page?: number;
  limit?: number;
  rating?: number;
}

// ============================================================================
// Controllers
// ============================================================================

/**
 * List public experts with filtering
 * GET /experts
 */
export async function listExperts(
  request: FastifyRequest<{ Querystring: ExpertListQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await webExpertService.listExperts(request.query);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing experts');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_EXPERTS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list experts',
      },
    });
  }
}

/**
 * Get expert detail by username/slug
 * GET /experts/:slug
 * Uses optional auth - if user is logged in and is the profile owner, they can see incomplete profiles
 */
export async function getExpertBySlug(
  request: FastifyRequest<{ Params: ExpertDetailParams }>,
  reply: FastifyReply,
) {
  try {
    const { slug } = request.params;
    const user = (request as unknown as { user?: AuthUser }).user;

    const expert = await webExpertService.getExpertBySlug({
      slug,
      userId: user?.sub,
    });

    if (!expert) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERT_NOT_FOUND',
          message: 'Expert not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: expert,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting expert detail');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_EXPERT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get expert',
      },
    });
  }
}

/**
 * Get expert services (expertises & experiences)
 * GET /experts/:slug/services
 */
export async function getExpertServices(
  request: FastifyRequest<{ Params: ExpertDetailParams; Querystring: ExpertServicesQuery }>,
  reply: FastifyReply,
) {
  try {
    const { slug } = request.params;
    const services = await webExpertService.getExpertServices(slug, request.query);

    return reply.send({
      success: true,
      data: { services },
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting expert services');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_EXPERT_SERVICES_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get expert services',
      },
    });
  }
}

/**
 * Get expert reviews (reviews across all their services)
 * GET /experts/:slug/reviews
 */
export async function getExpertReviews(
  request: FastifyRequest<{ Params: ExpertDetailParams; Querystring: ExpertReviewsQuery }>,
  reply: FastifyReply,
) {
  try {
    const { slug } = request.params;
    const result = await webExpertService.getExpertReviews(slug, request.query);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting expert reviews');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_EXPERT_REVIEWS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get expert reviews',
      },
    });
  }
}
