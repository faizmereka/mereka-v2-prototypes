import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  getHubCommunicationLogsSchema,
  getHubCommunicationLogsSummarySchema,
} from '@core/schemas/shared/communications/communicationLog.schema';
import type { FastifyInstance, RouteHandlerMethod } from 'fastify';
import {
  getHubCommunicationLogs,
  getHubCommunicationLogsSummary,
} from '../../controllers/settings/hubCommunicationLog.controller';

/**
 * Hub Communication Log Routes
 * All routes require authentication
 * Base path: /hub/:hubId/settings/communication-logs
 *
 * GET / - Get all communication logs (Email, WhatsApp) for the hub
 * GET /summary - Get summary counts for each channel
 */
export async function hubCommunicationLogRoutes(fastify: FastifyInstance) {
  /**
   * Get hub communication logs
   */
  fastify.get(
    '/',
    {
      preHandler: [requireAuth],
      schema: {
        ...getHubCommunicationLogsSchema,
        security: [{ bearerAuth: [] }],
      },
    },
    getHubCommunicationLogs as RouteHandlerMethod,
  );

  /**
   * Get hub communication logs summary
   */
  fastify.get(
    '/summary',
    {
      preHandler: [requireAuth],
      schema: {
        ...getHubCommunicationLogsSummarySchema,
        security: [{ bearerAuth: [] }],
      },
    },
    getHubCommunicationLogsSummary as RouteHandlerMethod,
  );
}
