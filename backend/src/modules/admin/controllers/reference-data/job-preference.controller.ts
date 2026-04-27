import type {
  AdminCreateSimpleReferenceDataInput,
  AdminUpdateSimpleReferenceDataInput,
} from '@schemas/admin';
import { jobPreferenceService } from '@services/reference-data';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Job Preference Controllers
 */
export async function getAllJobPreferences(
  request: FastifyRequest<{ Querystring: { includeInactive?: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const includeInactive = request.query.includeInactive === 'true';
    const jobPreferences = await jobPreferenceService.getAll(includeInactive);

    return reply.send({
      success: true,
      data: jobPreferences,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get job preferences');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_JOB_PREFERENCES_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get job preferences',
      },
    });
  }
}

export async function getJobPreferenceById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const jobPreference = await jobPreferenceService.getById(request.params.id);

    if (!jobPreference) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'JOB_PREFERENCE_NOT_FOUND',
          message: 'Job preference not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: jobPreference,
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Failed to get job preference');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_JOB_PREFERENCE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get job preference',
      },
    });
  }
}

export async function createJobPreference(
  request: FastifyRequest<{ Body: AdminCreateSimpleReferenceDataInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const jobPreference = await jobPreferenceService.create(request.body);

    return reply.status(201).send({
      success: true,
      data: jobPreference,
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Failed to create job preference');

    if (error instanceof Error && error.message.includes('already exists')) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'JOB_PREFERENCE_ALREADY_EXISTS',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'CREATE_JOB_PREFERENCE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create job preference',
      },
    });
  }
}

export async function updateJobPreference(
  request: FastifyRequest<{
    Params: { id: string };
    Body: AdminUpdateSimpleReferenceDataInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const jobPreference = await jobPreferenceService.update(request.params.id, request.body);

    if (!jobPreference) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'JOB_PREFERENCE_NOT_FOUND',
          message: 'Job preference not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: jobPreference,
    });
  } catch (error) {
    request.log.error(
      { error, id: request.params.id, body: request.body },
      'Failed to update job preference',
    );

    if (error instanceof Error && error.message.includes('already exists')) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'JOB_PREFERENCE_ALREADY_EXISTS',
          message: error.message,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_JOB_PREFERENCE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update job preference',
      },
    });
  }
}

export async function deleteJobPreference(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const jobPreference = await jobPreferenceService.delete(request.params.id);

    if (!jobPreference) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'JOB_PREFERENCE_NOT_FOUND',
          message: 'Job preference not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: jobPreference,
      message: 'Job preference deactivated successfully',
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Failed to delete job preference');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'DELETE_JOB_PREFERENCE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete job preference',
      },
    });
  }
}
