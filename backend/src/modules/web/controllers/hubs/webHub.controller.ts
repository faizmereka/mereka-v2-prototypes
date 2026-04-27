import { webHubService } from '@core/services/web/hubs';
import type { FastifyReply, FastifyRequest } from 'fastify';

interface AuthUser {
  sub: string; // MongoDB user ID from JWT
  email: string;
}

// ============================================================================
// Types
// ============================================================================

interface HubListQuery {
  page?: number;
  limit?: number;
  focusArea?: string;
  companyType?: string;
  city?: string;
  country?: string;
  search?: string;
  featured?: boolean;
}

interface HubDetailParams {
  slug: string;
}

interface HubExpertsQuery {
  limit?: number;
}

interface HubServicesQuery {
  limit?: number;
  type?: 'expertise' | 'experience' | 'all';
}

// ============================================================================
// Controllers
// ============================================================================

/**
 * List public hubs with filtering
 * GET /hubs
 */
export async function listHubs(
  request: FastifyRequest<{ Querystring: HubListQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await webHubService.listHubs(request.query);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing hubs');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_HUBS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list hubs',
      },
    });
  }
}

/**
 * Get hub detail by slug
 * GET /hubs/:slug
 * Uses optional auth - if user is logged in and is a member, they can see draft hubs
 */
export async function getHubBySlug(
  request: FastifyRequest<{ Params: HubDetailParams }>,
  reply: FastifyReply,
) {
  try {
    const { slug } = request.params;
    const user = (request as unknown as { user?: AuthUser }).user;

    const hub = await webHubService.getHubBySlug({
      slug,
      userId: user?.sub,
    });

    if (!hub) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'HUB_NOT_FOUND',
          message: 'Hub not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: hub,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting hub detail');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_HUB_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get hub',
      },
    });
  }
}

/**
 * Get hub experts
 * GET /hubs/:slug/experts
 */
export async function getHubExperts(
  request: FastifyRequest<{ Params: HubDetailParams; Querystring: HubExpertsQuery }>,
  reply: FastifyReply,
) {
  try {
    const { slug } = request.params;
    const { limit } = request.query;
    const user = (request as unknown as { user?: AuthUser }).user;
    const experts = await webHubService.getHubExperts(slug, limit, user?.sub);

    return reply.send({
      success: true,
      data: { experts },
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting hub experts');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_HUB_EXPERTS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get hub experts',
      },
    });
  }
}

/**
 * Get hub services (expertises & experiences)
 * GET /hubs/:slug/services
 */
export async function getHubServices(
  request: FastifyRequest<{ Params: HubDetailParams; Querystring: HubServicesQuery }>,
  reply: FastifyReply,
) {
  try {
    const { slug } = request.params;
    const user = (request as unknown as { user?: AuthUser }).user;
    const services = await webHubService.getHubServices(slug, {
      ...request.query,
      userId: user?.sub,
    });

    return reply.send({
      success: true,
      data: { services },
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting hub services');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_HUB_SERVICES_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get hub services',
      },
    });
  }
}
