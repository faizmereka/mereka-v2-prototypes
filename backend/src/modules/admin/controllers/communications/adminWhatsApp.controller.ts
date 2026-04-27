import type {
  GetWhatsAppLogsQuery,
  SearchWhatsAppLogsQuery,
  WhatsAppLogIdParam,
} from '@schemas/shared';
import { whatsAppService } from '@services/communications';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get all WhatsApp logs with pagination and filters
 */
export async function getWhatsAppLogs(
  request: FastifyRequest<{ Querystring: GetWhatsAppLogsQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await whatsAppService.getWhatsAppLogs(request.query);
    return reply.send({
      success: true,
      data: result.logs,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get WhatsApp logs');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'WHATSAPP_LOGS_ERROR',
        message: 'Failed to retrieve WhatsApp logs',
      },
    });
  }
}

/**
 * Get WhatsApp log by ID
 */
export async function getWhatsAppLogById(
  request: FastifyRequest<{ Params: WhatsAppLogIdParam }>,
  reply: FastifyReply,
) {
  try {
    const log = await whatsAppService.getWhatsAppLogById(request.params.id);
    if (!log) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'WHATSAPP_LOG_NOT_FOUND',
          message: 'WhatsApp log not found',
        },
      });
    }
    return reply.send({ success: true, data: log });
  } catch (error) {
    request.log.error({ error }, 'Failed to get WhatsApp log');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'WHATSAPP_LOG_ERROR',
        message: 'Failed to retrieve WhatsApp log',
      },
    });
  }
}

/**
 * Get WhatsApp stats
 */
export async function getWhatsAppStats(request: FastifyRequest, reply: FastifyReply) {
  try {
    const stats = await whatsAppService.getWhatsAppStats();
    return reply.send({ success: true, data: stats });
  } catch (error) {
    request.log.error({ error }, 'Failed to get WhatsApp stats');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'WHATSAPP_STATS_ERROR',
        message: 'Failed to retrieve WhatsApp stats',
      },
    });
  }
}

/**
 * Search WhatsApp logs
 */
export async function searchWhatsAppLogs(
  request: FastifyRequest<{ Querystring: SearchWhatsAppLogsQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await whatsAppService.searchWhatsAppLogs(request.query.query, {
      startDate: request.query.startDate,
      endDate: request.query.endDate,
      page: request.query.page,
      limit: request.query.limit,
    });
    return reply.send({
      success: true,
      data: result.logs,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to search WhatsApp logs');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'WHATSAPP_SEARCH_ERROR',
        message: 'Failed to search WhatsApp logs',
      },
    });
  }
}

/**
 * Delete WhatsApp log
 */
export async function deleteWhatsAppLog(
  request: FastifyRequest<{ Params: WhatsAppLogIdParam }>,
  reply: FastifyReply,
) {
  try {
    const log = await whatsAppService.deleteWhatsAppLog(request.params.id);
    if (!log) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'WHATSAPP_LOG_NOT_FOUND',
          message: 'WhatsApp log not found',
        },
      });
    }
    return reply.send({ success: true, data: log });
  } catch (error) {
    request.log.error({ error }, 'Failed to delete WhatsApp log');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'WHATSAPP_DELETE_ERROR',
        message: 'Failed to delete WhatsApp log',
      },
    });
  }
}
