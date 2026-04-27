import type {
  AdminCreateSimpleReferenceDataInput,
  AdminUpdateSimpleReferenceDataInput,
} from '@schemas/admin';
import { amenityService } from '@services/reference-data';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Amenity Controllers
 */
export async function getAllAmenities(
  request: FastifyRequest<{ Querystring: { includeInactive?: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const includeInactive = request.query.includeInactive === 'true';
    const amenities = await amenityService.getAll(includeInactive);

    return reply.send({
      success: true,
      data: amenities,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get amenities');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_AMENITIES_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get amenities',
      },
    });
  }
}

export async function getAmenityById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const amenity = await amenityService.getById(request.params.id);

    if (!amenity) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'AMENITY_NOT_FOUND',
          message: 'Amenity not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: amenity,
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Failed to get amenity');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_AMENITY_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get amenity',
      },
    });
  }
}

export async function createAmenity(
  request: FastifyRequest<{ Body: AdminCreateSimpleReferenceDataInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const amenity = await amenityService.create(request.body);

    return reply.status(201).send({
      success: true,
      data: amenity,
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Failed to create amenity');

    if (error instanceof Error && error.message.includes('already exists')) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'AMENITY_ALREADY_EXISTS',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'CREATE_AMENITY_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create amenity',
      },
    });
  }
}

export async function updateAmenity(
  request: FastifyRequest<{
    Params: { id: string };
    Body: AdminUpdateSimpleReferenceDataInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const amenity = await amenityService.update(request.params.id, request.body);

    if (!amenity) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'AMENITY_NOT_FOUND',
          message: 'Amenity not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: amenity,
    });
  } catch (error) {
    request.log.error(
      { error, id: request.params.id, body: request.body },
      'Failed to update amenity',
    );

    if (error instanceof Error && error.message.includes('already exists')) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'AMENITY_ALREADY_EXISTS',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_AMENITY_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update amenity',
      },
    });
  }
}

export async function deleteAmenity(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const amenity = await amenityService.delete(request.params.id);

    if (!amenity) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'AMENITY_NOT_FOUND',
          message: 'Amenity not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: amenity,
      message: 'Amenity deactivated successfully',
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Failed to delete amenity');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'DELETE_AMENITY_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete amenity',
      },
    });
  }
}
