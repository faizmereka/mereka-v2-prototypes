import type {
  HubDeleteExpertiseInput,
  HubGetExpertiseByIdInput,
  HubQueryExpertisesInput,
  HubUpsertExpertiseInput,
  HubUpsertExpertiseParams,
} from '@schemas/hub';
import { hubExpertiseService } from '@services/hub';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Create or Update Expertise
 * POST/PUT /api/v1/expertises or POST/PUT /api/v1/expertises/:id
 */
export async function upsertExpertise(
  request: FastifyRequest<{ Body: HubUpsertExpertiseInput; Params?: HubUpsertExpertiseParams }>,
  reply: FastifyReply,
) {
  try {
    const id = request.params?.id;
    const expertise = await hubExpertiseService.upsertExpertise(request.body, id);

    const statusCode = id ? 200 : 201;

    return reply.status(statusCode).send({
      success: true,
      data: expertise,
    });
  } catch (error) {
    request.log.error(
      {
        error,
        body: request.body,
        params: request.params,
      },
      'Error upserting expertise',
    );

    const statusCode =
      error instanceof Error && error.message.includes('not found')
        ? 404
        : error instanceof Error && error.message.includes('already exists')
          ? 409
          : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'EXPERTISE_UPSERT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to save expertise',
      },
    });
  }
}

/**
 * Get Expertise by ID
 * GET /api/v1/expertises/:id
 */
export async function getExpertiseById(
  request: FastifyRequest<{ Params: HubGetExpertiseByIdInput }>,
  reply: FastifyReply,
) {
  try {
    const expertise = await hubExpertiseService.getExpertiseById(request.params);

    return reply.status(200).send({
      success: true,
      data: expertise,
    });
  } catch (error) {
    request.log.error(
      {
        error,
        params: request.params,
      },
      'Error getting expertise',
    );

    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'GET_EXPERTISE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get expertise',
      },
    });
  }
}

/**
 * Query Expertises with filters
 * GET /api/v1/hub/:hubId/expertises
 */
export async function queryExpertises(
  request: FastifyRequest<{ Params: { hubId: string }; Querystring: HubQueryExpertisesInput }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    // Merge hubId from params with query filters
    const result = await hubExpertiseService.queryExpertises({ ...request.query, hubId });

    return reply.status(200).send({
      success: true,
      data: result.expertises,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error(
      {
        error,
        query: request.query,
      },
      'Error querying expertises',
    );

    return reply.status(400).send({
      success: false,
      error: {
        code: 'QUERY_EXPERTISES_ERROR',
        message: error instanceof Error ? error.message : 'Failed to query expertises',
      },
    });
  }
}

/**
 * Delete Expertise by ID
 * DELETE /api/v1/expertises/:id
 */
export async function deleteExpertise(
  request: FastifyRequest<{ Params: HubDeleteExpertiseInput }>,
  reply: FastifyReply,
) {
  try {
    const result = await hubExpertiseService.deleteExpertise(request.params);

    return reply.status(200).send({
      success: true,
      message: result.message,
    });
  } catch (error) {
    request.log.error(
      {
        error,
        params: request.params,
      },
      'Error deleting expertise',
    );

    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'DELETE_EXPERTISE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete expertise',
      },
    });
  }
}

/**
 * Publish Expertise
 * PATCH /api/v1/expertises/:id/publish
 */
export async function publishExpertise(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const expertise = await hubExpertiseService.publishExpertise(request.params.id);

    return reply.status(200).send({
      success: true,
      data: expertise,
    });
  } catch (error) {
    request.log.error(
      {
        error,
        params: request.params,
      },
      'Error publishing expertise',
    );

    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'PUBLISH_EXPERTISE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to publish expertise',
      },
    });
  }
}

/**
 * Archive Expertise
 * PATCH /api/v1/expertises/:id/archive
 */
export async function archiveExpertise(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const expertise = await hubExpertiseService.archiveExpertise(request.params.id);

    return reply.status(200).send({
      success: true,
      data: expertise,
    });
  } catch (error) {
    request.log.error(
      {
        error,
        params: request.params,
      },
      'Error archiving expertise',
    );

    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'ARCHIVE_EXPERTISE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to archive expertise',
      },
    });
  }
}

/**
 * Get Expertise Slots
 * GET /api/v1/hub/:hubId/expertises/:id/slots
 */
export async function getExpertiseSlots(
  request: FastifyRequest<{
    Params: { hubId: string; id: string };
    Querystring: { ticketId?: string; daysAhead?: number };
  }>,
  reply: FastifyReply,
) {
  try {
    const { id } = request.params;
    const { ticketId, daysAhead } = request.query;

    const result = await hubExpertiseService.getExpertiseSlots(id, ticketId, daysAhead);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error(
      {
        error,
        params: request.params,
        query: request.query,
      },
      'Error getting expertise slots',
    );

    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'GET_EXPERTISE_SLOTS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get expertise slots',
      },
    });
  }
}
