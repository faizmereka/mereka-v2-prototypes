import { requireAuth } from '@core/middlewares/auth.middleware';
import type { FastifyInstance, RouteHandlerMethod } from 'fastify';
import {
  deleteHubNotification,
  getHubNotifications,
  getHubUnreadCount,
  markAllHubNotificationsAsRead,
  markHubNotificationAsRead,
} from '../../controllers/notifications';

/**
 * Hub Notification Routes
 * All routes require authentication and hub access
 *
 * GET /hub/:hubId/notifications - Get hub notifications (paginated)
 * GET /hub/:hubId/notifications/unread-count - Get unread count
 * POST /hub/:hubId/notifications/:notificationId/read - Mark as read
 * POST /hub/:hubId/notifications/mark-all-read - Mark all as read
 * DELETE /hub/:hubId/notifications/:notificationId - Delete notification
 */
export async function hubNotificationRoutes(fastify: FastifyInstance) {
  /**
   * Get hub notifications (paginated)
   */
  fastify.get(
    '/',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Hub - Notifications'],
        summary: 'Get hub notifications',
        description:
          'Returns hub-scoped notifications for the hub dashboard with pagination support',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['hubId'],
          properties: {
            hubId: { type: 'string' },
          },
        },
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
                        hubId: { type: 'string' },
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
    getHubNotifications as RouteHandlerMethod,
  );

  /**
   * Get unread notification count
   */
  fastify.get(
    '/unread-count',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Hub - Notifications'],
        summary: 'Get unread notification count',
        description: 'Returns the count of unread hub-scoped notifications',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['hubId'],
          properties: {
            hubId: { type: 'string' },
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
                  unreadCount: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    getHubUnreadCount as RouteHandlerMethod,
  );

  /**
   * Mark a notification as read
   */
  fastify.post(
    '/:notificationId/read',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Hub - Notifications'],
        summary: 'Mark notification as read',
        description: 'Marks a specific hub notification as read',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['hubId', 'notificationId'],
          properties: {
            hubId: { type: 'string' },
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
    markHubNotificationAsRead as RouteHandlerMethod,
  );

  /**
   * Mark all notifications as read
   */
  fastify.post(
    '/mark-all-read',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Hub - Notifications'],
        summary: 'Mark all notifications as read',
        description: 'Marks all hub-scoped notifications as read',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['hubId'],
          properties: {
            hubId: { type: 'string' },
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
                  modifiedCount: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    markAllHubNotificationsAsRead as RouteHandlerMethod,
  );

  /**
   * Delete a notification
   */
  fastify.delete(
    '/:notificationId',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Hub - Notifications'],
        summary: 'Delete notification',
        description: 'Deletes a specific hub notification',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['hubId', 'notificationId'],
          properties: {
            hubId: { type: 'string' },
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
    deleteHubNotification as RouteHandlerMethod,
  );
}
