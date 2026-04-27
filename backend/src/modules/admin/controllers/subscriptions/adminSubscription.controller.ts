import type { SubscriptionStatus } from '@core/models/Subscription';
import type {
  ListSubscriptionsQuery,
  SubscriptionIdParams,
} from '@core/schemas/admin/subscriptions';
import { adminSubscriptionService } from '@core/services/admin/subscriptions';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get subscription statistics
 */
export async function getSubscriptionStats(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const stats = await adminSubscriptionService.getStats();
    return reply.send({ success: true, data: stats });
  } catch (error) {
    request.log.error({ error }, 'Error fetching subscription stats');
    return reply.status(500).send({
      success: false,
      error: { code: 'STATS_ERROR', message: 'Failed to fetch subscription statistics' },
    });
  }
}

/**
 * List subscriptions with pagination and filters
 */
export async function listSubscriptions(
  request: FastifyRequest<{ Querystring: ListSubscriptionsQuery }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const result = await adminSubscriptionService.list({
      ...request.query,
      status: request.query.status as SubscriptionStatus | undefined,
    });

    return reply.send({ success: true, data: result });
  } catch (error) {
    request.log.error({ error }, 'Error listing subscriptions');
    return reply.status(500).send({
      success: false,
      error: { code: 'LIST_ERROR', message: 'Failed to list subscriptions' },
    });
  }
}

/**
 * Get subscription by ID with full details including plan information
 */
export async function getSubscriptionById(
  request: FastifyRequest<{ Params: SubscriptionIdParams }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { id } = request.params;
    const subscription = await adminSubscriptionService.getById(id);

    if (!subscription) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription not found' },
      });
    }

    return reply.send({ success: true, data: subscription });
  } catch (error) {
    request.log.error({ error }, 'Error fetching subscription');
    return reply.status(500).send({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch subscription' },
    });
  }
}
