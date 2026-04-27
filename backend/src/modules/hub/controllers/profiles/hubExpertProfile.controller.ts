import { getExpertProfile, updateExpertProfile } from '@core/services/hub/profiles';
import type { HubUpdateExpertProfileInput } from '@schemas/hub';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Error codes for expert profile operations
 */
const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  USERNAME_INVALID: 'USERNAME_INVALID',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_OBJECT_ID: 'INVALID_OBJECT_ID',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

/**
 * Get my expert profile
 * GET /expert/profile/me
 */
export async function getMyExpertProfile(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const userId = (request.user as { sub?: string })?.sub;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'User not authenticated',
        },
      });
    }

    const profile = await getExpertProfile(userId);

    if (!profile) {
      return reply.status(404).send({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Profile not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: profile,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    request.log.error({ error, errorMessage }, 'Error fetching expert profile');

    // Handle MongoDB ObjectId cast errors
    if (errorMessage.includes('Cast to ObjectId failed')) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_OBJECT_ID,
          message: 'Invalid user ID format',
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to fetch profile',
      },
    });
  }
}

/**
 * Update my expert profile
 * PATCH /expert/profile
 */
export async function updateMyExpertProfile(
  request: FastifyRequest<{ Body: HubUpdateExpertProfileInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const userId = (request.user as { sub?: string })?.sub;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'User not authenticated',
        },
      });
    }

    // Validate request body has at least one field
    if (!request.body || Object.keys(request.body).length === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Request body cannot be empty',
        },
      });
    }

    const updatedProfile = await updateExpertProfile(userId, request.body);

    if (!updatedProfile) {
      return reply.status(404).send({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'Profile not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: updatedProfile,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
    request.log.error({ error, errorMessage }, 'Error updating expert profile');

    // Handle specific error types
    if (errorMessage === 'Username is already taken') {
      return reply.status(400).send({
        success: false,
        error: {
          code: ERROR_CODES.USERNAME_TAKEN,
          message: 'This username is already in use. Please choose a different one.',
        },
      });
    }

    if (errorMessage.includes('Username must be')) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ERROR_CODES.USERNAME_INVALID,
          message: errorMessage,
        },
      });
    }

    // Handle MongoDB validation errors
    if (errorMessage.includes('validation failed')) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: errorMessage.replace(/^.*validation failed:/, 'Validation error:').trim(),
        },
      });
    }

    // Handle MongoDB ObjectId cast errors
    if (errorMessage.includes('Cast to ObjectId failed')) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_OBJECT_ID,
          message: 'Invalid ID format provided',
        },
      });
    }

    // Handle duplicate key errors
    if (errorMessage.includes('duplicate key error') || errorMessage.includes('E11000')) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'A profile with this information already exists',
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'An unexpected error occurred while updating your profile',
      },
    });
  }
}
