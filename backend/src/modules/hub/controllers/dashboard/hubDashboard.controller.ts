import { hubDashboardService } from '@core/services/hub/dashboard';
import { getUserId } from '@core/utils/auth-helpers';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get collaborator dashboard data
 */
export async function getCollaboratorDashboard(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { hubId } = request.params;

    const data = await hubDashboardService.getCollaboratorDashboard(userId, hubId);

    return reply.send({
      success: true,
      data,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get collaborator dashboard');

    if (error instanceof Error) {
      if (error.message === 'Hub not found' || error.message === 'User not found') {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message,
          },
        });
      }
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_COLLABORATOR_DASHBOARD_FAILED',
        message: 'Failed to get collaborator dashboard',
      },
    });
  }
}

/**
 * Get hub dashboard statistics
 */
export async function getHubDashboardStats(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;

    const stats = await hubDashboardService.getStats(hubId);

    return reply.send({
      success: true,
      data: stats,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get hub dashboard stats');

    if (error instanceof Error) {
      if (
        error.message === 'Hub not found or access denied' ||
        error.message === 'No hub found for user'
      ) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'HUB_NOT_FOUND',
            message: error.message,
          },
        });
      }
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_DASHBOARD_STATS_FAILED',
        message: 'Failed to get dashboard statistics',
      },
    });
  }
}

/**
 * Get hub active orders
 */
export async function getHubDashboardOrders(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;

    const orders = await hubDashboardService.getOrders(hubId);

    return reply.send({
      success: true,
      data: orders,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get hub dashboard orders');

    if (error instanceof Error) {
      if (
        error.message === 'Hub not found or access denied' ||
        error.message === 'No hub found for user'
      ) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'HUB_NOT_FOUND',
            message: error.message,
          },
        });
      }
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_DASHBOARD_ORDERS_FAILED',
        message: 'Failed to get dashboard orders',
      },
    });
  }
}

/**
 * Get hub onboarding status
 */
export async function getHubOnboardingStatus(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { hubId } = request.params;

    const status = await hubDashboardService.getOnboardingStatus(userId, hubId);

    return reply.send({
      success: true,
      data: status,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get hub onboarding status');

    if (error instanceof Error) {
      if (
        error.message === 'Hub not found or access denied' ||
        error.message === 'No hub found for user'
      ) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'HUB_NOT_FOUND',
            message: error.message,
          },
        });
      }
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_ONBOARDING_STATUS_FAILED',
        message: 'Failed to get onboarding status',
      },
    });
  }
}
