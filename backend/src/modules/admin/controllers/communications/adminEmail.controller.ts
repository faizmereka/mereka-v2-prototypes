import type { EmailIdParam, GetEmailLogsQuery, SearchEmailsQuery } from '@schemas/shared';
import { emailService } from '@services/communications';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get all email logs with pagination and filters
 */
export async function getEmailLogs(
  request: FastifyRequest<{ Querystring: GetEmailLogsQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await emailService.getEmailLogs(request.query);
    return reply.send({
      success: true,
      data: result.emails,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get email logs');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'EMAIL_LOGS_ERROR',
        message: 'Failed to retrieve email logs',
      },
    });
  }
}

/**
 * Get email log by ID
 */
export async function getEmailById(
  request: FastifyRequest<{ Params: EmailIdParam }>,
  reply: FastifyReply,
) {
  try {
    const email = await emailService.getEmailById(request.params.id);
    if (!email) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EMAIL_NOT_FOUND',
          message: 'Email not found',
        },
      });
    }
    return reply.send({ success: true, data: email });
  } catch (error) {
    request.log.error({ error }, 'Failed to get email');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'EMAIL_ERROR',
        message: 'Failed to retrieve email',
      },
    });
  }
}

/**
 * Get email stats
 */
export async function getEmailStats(request: FastifyRequest, reply: FastifyReply) {
  try {
    const stats = await emailService.getEmailStats();
    return reply.send({ success: true, data: stats });
  } catch (error) {
    request.log.error({ error }, 'Failed to get email stats');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'EMAIL_STATS_ERROR',
        message: 'Failed to retrieve email stats',
      },
    });
  }
}

/**
 * Search email logs
 */
export async function searchEmails(
  request: FastifyRequest<{ Querystring: SearchEmailsQuery }>,
  reply: FastifyReply,
) {
  try {
    const result = await emailService.searchEmails(request.query.query, {
      startDate: request.query.startDate,
      endDate: request.query.endDate,
      page: request.query.page,
      limit: request.query.limit,
    });
    return reply.send({
      success: true,
      data: result.emails,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to search emails');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'EMAIL_SEARCH_ERROR',
        message: 'Failed to search emails',
      },
    });
  }
}

/**
 * Delete email log
 */
export async function deleteEmail(
  request: FastifyRequest<{ Params: EmailIdParam }>,
  reply: FastifyReply,
) {
  try {
    const email = await emailService.deleteEmail(request.params.id);
    if (!email) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EMAIL_NOT_FOUND',
          message: 'Email not found',
        },
      });
    }
    return reply.send({ success: true, data: email });
  } catch (error) {
    request.log.error({ error }, 'Failed to delete email');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'EMAIL_DELETE_ERROR',
        message: 'Failed to delete email',
      },
    });
  }
}
