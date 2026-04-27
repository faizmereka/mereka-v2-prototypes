import { getSubscriptionById, getSubscriptionStats, listSubscriptions } from '@controllers/admin';
import {
  getSubscriptionByIdSchema,
  getSubscriptionStatsSchema,
  listSubscriptionsSchema,
} from '@core/schemas/admin/subscriptions';
import type { FastifyInstance } from 'fastify';

/**
 * Admin Subscription Routes
 * Prefix: /api/v1/admin/subscriptions
 */
export async function adminSubscriptionRoutes(fastify: FastifyInstance): Promise<void> {
  // Stats endpoint
  fastify.get('/stats', {
    schema: getSubscriptionStatsSchema,
    handler: getSubscriptionStats,
  });

  // List subscriptions
  fastify.get('/', {
    schema: listSubscriptionsSchema,
    handler: listSubscriptions,
  });

  // Get single subscription
  fastify.get('/:id', {
    schema: getSubscriptionByIdSchema,
    handler: getSubscriptionById,
  });
}
