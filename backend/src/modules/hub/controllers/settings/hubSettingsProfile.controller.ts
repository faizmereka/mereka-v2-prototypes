import type { HubUpdateSettingsProfileInput } from '@core/schemas/hub/settings';
import { getHubSettingsProfile, updateHubSettingsProfile } from '@core/services/hub/settings';
import { getUserId } from '@core/utils/auth-helpers';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get hub settings profile
 */
export async function getHubSettingsProfileHandler(
  request: FastifyRequest<{
    Params: { hubId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { hubId } = request.params;

    const profile = await getHubSettingsProfile(userId, hubId);

    return reply.send({
      success: true,
      data: profile,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get hub settings profile');

    if (error instanceof Error) {
      if (
        error.message === 'Hub not found or access denied' ||
        error.message === 'No hub found for this user' ||
        error.message === 'Hub not found'
      ) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'HUB_NOT_FOUND',
            message: error.message,
          },
        });
      }
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_SETTINGS_PROFILE_FAILED',
        message: 'Failed to get hub settings profile',
      },
    });
  }
}

/**
 * Update hub settings profile
 */
export async function updateHubSettingsProfileHandler(
  request: FastifyRequest<{
    Params: { hubId: string };
    Body: HubUpdateSettingsProfileInput;
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { hubId } = request.params;
    const input = { ...request.body, hubId };

    const profile = await updateHubSettingsProfile(userId, input);

    return reply.send({
      success: true,
      data: profile,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to update hub settings profile');

    if (error instanceof Error) {
      if (
        error.message === 'Hub not found or access denied' ||
        error.message === 'No hub found for this user' ||
        error.message === 'Hub not found'
      ) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'HUB_NOT_FOUND',
            message: error.message,
          },
        });
      }

      if (error.message === 'Failed to update hub') {
        return reply.status(500).send({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: error.message,
          },
        });
      }
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'UPDATE_SETTINGS_PROFILE_FAILED',
        message: 'Failed to update hub settings profile',
      },
    });
  }
}
