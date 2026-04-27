import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  getUserHubNotificationPreferencesQuerySchema,
  muteHubNotificationsBodySchema,
  updateChannelPreferenceBodySchema,
  updateUserHubNotificationPreferenceBodySchema,
  userHubNotificationPreferenceHubIdParamSchema,
} from '@core/schemas/user/notification-preferences';
import type { FastifyInstance, RouteHandlerMethod } from 'fastify';
import {
  deleteHubNotificationPreference,
  getHubNotificationPreference,
  getMutedHubs,
  getUserHubNotificationPreferences,
  muteHubNotifications,
  updateHubChannelPreference,
  updateHubNotificationPreference,
} from '../../controllers/account';

/**
 * User Hub Notification Preference Routes
 * All routes require authentication
 *
 * These routes allow users to customize notification preferences per hub they belong to.
 *
 * GET /me/notification-preferences/hubs - Get all hub preferences
 * GET /me/notification-preferences/hubs/:hubId - Get specific hub preference
 * PUT /me/notification-preferences/hubs/:hubId - Update hub preference
 * POST /me/notification-preferences/hubs/:hubId/mute - Mute/unmute hub
 * PATCH /me/notification-preferences/hubs/:hubId/channel - Update channel preference
 * DELETE /me/notification-preferences/hubs/:hubId - Reset hub preference
 * GET /me/notification-preferences/muted-hubs - Get list of muted hubs
 */
export async function userHubNotificationPreferenceRoutes(fastify: FastifyInstance) {
  /**
   * Get all hub notification preferences for the user
   */
  fastify.get(
    '/hubs',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Hub Notification Preferences'],
        summary: 'Get all hub notification preferences',
        description: 'Returns notification preferences for all hubs the user has customized',
        security: [{ bearerAuth: [] }],
        querystring: getUserHubNotificationPreferencesQuerySchema.querystring,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string' },
                    userId: { type: 'string' },
                    hubId: { type: 'string' },
                    hub: {
                      type: 'object',
                      properties: {
                        _id: { type: 'string' },
                        name: { type: 'string' },
                        logo: { type: 'string' },
                      },
                    },
                    muteAll: { type: 'boolean' },
                    inApp: { type: 'array' },
                    email: { type: 'array' },
                    whatsApp: { type: 'array' },
                    mutedCategories: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  totalPages: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    getUserHubNotificationPreferences as RouteHandlerMethod,
  );

  /**
   * Get list of muted hubs
   */
  fastify.get(
    '/muted-hubs',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Hub Notification Preferences'],
        summary: 'Get muted hubs',
        description: 'Returns list of hub IDs that the user has muted',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  mutedHubIds: { type: 'array', items: { type: 'string' } },
                  count: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    getMutedHubs,
  );

  /**
   * Get notification preference for a specific hub
   */
  fastify.get(
    '/hubs/:hubId',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Hub Notification Preferences'],
        summary: 'Get hub notification preference',
        description: 'Returns notification preference for a specific hub',
        security: [{ bearerAuth: [] }],
        params: userHubNotificationPreferenceHubIdParamSchema.params,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  userId: { type: 'string' },
                  hubId: { type: 'string' },
                  muteAll: { type: 'boolean' },
                  inApp: { type: 'array' },
                  email: { type: 'array' },
                  whatsApp: { type: 'array' },
                  mutedCategories: { type: 'array', items: { type: 'string' } },
                  isDefault: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    getHubNotificationPreference as RouteHandlerMethod,
  );

  /**
   * Update notification preference for a specific hub
   */
  fastify.put(
    '/hubs/:hubId',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Hub Notification Preferences'],
        summary: 'Update hub notification preference',
        description: 'Creates or updates notification preference for a hub',
        security: [{ bearerAuth: [] }],
        params: userHubNotificationPreferenceHubIdParamSchema.params,
        body: updateUserHubNotificationPreferenceBodySchema.body,
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
    updateHubNotificationPreference as RouteHandlerMethod,
  );

  /**
   * Mute or unmute all notifications from a hub
   */
  fastify.post(
    '/hubs/:hubId/mute',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Hub Notification Preferences'],
        summary: 'Mute/unmute hub notifications',
        description: 'Toggles mute status for all notifications from a hub',
        security: [{ bearerAuth: [] }],
        params: userHubNotificationPreferenceHubIdParamSchema.params,
        body: muteHubNotificationsBodySchema.body,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    muteHubNotifications as RouteHandlerMethod,
  );

  /**
   * Update channel-specific preferences for a hub
   */
  fastify.patch(
    '/hubs/:hubId/channel',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Hub Notification Preferences'],
        summary: 'Update hub channel preference',
        description: 'Updates preferences for a specific notification channel',
        security: [{ bearerAuth: [] }],
        params: userHubNotificationPreferenceHubIdParamSchema.params,
        body: updateChannelPreferenceBodySchema.body,
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
    updateHubChannelPreference as RouteHandlerMethod,
  );

  /**
   * Delete hub notification preference (reset to defaults)
   */
  fastify.delete(
    '/hubs/:hubId',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Hub Notification Preferences'],
        summary: 'Reset hub notification preference',
        description: 'Removes custom preferences for a hub, reverting to default behavior',
        security: [{ bearerAuth: [] }],
        params: userHubNotificationPreferenceHubIdParamSchema.params,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    deleteHubNotificationPreference as RouteHandlerMethod,
  );
}
