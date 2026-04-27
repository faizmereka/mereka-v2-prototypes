import {
  getHubNotificationPreferences,
  toggleHubNotificationPreference,
  updateHubNotificationPreferences,
} from '@controllers/hub';
import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  toggleHubPreferenceBodySchema,
  updateHubNotificationPreferencesBodySchema,
} from '@core/schemas/hub/settings';
import type { FastifyInstance, RouteHandlerMethod } from 'fastify';

/**
 * Hub Notification Preference Routes
 * Endpoints for managing hub notification preferences from settings page
 * Base path: /hub/:hubId/settings/notification-preferences
 *
 * Requires notification.managePreferences permission
 */
export async function hubNotificationPreferenceRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Get hub notification preferences grouped by category
   */
  fastify.get('/', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Settings'],
      summary: 'Get hub notification preferences',
      description: 'Get hub notification preferences grouped by category',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: {
            type: 'string',
            description: 'Hub ID',
          },
        },
      },
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
                notifyOwner: { type: 'boolean' },
                notifyAdmins: { type: 'boolean' },
                summaryFrequency: {
                  type: 'string',
                  enum: ['daily', 'weekly', 'monthly', 'none'],
                },
              },
            },
          },
        },
      },
    },
    handler: getHubNotificationPreferences,
  });

  /**
   * Update hub notification preferences
   */
  fastify.patch('/', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Settings'],
      summary: 'Update hub notification preferences',
      description: 'Update hub notification preferences',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: {
            type: 'string',
            description: 'Hub ID',
          },
        },
      },
      body: updateHubNotificationPreferencesBodySchema.body,
      security: [{ bearerAuth: [] }],
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
    handler: updateHubNotificationPreferences as RouteHandlerMethod,
  });

  /**
   * Toggle a single hub notification preference
   */
  fastify.post('/toggle', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Settings'],
      summary: 'Toggle a hub notification preference',
      description: 'Toggles a specific notification preference for the hub',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: {
            type: 'string',
            description: 'Hub ID',
          },
        },
      },
      body: toggleHubPreferenceBodySchema.body,
      security: [{ bearerAuth: [] }],
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
    handler: toggleHubNotificationPreference as RouteHandlerMethod,
  });
}
