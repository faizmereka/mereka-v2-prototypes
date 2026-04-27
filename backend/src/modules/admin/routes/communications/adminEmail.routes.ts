import {
  deleteEmail,
  getEmailById,
  getEmailLogs,
  getEmailStats,
  searchEmails,
} from '@controllers/admin';
import {
  emailIdParamSchema,
  getEmailLogsQuerySchema,
  searchEmailsQuerySchema,
} from '@schemas/shared';
import type { FastifyInstance } from 'fastify';

/**
 * Admin Email Routes
 * Manages email logs for viewing sent emails
 */
export async function adminEmailRoutes(fastify: FastifyInstance): Promise<void> {
  // Get All Email Logs (with pagination and filters)
  fastify.get('/', {
    schema: {
      tags: ['Email Logs'],
      summary: 'List email logs',
      description: 'Get paginated list of email logs with optional filters',
      querystring: getEmailLogsQuerySchema,
    },
    handler: getEmailLogs,
  });

  // Get Email Stats
  fastify.get('/stats', {
    schema: {
      tags: ['Email Logs'],
      summary: 'Get email statistics',
      description: 'Get statistics about email delivery status and types',
    },
    handler: getEmailStats,
  });

  // Search Emails
  fastify.get('/search', {
    schema: {
      tags: ['Email Logs'],
      summary: 'Search email logs',
      description: 'Search emails by recipient, type, or template ID',
      querystring: searchEmailsQuerySchema,
    },
    handler: searchEmails,
  });

  // Get Email by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Email Logs'],
      summary: 'Get email by ID',
      description: 'Get a single email log by MongoDB ObjectId',
      params: emailIdParamSchema,
    },
    handler: getEmailById,
  });

  // Delete Email Log
  fastify.delete('/:id', {
    schema: {
      tags: ['Email Logs'],
      summary: 'Delete email log',
      description: 'Permanently delete an email log entry',
      params: emailIdParamSchema,
    },
    handler: deleteEmail,
  });
}
