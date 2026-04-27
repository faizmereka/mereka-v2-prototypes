import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  toggleUserPreferenceBodySchema,
  updateUserNotificationPreferencesBodySchema,
} from '@schemas/web';
import type { FastifyInstance, RouteHandlerMethod } from 'fastify';
import {
  getUserNotificationPreferences,
  toggleUserNotificationPreference,
  updateUserNotificationPreferences,
} from '../../controllers/account';

/**
 * User Notification Preference Routes
 * All routes require authentication
 *
 * GET /me/notification-preferences - Get user notification preferences
 * PATCH /me/notification-preferences - Update user notification preferences
 * POST /me/notification-preferences/toggle - Toggle a single preference
 */
export async function notificationPreferenceRoutes(fastify: FastifyInstance) {
  /**
   * Get user notification preferences grouped by category
   */
  fastify.get(
    '/',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Notification Preferences'],
        summary: 'Get notification preferences',
        description:
          'Returns notification preferences grouped by category for the authenticated user',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  categories: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        category: { type: 'string' },
                        label: { type: 'string' },
                        items: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              templateId: { type: 'string' },
                              title: { type: 'string' },
                              description: { type: 'string' },
                              inApp: {
                                type: 'object',
                                properties: {
                                  available: { type: 'boolean' },
                                  enabled: { type: 'boolean' },
                                },
                              },
                              email: {
                                type: 'object',
                                properties: {
                                  available: { type: 'boolean' },
                                  enabled: { type: 'boolean' },
                                },
                              },
                              whatsApp: {
                                type: 'object',
                                properties: {
                                  available: { type: 'boolean' },
                                  enabled: { type: 'boolean' },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  summaryFrequency: {
                    type: 'string',
                    enum: ['daily', 'weekly', 'monthly', 'none'],
                  },
                  globalMute: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    getUserNotificationPreferences,
  );

  /**
   * Update user notification preferences
   */
  fastify.patch(
    '/',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Notification Preferences'],
        summary: 'Update notification preferences',
        description: 'Updates notification preferences for the authenticated user',
        security: [{ bearerAuth: [] }],
        body: updateUserNotificationPreferencesBodySchema.body,
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
    updateUserNotificationPreferences as RouteHandlerMethod,
  );

  /**
   * Toggle a single notification preference
   */
  fastify.post(
    '/toggle',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Notification Preferences'],
        summary: 'Toggle a notification preference',
        description: 'Toggles a specific notification preference for the authenticated user',
        security: [{ bearerAuth: [] }],
        body: toggleUserPreferenceBodySchema.body,
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
    toggleUserNotificationPreference as RouteHandlerMethod,
  );
}
