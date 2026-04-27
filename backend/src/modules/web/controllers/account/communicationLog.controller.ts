import type { CommunicationLogQuery } from '@core/schemas/shared/communications/communicationLog.schema';
import { communicationLogService } from '@core/services/shared/communications/communicationLog.service';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get User Communication Logs
 * Fetches all communication logs (InApp, Email, WhatsApp) for the authenticated user
 */
export async function getUserCommunicationLogs(
  request: FastifyRequest<{ Querystring: CommunicationLogQuery }>,
  reply: FastifyReply,
) {
  try {
    const userId = (request.user as { sub: string }).sub;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const result = await communicationLogService.getUserLogs(userId, {
      channel: request.query.channel,
      templateId: request.query.templateId,
      status: request.query.status,
      startDate: request.query.startDate,
      endDate: request.query.endDate,
      page: request.query.page,
      limit: request.query.limit,
    });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Error fetching user communication logs');
    return reply.status(500).send({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch communication logs' },
    });
  }
}

/**
 * Get User Communication Logs Summary
 * Returns counts for each channel
 */
export async function getUserCommunicationLogsSummary(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    const userId = (request.user as { sub: string }).sub;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      });
    }

    const summary = await communicationLogService.getUserLogsSummary(userId);

    return reply.send({
      success: true,
      data: summary,
    });
  } catch (error) {
    request.log.error({ error }, 'Error fetching user communication logs summary');
    return reply.status(500).send({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch communication logs summary' },
    });
  }
}
