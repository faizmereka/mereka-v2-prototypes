import type { AdminCreateFocusAreaInput, AdminUpdateFocusAreaInput } from '@schemas/admin';
import { focusAreaService } from '@services/reference-data';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Focus Area Controllers
 */
export async function getAllFocusAreas(
  request: FastifyRequest<{ Querystring: { includeInactive?: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const includeInactive = request.query.includeInactive === 'true';
    const focusAreas = await focusAreaService.getAll(includeInactive);

    return reply.send({
      success: true,
      data: focusAreas,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get focus areas');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_FOCUS_AREAS_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get focus areas',
      },
    });
  }
}

export async function getFocusAreaById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const focusArea = await focusAreaService.getById(request.params.id);

    if (!focusArea) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'FOCUS_AREA_NOT_FOUND',
          message: 'Focus area not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: focusArea,
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Failed to get focus area');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_FOCUS_AREA_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get focus area',
      },
    });
  }
}

export async function createFocusArea(
  request: FastifyRequest<{ Body: AdminCreateFocusAreaInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const focusArea = await focusAreaService.create(
      request.body as unknown as Parameters<typeof focusAreaService.create>[0],
    );

    return reply.status(201).send({
      success: true,
      data: focusArea,
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Failed to create focus area');

    if (error instanceof Error && error.message.includes('already exists')) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'FOCUS_AREA_ALREADY_EXISTS',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'CREATE_FOCUS_AREA_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create focus area',
      },
    });
  }
}

export async function updateFocusArea(
  request: FastifyRequest<{
    Params: { id: string };
    Body: AdminUpdateFocusAreaInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const focusArea = await focusAreaService.update(
      request.params.id,
      request.body as unknown as Parameters<typeof focusAreaService.update>[1],
    );

    if (!focusArea) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'FOCUS_AREA_NOT_FOUND',
          message: 'Focus area not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: focusArea,
    });
  } catch (error) {
    request.log.error(
      { error, id: request.params.id, body: request.body },
      'Failed to update focus area',
    );

    if (error instanceof Error && error.message.includes('already exists')) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'FOCUS_AREA_ALREADY_EXISTS',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_FOCUS_AREA_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update focus area',
      },
    });
  }
}

export async function deleteFocusArea(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const focusArea = await focusAreaService.delete(request.params.id);

    if (!focusArea) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'FOCUS_AREA_NOT_FOUND',
          message: 'Focus area not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: focusArea,
      message: 'Focus area deactivated successfully',
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Failed to delete focus area');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'DELETE_FOCUS_AREA_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete focus area',
      },
    });
  }
}
