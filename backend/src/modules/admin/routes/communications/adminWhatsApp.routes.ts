import {
  deleteWhatsAppLog,
  getWhatsAppLogById,
  getWhatsAppLogs,
  getWhatsAppStats,
  searchWhatsAppLogs,
} from '@controllers/admin';
import {
  getWhatsAppLogsQuerySchema,
  searchWhatsAppLogsQuerySchema,
  whatsAppLogIdParamSchema,
} from '@schemas/shared';
import type { FastifyInstance } from 'fastify';

/**
 * Admin WhatsApp Routes
 * Manages WhatsApp logs for viewing sent messages
 */
export async function adminWhatsAppRoutes(fastify: FastifyInstance): Promise<void> {
  // Get All WhatsApp Logs (with pagination and filters)
  fastify.get('/', {
    schema: {
      tags: ['WhatsApp Logs'],
      summary: 'List WhatsApp logs',
      description: 'Get paginated list of WhatsApp logs with optional filters',
      querystring: getWhatsAppLogsQuerySchema,
    },
    handler: getWhatsAppLogs,
  });

  // Get WhatsApp Stats
  fastify.get('/stats', {
    schema: {
      tags: ['WhatsApp Logs'],
      summary: 'Get WhatsApp statistics',
      description: 'Get statistics about WhatsApp message delivery status and templates',
    },
    handler: getWhatsAppStats,
  });

  // Search WhatsApp Logs
  fastify.get('/search', {
    schema: {
      tags: ['WhatsApp Logs'],
      summary: 'Search WhatsApp logs',
      description: 'Search WhatsApp logs by phone number, template ID, or template name',
      querystring: searchWhatsAppLogsQuerySchema,
    },
    handler: searchWhatsAppLogs,
  });

  // Get WhatsApp Log by ID
  fastify.get('/:id', {
    schema: {
      tags: ['WhatsApp Logs'],
      summary: 'Get WhatsApp log by ID',
      description: 'Get a single WhatsApp log by MongoDB ObjectId',
      params: whatsAppLogIdParamSchema,
    },
    handler: getWhatsAppLogById,
  });

  // Delete WhatsApp Log
  fastify.delete('/:id', {
    schema: {
      tags: ['WhatsApp Logs'],
      summary: 'Delete WhatsApp log',
      description: 'Permanently delete a WhatsApp log entry',
      params: whatsAppLogIdParamSchema,
    },
    handler: deleteWhatsAppLog,
  });
}
