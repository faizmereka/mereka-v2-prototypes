import { getUserId } from '@core/utils/auth-helpers';
import { notificationService } from '@services/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Input for listing hub notifications
 */
interface ListHubNotificationsQuery {
  page?: number;
  limit?: number;
  isRead?: boolean | string;
}

/**
 * Get notifications for a hub (hub-scoped notifications for the current user)
 * GET /hub/:hubId/notifications
 *
 * Returns hub-scoped notifications for the hub dashboard
 * Supports pagination for lazy loading
 */
export async function getHubNotifications(
  request: FastifyRequest<{
    Params: { hubId: string };
    Querystring: ListHubNotificationsQuery;
  }>,
  reply: FastifyReply,
) {
  const userId = getUserId(request);
  const { hubId } = request.params;
  const { page, limit, isRead } = request.query;

  try {
    request.log.info({ userId, hubId }, 'Fetching hub notifications');

    const result = await notificationService.getHubNotifications(userId, hubId, {
      page,
      limit,
      isRead,
    });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, userId, hubId }, 'Error fetching hub notifications');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch notifications',
      },
    });
  }
}

/**
 * Get unread count for hub notifications
 * GET /hub/:hubId/notifications/unread-count
 */
export async function getHubUnreadCount(
  request: FastifyRequest<{ Params: { hubId: string } }>,
  reply: FastifyReply,
) {
  const userId = getUserId(request);
  const { hubId } = request.params;

  try {
    const unreadCount = await notificationService.getHubUnreadCount(userId, hubId);

    return reply.send({
      success: true,
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    request.log.error({ error, userId, hubId }, 'Error fetching hub unread count');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch unread count',
      },
    });
  }
}

/**
 * Mark a hub notification as read
 * POST /hub/:hubId/notifications/:notificationId/read
 */
export async function markHubNotificationAsRead(
  request: FastifyRequest<{
    Params: { hubId: string; notificationId: string };
  }>,
  reply: FastifyReply,
) {
  const userId = getUserId(request);
  const { hubId, notificationId } = request.params;

  try {
    const notification = await notificationService.markAsRead(notificationId, userId);

    if (!notification) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Notification not found',
        },
      });
    }

    request.log.info({ userId, hubId, notificationId }, 'Marked notification as read');

    return reply.send({
      success: true,
      data: notification,
    });
  } catch (error) {
    request.log.error(
      { error, userId, hubId, notificationId },
      'Error marking notification as read',
    );

    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to mark notification as read',
      },
    });
  }
}

/**
 * Mark all hub notifications as read
 * POST /hub/:hubId/notifications/mark-all-read
 */
export async function markAllHubNotificationsAsRead(
  request: FastifyRequest<{ Params: { hubId: string } }>,
  reply: FastifyReply,
) {
  const userId = getUserId(request);
  const { hubId } = request.params;

  try {
    const result = await notificationService.markAllHubAsRead(userId, hubId);

    request.log.info(
      { userId, hubId, modifiedCount: result.modifiedCount },
      'Marked all hub notifications as read',
    );

    return reply.send({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    request.log.error({ error, userId, hubId }, 'Error marking all hub notifications as read');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to mark all notifications as read',
      },
    });
  }
}

/**
 * Delete a hub notification
 * DELETE /hub/:hubId/notifications/:notificationId
 */
export async function deleteHubNotification(
  request: FastifyRequest<{
    Params: { hubId: string; notificationId: string };
  }>,
  reply: FastifyReply,
) {
  const userId = getUserId(request);
  const { hubId, notificationId } = request.params;

  try {
    const notification = await notificationService.deleteNotification(notificationId, userId);

    if (!notification) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Notification not found',
        },
      });
    }

    request.log.info({ userId, hubId, notificationId }, 'Deleted notification');

    return reply.send({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    request.log.error({ error, userId, hubId, notificationId }, 'Error deleting notification');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete notification',
      },
    });
  }
}
