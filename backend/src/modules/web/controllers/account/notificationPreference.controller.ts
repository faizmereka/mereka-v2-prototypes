import type { SummaryFrequency } from '@core/models/UserNotificationPreference';
import type {
  ToggleUserPreferenceInput,
  UpdateUserNotificationPreferencesInput,
} from '@schemas/web';
import { userNotificationPreferenceService } from '@services/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get user notification preferences
 * GET /me/notification-preferences
 *
 * Returns notification preferences grouped by category for the authenticated user
 */
export async function getUserNotificationPreferences(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as { sub: string }).sub;

  try {
    const preferences = await userNotificationPreferenceService.getUserPreferences(userId);

    return reply.send({
      success: true,
      data: preferences,
    });
  } catch (error) {
    request.log.error({ error, userId }, 'Error fetching notification preferences');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch notification preferences',
      },
    });
  }
}

/**
 * Update user notification preferences
 * PATCH /me/notification-preferences
 *
 * Updates notification preferences for the authenticated user
 */
export async function updateUserNotificationPreferences(
  request: FastifyRequest<{ Body: UpdateUserNotificationPreferencesInput }>,
  reply: FastifyReply,
) {
  const userId = (request.user as { sub: string }).sub;

  try {
    const updates = {
      ...request.body,
      summaryFrequency: request.body.summaryFrequency as SummaryFrequency | undefined,
    };
    const preference = await userNotificationPreferenceService.updatePreferences(userId, updates);

    return reply.send({
      success: true,
      data: preference,
    });
  } catch (error) {
    request.log.error({ error, userId }, 'Error updating notification preferences');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update notification preferences',
      },
    });
  }
}

/**
 * Toggle a single notification preference
 * POST /me/notification-preferences/toggle
 *
 * Toggles a specific notification preference for the authenticated user
 */
export async function toggleUserNotificationPreference(
  request: FastifyRequest<{ Body: ToggleUserPreferenceInput }>,
  reply: FastifyReply,
) {
  const userId = (request.user as { sub: string }).sub;
  const { templateId, channel, enabled } = request.body;

  try {
    const preference = await userNotificationPreferenceService.togglePreference(
      userId,
      templateId,
      channel,
      enabled,
    );

    return reply.send({
      success: true,
      data: preference,
    });
  } catch (error) {
    request.log.error(
      { error, userId, templateId, channel },
      'Error toggling notification preference',
    );

    return reply.status(500).send({
      success: false,
      error: {
        code: 'TOGGLE_ERROR',
        message: 'Failed to toggle notification preference',
      },
    });
  }
}
