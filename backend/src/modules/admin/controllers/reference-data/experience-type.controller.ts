import type {
  AdminCreateSimpleReferenceDataInput,
  AdminUpdateSimpleReferenceDataInput,
} from '@schemas/admin';
import { experienceTypeService } from '@services/reference-data';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Experience Type Controllers
 */
export async function getAllExperienceTypes(
  request: FastifyRequest<{ Querystring: { includeInactive?: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const includeInactive = request.query.includeInactive === 'true';
    const experienceTypes = await experienceTypeService.getAll(includeInactive);

    return reply.send({
      success: true,
      data: experienceTypes,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get experience types');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_EXPERIENCE_TYPES_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get experience types',
      },
    });
  }
}

export async function getExperienceTypeById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const experienceType = await experienceTypeService.getById(request.params.id);

    if (!experienceType) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERIENCE_TYPE_NOT_FOUND',
          message: 'Experience type not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: experienceType,
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Failed to get experience type');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_EXPERIENCE_TYPE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get experience type',
      },
    });
  }
}

export async function createExperienceType(
  request: FastifyRequest<{ Body: AdminCreateSimpleReferenceDataInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const experienceType = await experienceTypeService.create(request.body);

    return reply.status(201).send({
      success: true,
      data: experienceType,
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Failed to create experience type');

    if (error instanceof Error && error.message.includes('already exists')) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'EXPERIENCE_TYPE_ALREADY_EXISTS',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'CREATE_EXPERIENCE_TYPE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create experience type',
      },
    });
  }
}

export async function updateExperienceType(
  request: FastifyRequest<{
    Params: { id: string };
    Body: AdminUpdateSimpleReferenceDataInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const experienceType = await experienceTypeService.update(request.params.id, request.body);

    if (!experienceType) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERIENCE_TYPE_NOT_FOUND',
          message: 'Experience type not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: experienceType,
    });
  } catch (error) {
    request.log.error(
      { error, id: request.params.id, body: request.body },
      'Failed to update experience type',
    );

    if (error instanceof Error && error.message.includes('already exists')) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'EXPERIENCE_TYPE_ALREADY_EXISTS',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_EXPERIENCE_TYPE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update experience type',
      },
    });
  }
}

export async function deleteExperienceType(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const experienceType = await experienceTypeService.delete(request.params.id);

    if (!experienceType) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EXPERIENCE_TYPE_NOT_FOUND',
          message: 'Experience type not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: experienceType,
      message: 'Experience type deactivated successfully',
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Failed to delete experience type');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'DELETE_EXPERIENCE_TYPE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete experience type',
      },
    });
  }
}
