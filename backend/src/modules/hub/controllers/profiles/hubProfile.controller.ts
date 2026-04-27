import { getUserId } from '@core/utils/auth-helpers';
import type { HubCreateHubProfileInput, HubUpdateHubProfileInput } from '@schemas/hub';
import { hubProfileService } from '@services/hub';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get my hub profile
 */
export async function getMyHubProfile(
  request: FastifyRequest<{
    Querystring: { includeSubscription?: string; hubId?: string; includeUserFields?: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const includeSubscription = request.query.includeSubscription === 'true';
    const includeUserFields = request.query.includeUserFields === 'true';
    const hubId = request.query.hubId;

    const result = await hubProfileService.getMyHub(userId, {
      includeSubscription,
      hubId,
      includeUserFields,
    });

    if (!result.hub) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'HUB_NOT_FOUND',
          message: 'Hub not found',
        },
      });
    }

    // Transform hub to include 'id' field for frontend compatibility
    const hubData = result.hub.toObject ? result.hub.toObject() : result.hub;
    const hubWithId = {
      id: String(result.hub._id),
      ...hubData,
    };

    return reply.send({
      success: true,
      data: {
        hub: hubWithId,
        ...(includeSubscription && { subscription: result.subscription }),
        ...(includeUserFields && { userFields: result.userFields }),
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get hub profile');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_HUB_PROFILE_FAILED',
        message: 'Failed to get hub profile',
      },
    });
  }
}

/**
 * Create hub profile (from /hub-onboard/form)
 */
export async function createHubProfile(
  request: FastifyRequest<{ Body: HubCreateHubProfileInput }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const hub = await hubProfileService.createHubProfile(userId, request.body);

    return reply.status(201).send({
      success: true,
      data: {
        hubId: String(hub._id),
        expertUid: userId,
        slug: hub.slug,
        name: hub.name,
      },
      message: 'Hub profile created successfully',
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Failed to create hub profile');

    const statusCode =
      error instanceof Error && error.message.includes('already exists') ? 409 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: statusCode === 409 ? 'SLUG_ALREADY_EXISTS' : 'CREATE_HUB_PROFILE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create hub profile',
      },
    });
  }
}

/**
 * Update hub profile (upsert - creates if doesn't exist)
 * Supports updating both Hub and User fields
 */
export async function updateHubProfile(
  request: FastifyRequest<{ Body: HubUpdateHubProfileInput }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    // Get hubId from request body (for users with multiple hubs)
    const { hubId, ...profileData } = request.body;
    const hub = await hubProfileService.updateHubProfile(userId, profileData, { hubId });

    return reply.send({
      success: true,
      data: {
        hubId: String(hub._id),
        expertUid: userId,
        slug: hub.slug,
        name: hub.name,
      },
      message: 'Hub profile updated successfully',
    });
  } catch (error) {
    request.log.error({ error, body: request.body }, 'Failed to update hub profile');

    const statusCode =
      error instanceof Error && error.message.includes('already exists') ? 409 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: statusCode === 409 ? 'SLUG_ALREADY_EXISTS' : 'UPDATE_HUB_PROFILE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update hub profile',
      },
    });
  }
}

/**
 * Publish hub for approval
 * Validates all required fields based on user's subscription plan
 */
export async function publishHub(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = getUserId(request);
    const result = await hubProfileService.publishHub(userId);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Required fields are missing',
          details: {
            missingFields: result.missingFields,
          },
        },
      });
    }

    return reply.send({
      success: true,
      data: {
        hubId: result.hubId,
        status: result.status,
        message: 'Hub submitted for review successfully',
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to publish hub');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'PUBLISH_HUB_FAILED',
        message: error instanceof Error ? error.message : 'Failed to publish hub',
      },
    });
  }
}
