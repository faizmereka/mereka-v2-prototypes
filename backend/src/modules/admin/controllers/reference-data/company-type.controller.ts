import type {
  AdminCreateSimpleReferenceDataInput,
  AdminUpdateSimpleReferenceDataInput,
} from '@schemas/admin';
import { companyTypeService } from '@services/reference-data';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Company Type Controllers
 */
export async function getAllCompanyTypes(
  request: FastifyRequest<{ Querystring: { includeInactive?: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const includeInactive = request.query.includeInactive === 'true';
    const companyTypes = await companyTypeService.getAll(includeInactive);

    return reply.send({
      success: true,
      data: companyTypes,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get company types');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_COMPANY_TYPES_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get company types',
      },
    });
  }
}

export async function getCompanyTypeById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const companyType = await companyTypeService.getById(request.params.id);

    if (!companyType) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'COMPANY_TYPE_NOT_FOUND',
          message: 'Company type not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: companyType,
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Failed to get company type');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_COMPANY_TYPE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get company type',
      },
    });
  }
}

export async function createCompanyType(
  request: FastifyRequest<{ Body: AdminCreateSimpleReferenceDataInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const companyType = await companyTypeService.create(request.body);

    return reply.status(201).send({
      success: true,
      data: companyType,
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Failed to create company type');

    if (error instanceof Error && error.message.includes('already exists')) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'COMPANY_TYPE_ALREADY_EXISTS',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'CREATE_COMPANY_TYPE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create company type',
      },
    });
  }
}

export async function updateCompanyType(
  request: FastifyRequest<{
    Params: { id: string };
    Body: AdminUpdateSimpleReferenceDataInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const companyType = await companyTypeService.update(request.params.id, request.body);

    if (!companyType) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'COMPANY_TYPE_NOT_FOUND',
          message: 'Company type not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: companyType,
    });
  } catch (error) {
    request.log.error(
      { error, id: request.params.id, body: request.body },
      'Failed to update company type',
    );

    if (error instanceof Error && error.message.includes('already exists')) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'COMPANY_TYPE_ALREADY_EXISTS',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_COMPANY_TYPE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update company type',
      },
    });
  }
}

export async function deleteCompanyType(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const companyType = await companyTypeService.delete(request.params.id);

    if (!companyType) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'COMPANY_TYPE_NOT_FOUND',
          message: 'Company type not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: companyType,
      message: 'Company type deactivated successfully',
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Failed to delete company type');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'DELETE_COMPANY_TYPE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete company type',
      },
    });
  }
}
