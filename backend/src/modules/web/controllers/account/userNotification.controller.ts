import { notificationService } from '@services/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Input for listing user notifications
 */
interface ListUserNotificationsQuery {
  page?: number;
  limit?: number;
  isRead?: boolean | string;
}

/**
 * Get notifications for authenticated user (user-scoped only)
 * GET /me/notifications
 *
 * Returns user-scoped notifications (not hub-related) for the learner dashboard
 * Supports pagination for lazy loading
 */
export async function getUserNotifications(
  request: FastifyRequest<{ Querystring: ListUserNotificationsQuery }>,
  reply: FastifyReply,
) {
  const userId = (request.user as { sub: string }).sub;
  const { page, limit, isRead } = request.query;

  try {
    const result = await notificationService.getUserNotifications(userId, {
      page,
      limit,
      isRead,
    });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, userId }, 'Error fetching user notifications');

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
 * Get unread count for authenticated user (user-scoped only)
 * GET /me/notifications/unread-count
 */
export async function getUserUnreadCount(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as { sub: string }).sub;

  try {
    // Get user-scoped notifications only (no hubId)
    const result = await notificationService.getUserNotifications(userId, { limit: 1 });

    return reply.send({
      success: true,
      data: {
        unreadCount: result.unreadCount,
      },
    });
  } catch (error) {
    request.log.error({ error, userId }, 'Error fetching unread count');

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
 * Mark a notification as read
 * POST /me/notifications/:notificationId/read
 */
export async function markNotificationAsRead(
  request: FastifyRequest<{ Params: { notificationId: string } }>,
  reply: FastifyReply,
) {
  const userId = (request.user as { sub: string }).sub;
  const { notificationId } = request.params;

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

    return reply.send({
      success: true,
      data: notification,
    });
  } catch (error) {
    request.log.error({ error, userId, notificationId }, 'Error marking notification as read');

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
 * Mark all user notifications as read (user-scoped only)
 * POST /me/notifications/mark-all-read
 */
export async function markAllUserNotificationsAsRead(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as { sub: string }).sub;

  try {
    const result = await notificationService.markAllAsRead(userId);

    return reply.send({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    request.log.error({ error, userId }, 'Error marking all notifications as read');

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
 * Delete a notification
 * DELETE /me/notifications/:notificationId
 */
export async function deleteUserNotification(
  request: FastifyRequest<{ Params: { notificationId: string } }>,
  reply: FastifyReply,
) {
  const userId = (request.user as { sub: string }).sub;
  const { notificationId } = request.params;

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

    return reply.send({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    request.log.error({ error, userId, notificationId }, 'Error deleting notification');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete notification',
      },
    });
  }
}
