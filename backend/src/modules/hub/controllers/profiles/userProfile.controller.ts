import { getUserId } from '@core/utils/auth-helpers';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  checkUsernameAvailability,
  getUserProfile,
  type UpdateLearnerProfileDto,
  updateLearnerProfile,
} from '../../../../core/services/hub/profiles/userProfile.service';

/**
 * Safely get user ID (returns undefined if not authenticated)
 */
function tryGetUserId(request: FastifyRequest): string | undefined {
  try {
    return getUserId(request);
  } catch {
    return undefined;
  }
}

/**
 * Check username availability
 * GET /api/v1/users/check-username?username=xxx
 */
export async function checkUsernameController(
  request: FastifyRequest<{
    Querystring: { username: string };
  }>,
  reply: FastifyReply,
) {
  const { username } = request.query;

  if (!username || username.length < 6) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'INVALID_USERNAME',
        message: 'Username must be at least 6 characters',
      },
    });
  }

  if (username.length > 30) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'INVALID_USERNAME',
        message: 'Username must be at most 30 characters',
      },
    });
  }

  // Validate username format (alphanumeric, underscores, hyphens only)
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'INVALID_USERNAME',
        message: 'Username can only contain letters, numbers, underscores, and hyphens',
      },
    });
  }

  // Get current user ID to exclude from check (if authenticated)
  const userId = tryGetUserId(request);

  const result = await checkUsernameAvailability(username, userId);

  return reply.send({
    success: true,
    data: result,
  });
}

/**
 * Get current user profile
 * GET /api/v1/users/me/profile
 */
export async function getMyProfileController(request: FastifyRequest, reply: FastifyReply) {
  const userId = getUserId(request);
  const user = await getUserProfile(userId);

  if (!user) {
    return reply.status(404).send({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      },
    });
  }

  return reply.send({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      name: user.name,
      username: user.username,
      profilePhoto: user.profilePhoto,
      coverPhoto: user.coverPhoto,
      phoneNumber: user.phoneNumber,
      bio: user.bio,
      location: user.location,
      socialLinks: user.socialLinks,
    },
  });
}

/**
 * Update learner profile
 * PUT /api/v1/users/me/profile
 */
export async function updateMyProfileController(
  request: FastifyRequest<{
    Body: UpdateLearnerProfileDto;
  }>,
  reply: FastifyReply,
) {
  const userId = getUserId(request);
  const data = request.body;

  try {
    const updatedUser = await updateLearnerProfile(userId, data);

    if (!updatedUser) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        username: updatedUser.username,
        profilePhoto: updatedUser.profilePhoto,
        coverPhoto: updatedUser.coverPhoto,
        phoneNumber: updatedUser.phoneNumber,
        bio: updatedUser.bio,
        location: updatedUser.location,
        socialLinks: updatedUser.socialLinks,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Username is already taken') {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'USERNAME_TAKEN',
          message: 'Username is already taken',
        },
      });
    }

    throw error;
  }
}
