import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  getUserCommunicationLogsSchema,
  getUserCommunicationLogsSummarySchema,
} from '@core/schemas/shared/communications/communicationLog.schema';
import type { FastifyInstance, RouteHandlerMethod } from 'fastify';
import {
  getUserCommunicationLogs,
  getUserCommunicationLogsSummary,
} from '../../controllers/account/communicationLog.controller';

/**
 * User Communication Log Routes
 * All routes require authentication
 *
 * GET /me/communication-logs - Get all communication logs (InApp, Email, WhatsApp)
 * GET /me/communication-logs/summary - Get summary counts for each channel
 */
export async function communicationLogRoutes(fastify: FastifyInstance) {
  /**
   * Get user communication logs
   */
  fastify.get(
    '/',
    {
      preHandler: [requireAuth],
      schema: {
        ...getUserCommunicationLogsSchema,
        security: [{ bearerAuth: [] }],
      },
    },
    getUserCommunicationLogs as RouteHandlerMethod,
  );

  /**
   * Get user communication logs summary
   */
  fastify.get(
    '/summary',
    {
      preHandler: [requireAuth],
      schema: {
        ...getUserCommunicationLogsSummarySchema,
        security: [{ bearerAuth: [] }],
      },
    },
    getUserCommunicationLogsSummary,
  );
}
