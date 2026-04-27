import type {
  AdminCreateTargetAudienceInput,
  AdminListTargetAudiencesQuery,
  AdminUpdateTargetAudienceInput,
} from '@schemas/admin';
import { targetAudienceService } from '@services/reference-data';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Target Audience Controllers
 */
export async function createTargetAudience(
  request: FastifyRequest<{ Body: AdminCreateTargetAudienceInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const audience = await targetAudienceService.createAudience(request.body);
    return reply.status(201).send({
      success: true,
      data: audience,
    });
  } catch (error) {
    request.log.error({ error }, 'Error creating target audience');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'AUDIENCE_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create audience',
      },
    });
  }
}

export async function listTargetAudiences(
  request: FastifyRequest<{ Querystring: AdminListTargetAudiencesQuery }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const result = await targetAudienceService.listAudiences(request.query);
    return reply.send({
      success: true,
      data: result.audiences,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing target audiences');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'AUDIENCE_LIST_ERROR',
        message: 'Failed to list audiences',
      },
    });
  }
}

export async function listActiveTargetAudiences(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const audiences = await targetAudienceService.listActiveAudiences();
    return reply.send({
      success: true,
      data: audiences,
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing active target audiences');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'AUDIENCE_LIST_ERROR',
        message: 'Failed to list active audiences',
      },
    });
  }
}

export async function getTargetAudienceById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const audience = await targetAudienceService.getAudienceById(request.params.id);
    if (!audience) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'AUDIENCE_NOT_FOUND',
          message: 'Target audience not found',
        },
      });
    }
    return reply.send({
      success: true,
      data: audience,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting target audience');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'AUDIENCE_GET_ERROR',
        message: 'Failed to get target audience',
      },
    });
  }
}

export async function updateTargetAudience(
  request: FastifyRequest<{
    Params: { id: string };
    Body: AdminUpdateTargetAudienceInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const audience = await targetAudienceService.updateAudience(request.params.id, request.body);
    return reply.send({
      success: true,
      data: audience,
    });
  } catch (error) {
    request.log.error({ error }, 'Error updating target audience');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'AUDIENCE_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update target audience',
      },
    });
  }
}

export async function deleteTargetAudience(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    await targetAudienceService.deleteAudience(request.params.id);
    return reply.send({
      success: true,
      message: 'Target audience deleted successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Error deleting target audience');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'AUDIENCE_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete target audience',
      },
    });
  }
}
