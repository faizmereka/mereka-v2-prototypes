import { TargetUserType } from '@core/models/enums/NotificationEnums';
import type { HubSummaryFrequency } from '@core/models/HubNotificationPreference';
import { SystemRoleKey } from '@core/models/Role';
import type {
  ToggleHubPreferenceInput,
  UpdateHubNotificationPreferencesInput,
} from '@core/schemas/hub/settings';
import { hubMemberService } from '@core/services/hub/members';
import { hubNotificationPreferenceService } from '@core/services/hub/settings';
import { getUserId } from '@core/utils/auth-helpers';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Map system role keys to TargetUserType enum values
 */
function mapRoleKeysToTargetUserTypes(roleKeys: string[]): TargetUserType[] {
  const mapping: Record<string, TargetUserType> = {
    [SystemRoleKey.OWNER]: TargetUserType.HUB_OWNER,
    [SystemRoleKey.ADMIN]: TargetUserType.HUB_ADMIN,
    [SystemRoleKey.EXPERT]: TargetUserType.EXPERT,
    [SystemRoleKey.COLLABORATOR]: TargetUserType.HUB_COLLABORATOR,
  };

  return roleKeys
    .map((key) => mapping[key])
    .filter((type): type is TargetUserType => type !== undefined);
}

/**
 * Get hub notification preferences
 * GET /hubs/:hubId/settings/notification-preferences
 *
 * Returns notification preferences grouped by category for the hub
 * Filtered by user's role in the hub
 * Requires notification.managePreferences permission
 */
export async function getHubNotificationPreferences(
  request: FastifyRequest<{ Params: { hubId: string } }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { hubId } = request.params;

    request.log.info({ userId, hubId }, 'Fetching hub notification preferences');

    // Get user's membership to determine their roles
    const membership = await hubMemberService.getMembership(hubId, userId);

    // Extract role keys from the membership (roleIds is populated with role objects)
    const roleKeys: string[] = [];
    if (membership?.roleIds) {
      for (const role of membership.roleIds as unknown as Array<{ key: string }>) {
        if (role?.key) {
          roleKeys.push(role.key);
        }
      }
    }

    // Map role keys to TargetUserType values
    const userTargetTypes = mapRoleKeysToTargetUserTypes(roleKeys);

    request.log.debug({ userId, hubId, roleKeys, userTargetTypes }, 'User roles mapped');

    const preferences = await hubNotificationPreferenceService.getHubPreferences(
      hubId,
      userTargetTypes,
    );

    return reply.send({
      success: true,
      data: preferences,
    });
  } catch (error) {
    request.log.error({ error }, 'Error fetching hub notification preferences');

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
 * Update hub notification preferences
 * PATCH /hubs/:hubId/settings/notification-preferences
 *
 * Updates notification preferences for the hub
 * Requires notification.managePreferences permission
 */
export async function updateHubNotificationPreferences(
  request: FastifyRequest<{
    Params: { hubId: string };
    Body: UpdateHubNotificationPreferencesInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { hubId } = request.params;

    request.log.info({ userId, hubId }, 'Updating hub notification preferences');

    const updates = {
      ...request.body,
      summaryFrequency: request.body.summaryFrequency as HubSummaryFrequency | undefined,
    };
    const preference = await hubNotificationPreferenceService.updatePreferences(hubId, updates);

    return reply.send({
      success: true,
      data: preference,
    });
  } catch (error) {
    request.log.error({ error }, 'Error updating hub notification preferences');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update hub notification preferences',
      },
    });
  }
}

/**
 * Toggle a single hub notification preference
 * POST /hubs/:hubId/settings/notification-preferences/toggle
 *
 * Toggles a specific notification preference for the hub
 * Requires notification.managePreferences permission
 */
export async function toggleHubNotificationPreference(
  request: FastifyRequest<{
    Params: { hubId: string };
    Body: ToggleHubPreferenceInput;
  }>,
  reply: FastifyReply,
) {
  const { hubId } = request.params;
  const { templateId, channel, enabled } = request.body;

  try {
    const preference = await hubNotificationPreferenceService.togglePreference(
      hubId,
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
      { error, hubId, templateId, channel },
      'Error toggling hub notification preference',
    );

    return reply.status(500).send({
      success: false,
      error: {
        code: 'TOGGLE_ERROR',
        message: 'Failed to toggle hub notification preference',
      },
    });
  }
}
