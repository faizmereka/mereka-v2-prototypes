import type { HubStatus } from '@core/models/Hub';
import { type AdminListHubsQuery, adminHubService } from '@core/services/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get hub statistics for admin dashboard
 */
export async function getHubStats(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const stats = await adminHubService.getHubStats();
    return reply.status(200).send({
      success: true,
      data: stats,
    });
  } catch (error) {
    _request.log.error({ error }, 'Failed to get hub stats');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'HUB_STATS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get hub stats',
      },
    });
  }
}

/**
 * List all hubs with filtering and pagination
 */
export async function listHubs(
  request: FastifyRequest<{
    Querystring: AdminListHubsQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const result = await adminHubService.listHubs(request.query);
    return reply.status(200).send({
      success: true,
      data: result.items,
      meta: {
        total: result.pagination.total,
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to list hubs');
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
 * Get hub by ID with full details
 */
export async function getHubById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const hub = await adminHubService.getHubById(request.params.id);
    return reply.status(200).send({
      success: true,
      data: hub,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get hub');
    if (error instanceof Error && error.message === 'Hub not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'HUB_NOT_FOUND',
          message: 'Hub not found',
        },
      });
    }
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
 * Update hub status (approve, reject, etc.)
 */
export async function updateHubStatus(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { status: HubStatus; reason?: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { status, reason } = request.body;
    const hub = await adminHubService.updateHubStatus(request.params.id, status, reason);
    return reply.status(200).send({
      success: true,
      data: hub,
      message: `Hub status updated to ${status}`,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to update hub status');
    if (error instanceof Error && error.message === 'Hub not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'HUB_NOT_FOUND',
          message: 'Hub not found',
        },
      });
    }
    return reply.status(400).send({
      success: false,
      error: {
        code: 'UPDATE_HUB_STATUS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update hub status',
      },
    });
  }
}

/**
 * Toggle hub featured status
 */
export async function toggleHubFeatured(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const hub = await adminHubService.toggleHubFeatured(request.params.id);
    return reply.status(200).send({
      success: true,
      data: hub,
      message: hub.isFeatured ? 'Hub is now featured' : 'Hub is no longer featured',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to toggle hub featured');
    if (error instanceof Error && error.message === 'Hub not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'HUB_NOT_FOUND',
          message: 'Hub not found',
        },
      });
    }
    if (error instanceof Error && error.message === 'Only active hubs can be featured') {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'HUB_NOT_ACTIVE',
          message: 'Only active hubs can be featured',
        },
      });
    }
    return reply.status(500).send({
      success: false,
      error: {
        code: 'TOGGLE_FEATURED_ERROR',
        message: error instanceof Error ? error.message : 'Failed to toggle featured status',
      },
    });
  }
}

/**
 * Delete hub (soft delete - set to inactive)
 */
export async function deleteHub(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    await adminHubService.deleteHub(request.params.id);
    return reply.status(200).send({
      success: true,
      message: 'Hub deleted successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to delete hub');
    if (error instanceof Error && error.message === 'Hub not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'HUB_NOT_FOUND',
          message: 'Hub not found',
        },
      });
    }
    return reply.status(500).send({
      success: false,
      error: {
        code: 'DELETE_HUB_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete hub',
      },
    });
  }
}

/**
 * Bulk update hub status
 */
export async function bulkUpdateHubStatus(
  request: FastifyRequest<{
    Body: { hubIds: string[]; status: HubStatus };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubIds, status } = request.body;
    const result = await adminHubService.bulkUpdateHubStatus(hubIds, status);
    return reply.status(200).send({
      success: true,
      data: result,
      message: `${result.modifiedCount} hubs updated to ${status}`,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to bulk update hub status');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'BULK_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to bulk update hubs',
      },
    });
  }
}

/**
 * Update hub display order
 */
export async function updateHubOrder(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { displayOrder: number };
  }>,
  reply: FastifyReply,
) {
  try {
    const { displayOrder } = request.body;
    const hub = await adminHubService.updateHubOrder(request.params.id, displayOrder);
    return reply.status(200).send({
      success: true,
      data: hub,
      message: `Hub display order updated to ${displayOrder}`,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to update hub order');
    if (error instanceof Error && error.message === 'Hub not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'HUB_NOT_FOUND',
          message: 'Hub not found',
        },
      });
    }
    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_HUB_ORDER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update hub order',
      },
    });
  }
}
