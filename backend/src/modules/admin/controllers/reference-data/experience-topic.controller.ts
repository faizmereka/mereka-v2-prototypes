import type {
  AdminCreateExperienceTopicInput,
  AdminListExperienceTopicsQuery,
  AdminUpdateExperienceTopicInput,
} from '@schemas/admin';
import { experienceTopicService } from '@services/reference-data';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Experience Topic Controllers
 */
export async function createExperienceTopic(
  request: FastifyRequest<{ Body: AdminCreateExperienceTopicInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const topic = await experienceTopicService.createTopic(request.body);
    return reply.status(201).send({
      success: true,
      data: topic,
    });
  } catch (error) {
    request.log.error({ error }, 'Error creating experience topic');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'TOPIC_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create topic',
      },
    });
  }
}

export async function getExperienceTopicById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const topic = await experienceTopicService.getTopicById(request.params.id);
    if (!topic) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'TOPIC_NOT_FOUND',
          message: 'Topic not found',
        },
      });
    }
    return reply.send({
      success: true,
      data: topic,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting experience topic');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'TOPIC_GET_ERROR',
        message: 'Failed to get topic',
      },
    });
  }
}

export async function listExperienceTopics(
  request: FastifyRequest<{ Querystring: AdminListExperienceTopicsQuery }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const result = await experienceTopicService.listTopics(request.query);
    return reply.send({
      success: true,
      data: result.topics,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing experience topics');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'TOPIC_LIST_ERROR',
        message: 'Failed to list topics',
      },
    });
  }
}

export async function updateExperienceTopic(
  request: FastifyRequest<{
    Params: { id: string };
    Body: AdminUpdateExperienceTopicInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const topic = await experienceTopicService.updateTopic(request.params.id, request.body);
    return reply.send({
      success: true,
      data: topic,
    });
  } catch (error) {
    request.log.error({ error }, 'Error updating experience topic');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'TOPIC_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update topic',
      },
    });
  }
}

export async function deleteExperienceTopic(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    await experienceTopicService.deleteTopic(request.params.id);
    return reply.send({
      success: true,
      message: 'Topic deleted successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Error deleting experience topic');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'TOPIC_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete topic',
      },
    });
  }
}
