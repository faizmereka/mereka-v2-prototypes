import {
  type AdminListExperiencesQuery,
  adminExperienceService,
  type ExperienceStatus,
} from '@core/services/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get experience statistics for admin dashboard
 */
export async function getExperienceStats(_request: FastifyRequest, reply: FastifyReply) {
  try {
    const stats = await adminExperienceService.getExperienceStats();
    return reply.status(200).send({
      success: true,
      data: stats,
    });
  } catch (error) {
    _request.log.error({ error }, 'Failed to get experience stats');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'EXPERIENCE_STATS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get experience stats',
      },
    });
  }
}

/**
 * List all experiences with filtering and pagination
 */
export async function listExperiences(
  request: FastifyRequest<{
    Querystring: AdminListExperiencesQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const result = await adminExperienceService.listExperiences(request.query);
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
    request.log.error({ error }, 'Failed to list experiences');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_EXPERIENCES_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list experiences',
      },
    });
  }
}

/**
 * Get experience by ID with full details
 */
export async function getExperienceById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const experience = await adminExperienceService.getExperienceById(request.params.id);
    return reply.status(200).send({
      success: true,
      data: experience,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get experience');
    if (error instanceof Error && error.message === 'Experience not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERIENCE_NOT_FOUND',
          message: 'Experience not found',
        },
      });
    }
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_EXPERIENCE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get experience',
      },
    });
  }
}

/**
 * Update experience status
 */
export async function updateExperienceStatus(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { status: ExperienceStatus; reason?: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { status, reason } = request.body;
    const experience = await adminExperienceService.updateExperienceStatus(
      request.params.id,
      status,
      reason,
    );
    return reply.status(200).send({
      success: true,
      data: experience,
      message: `Experience status updated to ${status}`,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to update experience status');
    if (error instanceof Error && error.message === 'Experience not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERIENCE_NOT_FOUND',
          message: 'Experience not found',
        },
      });
    }
    return reply.status(400).send({
      success: false,
      error: {
        code: 'UPDATE_EXPERIENCE_STATUS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update experience status',
      },
    });
  }
}

/**
 * Toggle experience featured status
 */
export async function toggleExperienceFeatured(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const experience = await adminExperienceService.toggleExperienceFeatured(request.params.id);
    return reply.status(200).send({
      success: true,
      data: experience,
      message: experience.isFeatured
        ? 'Experience is now featured'
        : 'Experience is no longer featured',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to toggle experience featured');
    if (error instanceof Error && error.message === 'Experience not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERIENCE_NOT_FOUND',
          message: 'Experience not found',
        },
      });
    }
    if (error instanceof Error && error.message === 'Only active experiences can be featured') {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'EXPERIENCE_NOT_ACTIVE',
          message: 'Only active experiences can be featured',
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
 * Delete experience (soft delete - set status to DELETED)
 */
export async function deleteExperience(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    await adminExperienceService.deleteExperience(request.params.id);
    return reply.status(200).send({
      success: true,
      message: 'Experience deleted successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to delete experience');
    if (error instanceof Error && error.message === 'Experience not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERIENCE_NOT_FOUND',
          message: 'Experience not found',
        },
      });
    }
    return reply.status(500).send({
      success: false,
      error: {
        code: 'DELETE_EXPERIENCE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete experience',
      },
    });
  }
}

/**
 * Bulk update experience status
 */
export async function bulkUpdateExperienceStatus(
  request: FastifyRequest<{
    Body: { experienceIds: string[]; status: ExperienceStatus };
  }>,
  reply: FastifyReply,
) {
  try {
    const { experienceIds, status } = request.body;
    const result = await adminExperienceService.bulkUpdateExperienceStatus(experienceIds, status);
    return reply.status(200).send({
      success: true,
      data: result,
      message: `${result.modifiedCount} experiences updated to ${status}`,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to bulk update experience status');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'BULK_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to bulk update experiences',
      },
    });
  }
}

/**
 * Update experience priority/order
 */
export async function updateExperiencePriority(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { priority: number };
  }>,
  reply: FastifyReply,
) {
  try {
    const { priority } = request.body;
    const experience = await adminExperienceService.updateExperiencePriority(
      request.params.id,
      priority,
    );
    return reply.status(200).send({
      success: true,
      data: experience,
      message: `Experience priority updated to ${priority}`,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to update experience priority');
    if (error instanceof Error && error.message === 'Experience not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERIENCE_NOT_FOUND',
          message: 'Experience not found',
        },
      });
    }
    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_EXPERIENCE_PRIORITY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update experience priority',
      },
    });
  }
}

/**
 * Get experience events (upcoming occurrences)
 */
export async function getExperienceEvents(
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: {
      limit?: number;
      status?: 'ACTIVE' | 'CANCELLED' | 'DELETED';
      upcoming?: boolean;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const result = await adminExperienceService.getExperienceEvents(id, request.query);
    return reply.status(200).send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get experience events');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_EXPERIENCE_EVENTS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get experience events',
      },
    });
  }
}
