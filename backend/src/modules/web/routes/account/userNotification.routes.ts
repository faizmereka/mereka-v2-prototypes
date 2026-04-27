import { requireAuth } from '@core/middlewares/auth.middleware';
import type { FastifyInstance, RouteHandlerMethod } from 'fastify';
import {
  deleteUserNotification,
  getUserNotifications,
  getUserUnreadCount,
  markAllUserNotificationsAsRead,
  markNotificationAsRead,
} from '../../controllers/account';

/**
 * User Notification Routes
 * All routes require authentication
 *
 * GET /me/notifications - Get user notifications (paginated)
 * GET /me/notifications/unread-count - Get unread count
 * POST /me/notifications/:notificationId/read - Mark as read
 * POST /me/notifications/mark-all-read - Mark all as read
 * DELETE /me/notifications/:notificationId - Delete notification
 */
export async function userNotificationRoutes(fastify: FastifyInstance) {
  /**
   * Get user notifications (paginated)
   */
  fastify.get(
    '/',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Notifications'],
        summary: 'Get user notifications',
        description:
          'Returns user-scoped notifications for the learner dashboard with pagination support',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            isRead: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  notifications: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        _id: { type: 'string' },
                        userId: { type: 'string' },
                        templateId: { type: 'string' },
                        title: { type: 'string' },
                        message: { type: 'string' },
                        image: { type: 'string' },
                        actions: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              label: { type: 'string' },
                              type: { type: 'string' },
                              url: { type: 'string' },
                              actionType: { type: 'string' },
                            },
                          },
                        },
                        isRead: { type: 'boolean' },
                        readAt: { type: 'string', format: 'date-time' },
                        createdAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                  total: { type: 'integer' },
                  unreadCount: { type: 'integer' },
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                  totalPages: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    getUserNotifications as RouteHandlerMethod,
  );

  /**
   * Get unread notification count
   */
  fastify.get(
    '/unread-count',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Notifications'],
        summary: 'Get unread notification count',
        description: 'Returns the count of unread user-scoped notifications',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  unreadCount: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    getUserUnreadCount as RouteHandlerMethod,
  );

  /**
   * Mark a notification as read
   */
  fastify.post(
    '/:notificationId/read',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Notifications'],
        summary: 'Mark notification as read',
        description: 'Marks a specific notification as read',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['notificationId'],
          properties: {
            notificationId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    markNotificationAsRead as RouteHandlerMethod,
  );

  /**
   * Mark all notifications as read
   */
  fastify.post(
    '/mark-all-read',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Notifications'],
        summary: 'Mark all notifications as read',
        description: 'Marks all user-scoped notifications as read',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  modifiedCount: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    markAllUserNotificationsAsRead as RouteHandlerMethod,
  );

  /**
   * Delete a notification
   */
  fastify.delete(
    '/:notificationId',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Notifications'],
        summary: 'Delete notification',
        description: 'Deletes a specific notification',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['notificationId'],
          properties: {
            notificationId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  deleted: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    deleteUserNotification as RouteHandlerMethod,
  );
}
