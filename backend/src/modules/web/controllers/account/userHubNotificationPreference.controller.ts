import type {
  GetUserHubNotificationPreferencesQuery,
  MuteHubNotificationsInput,
  UpdateChannelPreferenceInput,
  UpdateUserHubNotificationPreferenceInput,
  UserHubNotificationPreferenceHubIdParam,
} from '@core/schemas/user/notification-preferences';
import { userHubNotificationPreferenceService } from '@core/services/user/notification-preferences';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get all hub notification preferences for the authenticated user
 * GET /me/notification-preferences/hubs
 *
 * Returns notification preferences for all hubs the user belongs to
 */
export async function getUserHubNotificationPreferences(
  request: FastifyRequest<{ Querystring: GetUserHubNotificationPreferencesQuery }>,
  reply: FastifyReply,
) {
  const userId = (request.user as { sub: string }).sub;
  const { page, limit } = request.query;

  try {
    const result = await userHubNotificationPreferenceService.getUserHubPreferences(userId, {
      page,
      limit,
    });

    return reply.send({
      success: true,
      data: result.preferences,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error, userId }, 'Error fetching hub notification preferences');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch hub notification preferences',
      },
    });
  }
}

/**
 * Get notification preference for a specific hub
 * GET /me/notification-preferences/hubs/:hubId
 *
 * Returns notification preference for a specific hub
 */
export async function getHubNotificationPreference(
  request: FastifyRequest<{ Params: UserHubNotificationPreferenceHubIdParam }>,
  reply: FastifyReply,
) {
  const userId = (request.user as { sub: string }).sub;
  const { hubId } = request.params;

  try {
    const preference = await userHubNotificationPreferenceService.getHubPreference(userId, hubId);

    // If no preference exists, return default values
    if (!preference) {
      return reply.send({
        success: true,
        data: {
          userId,
          hubId,
          muteAll: false,
          inApp: [],
          email: [],
          whatsApp: [],
          mutedCategories: [],
          isDefault: true,
        },
      });
    }

    return reply.send({
      success: true,
      data: preference,
    });
  } catch (error) {
    request.log.error({ error, userId, hubId }, 'Error fetching hub notification preference');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch hub notification preference',
      },
    });
  }
}

/**
 * Update notification preference for a specific hub
 * PUT /me/notification-preferences/hubs/:hubId
 *
 * Creates or updates notification preference for a hub
 */
export async function updateHubNotificationPreference(
  request: FastifyRequest<{
    Params: UserHubNotificationPreferenceHubIdParam;
    Body: UpdateUserHubNotificationPreferenceInput;
  }>,
  reply: FastifyReply,
) {
  const userId = (request.user as { sub: string }).sub;
  const { hubId } = request.params;
  const updates = request.body;

  try {
    const preference = await userHubNotificationPreferenceService.upsertHubPreference(
      userId,
      hubId,
      updates,
    );

    return reply.send({
      success: true,
      data: preference,
    });
  } catch (error) {
    request.log.error({ error, userId, hubId }, 'Error updating hub notification preference');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update hub notification preference',
      },
    });
  }
}

/**
 * Mute or unmute all notifications from a hub
 * POST /me/notification-preferences/hubs/:hubId/mute
 *
 * Toggles mute status for all notifications from a hub
 */
export async function muteHubNotifications(
  request: FastifyRequest<{
    Params: UserHubNotificationPreferenceHubIdParam;
    Body: MuteHubNotificationsInput;
  }>,
  reply: FastifyReply,
) {
  const userId = (request.user as { sub: string }).sub;
  const { hubId } = request.params;
  const { mute } = request.body;

  try {
    const preference = await userHubNotificationPreferenceService.setHubMuteStatus(
      userId,
      hubId,
      mute,
    );

    return reply.send({
      success: true,
      data: preference,
      message: mute
        ? 'All notifications from this hub have been muted'
        : 'Notifications from this hub have been unmuted',
    });
  } catch (error) {
    request.log.error({ error, userId, hubId, mute }, 'Error toggling hub mute status');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'MUTE_ERROR',
        message: 'Failed to update hub mute status',
      },
    });
  }
}

/**
 * Update channel-specific preferences for a hub
 * PATCH /me/notification-preferences/hubs/:hubId/channel
 *
 * Updates preferences for a specific notification channel (inApp, email, whatsApp)
 */
export async function updateHubChannelPreference(
  request: FastifyRequest<{
    Params: UserHubNotificationPreferenceHubIdParam;
    Body: UpdateChannelPreferenceInput;
  }>,
  reply: FastifyReply,
) {
  const userId = (request.user as { sub: string }).sub;
  const { hubId } = request.params;
  const { channel, preferences } = request.body;

  try {
    const preference = await userHubNotificationPreferenceService.updateChannelPreference(
      userId,
      hubId,
      channel,
      preferences,
    );

    return reply.send({
      success: true,
      data: preference,
    });
  } catch (error) {
    request.log.error({ error, userId, hubId, channel }, 'Error updating hub channel preference');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update hub channel preference',
      },
    });
  }
}

/**
 * Delete hub notification preference (reset to defaults)
 * DELETE /me/notification-preferences/hubs/:hubId
 *
 * Removes custom preferences for a hub, reverting to default behavior
 */
export async function deleteHubNotificationPreference(
  request: FastifyRequest<{ Params: UserHubNotificationPreferenceHubIdParam }>,
  reply: FastifyReply,
) {
  const userId = (request.user as { sub: string }).sub;
  const { hubId } = request.params;

  try {
    const deleted = await userHubNotificationPreferenceService.deleteHubPreference(userId, hubId);

    if (!deleted) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No custom preferences found for this hub',
        },
      });
    }

    return reply.send({
      success: true,
      message: 'Hub notification preferences have been reset to defaults',
    });
  } catch (error) {
    request.log.error({ error, userId, hubId }, 'Error deleting hub notification preference');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to reset hub notification preferences',
      },
    });
  }
}

/**
 * Get list of muted hubs for the user
 * GET /me/notification-preferences/muted-hubs
 *
 * Returns list of hub IDs that the user has muted
 */
export async function getMutedHubs(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as { sub: string }).sub;

  try {
    const mutedHubIds = await userHubNotificationPreferenceService.getMutedHubs(userId);

    return reply.send({
      success: true,
      data: {
        mutedHubIds,
        count: mutedHubIds.length,
      },
    });
  } catch (error) {
    request.log.error({ error, userId }, 'Error fetching muted hubs');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch muted hubs',
      },
    });
  }
}
