import {
  createNotification,
  deleteNotification,
  deleteOldNotifications,
  getAllNotifications,
  getNotificationById,
  getNotificationStats,
  searchNotifications,
  updateNotificationStatus,
} from '@controllers/admin';
import {
  sharedCreateNotificationBodySchema,
  sharedDeleteOldNotificationsBodySchema,
  sharedGetNotificationsQuerySchema,
  sharedNotificationIdParamSchema,
  sharedSearchNotificationsQuerySchema,
  sharedUpdateNotificationStatusBodySchema,
} from '@schemas/shared';
import type { FastifyInstance } from 'fastify';

/**
 * Admin Notification Routes
 * Manages notification logs and admin operations
 */
export async function adminNotificationRoutes(fastify: FastifyInstance): Promise<void> {
  // Get notification stats
  fastify.get('/stats', {
    schema: {
      tags: ['Notifications (Admin)'],
      summary: 'Get notification stats',
      description: 'Get aggregated notification statistics',
    },
    handler: getNotificationStats,
  });

  // Get all notifications (with pagination and filters)
  fastify.get('/', {
    schema: {
      tags: ['Notifications (Admin)'],
      summary: 'List all notifications',
      description: 'Get paginated list of all notifications with optional filters',
      querystring: sharedGetNotificationsQuerySchema,
    },
    handler: getAllNotifications,
  });

  // Search notifications
  fastify.get('/search', {
    schema: {
      tags: ['Notifications (Admin)'],
      summary: 'Search notifications',
      description: 'Search notifications by title, message, or category',
      querystring: sharedSearchNotificationsQuerySchema,
    },
    handler: searchNotifications,
  });

  // Get notification by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Notifications (Admin)'],
      summary: 'Get notification by ID',
      description: 'Get a single notification by MongoDB ObjectId',
      params: sharedNotificationIdParamSchema,
    },
    handler: getNotificationById,
  });

  // Create notification (admin can send notifications)
  fastify.post('/', {
    schema: {
      tags: ['Notifications (Admin)'],
      summary: 'Create notification',
      description: 'Create and send a new notification to a user',
      body: sharedCreateNotificationBodySchema,
    },
    handler: createNotification,
  });

  // Update notification status
  fastify.patch('/:id/status', {
    schema: {
      tags: ['Notifications (Admin)'],
      summary: 'Update notification status',
      description: 'Update the status of a notification',
      params: sharedNotificationIdParamSchema,
      body: sharedUpdateNotificationStatusBodySchema,
    },
    handler: updateNotificationStatus,
  });

  // Delete notification
  fastify.delete('/:id', {
    schema: {
      tags: ['Notifications (Admin)'],
      summary: 'Delete notification',
      description: 'Permanently delete a notification',
      params: sharedNotificationIdParamSchema,
    },
    handler: deleteNotification,
  });

  // Delete old notifications (cleanup)
  fastify.post('/cleanup', {
    schema: {
      tags: ['Notifications (Admin)'],
      summary: 'Delete old notifications',
      description: 'Delete read notifications older than specified days',
      body: sharedDeleteOldNotificationsBodySchema,
    },
    handler: deleteOldNotifications,
  });
}
