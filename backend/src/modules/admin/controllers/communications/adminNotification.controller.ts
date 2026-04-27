import type {
  SharedCreateNotificationInput,
  SharedDeleteOldNotificationsInput,
  SharedGetNotificationsQuery,
  SharedNotificationIdParam,
  SharedSearchNotificationsQuery,
  SharedUpdateNotificationStatusInput,
} from '@schemas/shared';
import { notificationService } from '@services/communications';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Admin Notification Controllers
 * Manages notification logs and admin operations
 */

/**
 * Get all notifications (with pagination and filters)
 */
export async function getAllNotifications(
  request: FastifyRequest<{ Querystring: SharedGetNotificationsQuery }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const result = await notificationService.getAllNotifications(request.query);

    return reply.send({
      success: true,
      data: result.notifications,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error listing notifications');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'NOTIFICATION_LIST_ERROR',
        message: 'Failed to list notifications',
      },
    });
  }
}

/**
 * Get notification by ID
 */
export async function getNotificationById(
  request: FastifyRequest<{ Params: SharedNotificationIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const notification = await notificationService.getNotificationById(request.params.id);

    if (!notification) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: notification,
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Error getting notification');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'NOTIFICATION_GET_ERROR',
        message: 'Failed to get notification',
      },
    });
  }
}

/**
 * Create notification (admin)
 */
export async function createNotification(
  request: FastifyRequest<{ Body: SharedCreateNotificationInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const notification = await notificationService.createNotification(request.body);

    return reply.status(201).send({
      success: true,
      data: notification,
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Error creating notification');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'NOTIFICATION_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create notification',
      },
    });
  }
}

/**
 * Update notification status
 */
export async function updateNotificationStatus(
  request: FastifyRequest<{
    Params: SharedNotificationIdParam;
    Body: SharedUpdateNotificationStatusInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const notification = await notificationService.updateNotificationStatus(
      request.params.id,
      request.body.status,
    );

    if (!notification) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: notification,
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Error updating notification status');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'NOTIFICATION_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update notification',
      },
    });
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(
  request: FastifyRequest<{ Params: SharedNotificationIdParam }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const notification = await notificationService.adminDeleteNotification(request.params.id);

    if (!notification) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOTIFICATION_NOT_FOUND',
          message: 'Notification not found',
        },
      });
    }

    return reply.send({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    request.log.error({ error, id: request.params.id }, 'Error deleting notification');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'NOTIFICATION_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete notification',
      },
    });
  }
}

/**
 * Get notification stats
 */
export async function getNotificationStats(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const stats = await notificationService.getNotificationStats();

    return reply.send({
      success: true,
      data: stats,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting notification stats');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'NOTIFICATION_STATS_ERROR',
        message: 'Failed to get notification stats',
      },
    });
  }
}

/**
 * Search notifications
 */
export async function searchNotifications(
  request: FastifyRequest<{ Querystring: SharedSearchNotificationsQuery }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const result = await notificationService.searchNotifications(request.query.query, {
      startDate: request.query.startDate,
      endDate: request.query.endDate,
      page: request.query.page,
      limit: request.query.limit,
    });

    return reply.send({
      success: true,
      data: result.notifications,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error, query: request.query }, 'Error searching notifications');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'NOTIFICATION_SEARCH_ERROR',
        message: 'Failed to search notifications',
      },
    });
  }
}

/**
 * Delete old notifications (cleanup)
 */
export async function deleteOldNotifications(
  request: FastifyRequest<{ Body: SharedDeleteOldNotificationsInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const result = await notificationService.deleteOldNotifications(request.body.olderThanDays);

    return reply.send({
      success: true,
      data: result,
      message: `Deleted ${result.deletedCount} old notifications`,
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Error deleting old notifications');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'NOTIFICATION_CLEANUP_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete old notifications',
      },
    });
  }
}
