import type {
  AdminCreateSimpleReferenceDataInput,
  AdminUpdateSimpleReferenceDataInput,
} from '@schemas/admin';
import { facilityService } from '@services/reference-data';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Facility Controllers
 */
export async function getAllFacilities(
  request: FastifyRequest<{ Querystring: { includeInactive?: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const includeInactive = request.query.includeInactive === 'true';
    const facilities = await facilityService.getAll(includeInactive);

    return reply.send({
      success: true,
      data: facilities,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get facilities');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_FACILITIES_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get facilities',
      },
    });
  }
}

export async function getFacilityById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const facility = await facilityService.getById(request.params.id);

    if (!facility) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'FACILITY_NOT_FOUND',
          message: 'Facility not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: facility,
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Failed to get facility');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_FACILITY_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get facility',
      },
    });
  }
}

export async function createFacility(
  request: FastifyRequest<{ Body: AdminCreateSimpleReferenceDataInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const facility = await facilityService.create(request.body);

    return reply.status(201).send({
      success: true,
      data: facility,
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Failed to create facility');

    if (error instanceof Error && error.message.includes('already exists')) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'FACILITY_ALREADY_EXISTS',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'CREATE_FACILITY_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create facility',
      },
    });
  }
}

export async function updateFacility(
  request: FastifyRequest<{
    Params: { id: string };
    Body: AdminUpdateSimpleReferenceDataInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const facility = await facilityService.update(request.params.id, request.body);

    if (!facility) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'FACILITY_NOT_FOUND',
          message: 'Facility not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: facility,
    });
  } catch (error) {
    request.log.error(
      { error, id: request.params.id, body: request.body },
      'Failed to update facility',
    );

    if (error instanceof Error && error.message.includes('already exists')) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'FACILITY_ALREADY_EXISTS',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_FACILITY_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update facility',
      },
    });
  }
}

export async function deleteFacility(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const facility = await facilityService.delete(request.params.id);

    if (!facility) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'FACILITY_NOT_FOUND',
          message: 'Facility not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: facility,
      message: 'Facility deactivated successfully',
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Failed to delete facility');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'DELETE_FACILITY_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete facility',
      },
    });
  }
}
