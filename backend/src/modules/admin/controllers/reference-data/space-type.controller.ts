import type {
  AdminCreateSimpleReferenceDataInput,
  AdminUpdateSimpleReferenceDataInput,
} from '@schemas/admin';
import { spaceTypeService } from '@services/reference-data';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Space Type Controllers
 */
export async function getAllSpaceTypes(
  request: FastifyRequest<{ Querystring: { includeInactive?: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const includeInactive = request.query.includeInactive === 'true';
    const spaceTypes = await spaceTypeService.getAll(includeInactive);

    return reply.send({
      success: true,
      data: spaceTypes,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get space types');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_SPACE_TYPES_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get space types',
      },
    });
  }
}

export async function getSpaceTypeById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const spaceType = await spaceTypeService.getById(request.params.id);

    if (!spaceType) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'SPACE_TYPE_NOT_FOUND',
          message: 'Space type not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: spaceType,
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Failed to get space type');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_SPACE_TYPE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get space type',
      },
    });
  }
}

export async function createSpaceType(
  request: FastifyRequest<{ Body: AdminCreateSimpleReferenceDataInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const spaceType = await spaceTypeService.create(request.body);

    return reply.status(201).send({
      success: true,
      data: spaceType,
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Failed to create space type');

    if (error instanceof Error && error.message.includes('already exists')) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'SPACE_TYPE_ALREADY_EXISTS',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'CREATE_SPACE_TYPE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create space type',
      },
    });
  }
}

export async function updateSpaceType(
  request: FastifyRequest<{
    Params: { id: string };
    Body: AdminUpdateSimpleReferenceDataInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const spaceType = await spaceTypeService.update(request.params.id, request.body);

    if (!spaceType) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'SPACE_TYPE_NOT_FOUND',
          message: 'Space type not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: spaceType,
    });
  } catch (error) {
    request.log.error(
      { error, id: request.params.id, body: request.body },
      'Failed to update space type',
    );

    if (error instanceof Error && error.message.includes('already exists')) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'SPACE_TYPE_ALREADY_EXISTS',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_SPACE_TYPE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update space type',
      },
    });
  }
}

export async function deleteSpaceType(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const spaceType = await spaceTypeService.delete(request.params.id);

    if (!spaceType) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'SPACE_TYPE_NOT_FOUND',
          message: 'Space type not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: spaceType,
      message: 'Space type deactivated successfully',
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Failed to delete space type');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'DELETE_SPACE_TYPE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete space type',
      },
    });
  }
}
