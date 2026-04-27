import type {
  CommunicationLogQuery,
  HubCommunicationLogParams,
} from '@core/schemas/shared/communications/communicationLog.schema';
import { communicationLogService } from '@core/services/shared/communications/communicationLog.service';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get Hub Communication Logs
 * Fetches all communication logs (Email, WhatsApp) for the hub
 * InApp notifications are not included as they are user-specific
 */
export async function getHubCommunicationLogs(
  request: FastifyRequest<{
    Params: HubCommunicationLogParams;
    Querystring: CommunicationLogQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    if (!hubId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_HUB', message: 'Hub ID is required' },
      });
    }

    const result = await communicationLogService.getHubLogs(hubId, {
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
    request.log.error({ error }, 'Error fetching hub communication logs');
    return reply.status(500).send({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch communication logs' },
    });
  }
}

/**
 * Get Hub Communication Logs Summary
 * Returns counts for Email and WhatsApp channels
 */
export async function getHubCommunicationLogsSummary(
  request: FastifyRequest<{ Params: HubCommunicationLogParams }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    if (!hubId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_HUB', message: 'Hub ID is required' },
      });
    }

    const summary = await communicationLogService.getHubLogsSummary(hubId);

    return reply.send({
      success: true,
      data: summary,
    });
  } catch (error) {
    request.log.error({ error }, 'Error fetching hub communication logs summary');
    return reply.status(500).send({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch communication logs summary' },
    });
  }
}
