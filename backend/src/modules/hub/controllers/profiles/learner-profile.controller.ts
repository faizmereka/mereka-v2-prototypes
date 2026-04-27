import { ResourceType } from '@core/models/Slug';
import type { IUser } from '@core/models/User';
import { getUserId } from '@core/utils/auth-helpers';
import type { HubCheckSlugInput, HubUpdateLearnerProfileInput } from '@schemas/hub';
import { HubLearnerProfileService } from '@services/hub';
import { SlugService } from '@services/infrastructure';
import type { FastifyReply, FastifyRequest } from 'fastify';

const hubLearnerProfileService = new HubLearnerProfileService();
const slugService = new SlugService();

/**
 * Get current user's learner profile
 */
export async function getMyProfile(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = getUserId(request);
    const user = await hubLearnerProfileService.getLearnerProfile(userId);

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Get current slug if exists (by resourceId)
    const Slug = await import('@core/models/Slug').then((m) => m.Slug);
    const slugDoc = await Slug.findOne({
      resourceId: String(user._id),
      resourceType: 'learner',
    });

    let currentSlug = null;
    if (slugDoc) {
      currentSlug = slugService.getCurrentSlug(slugDoc);
    }

    return reply.send({
      success: true,
      data: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        birthDate: user.birthDate,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        profilePhoto: user.profilePhoto,
        coverPhoto: user.coverPhoto,
        location: user.location,
        socialLinks: user.socialLinks,
        slug: currentSlug,
        status: user.status,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get learner profile');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_PROFILE_FAILED',
        message: 'Failed to get learner profile',
      },
    });
  }
}

/**
 * Update learner profile
 */
export async function updateMyProfile(
  request: FastifyRequest<{ Body: HubUpdateLearnerProfileInput & { slug?: string } }>,
  reply: FastifyReply,
) {
  try {
    const userId = getUserId(request);
    const { slug, ...profileData } = request.body;

    let user: IUser | null = null;
    let slugChanged = false;

    if (slug) {
      // Update profile with slug
      const result = await hubLearnerProfileService.updateProfileWithSlug(
        userId,
        slug,
        profileData,
      );
      user = result.user;
      slugChanged = result.slugChanged;
    } else {
      // Update profile only
      user = await hubLearnerProfileService.updateLearnerProfile(userId, profileData);
    }

    // Get updated slug
    let currentSlug = slug;
    if (slugChanged) {
      const { Slug } = await import('@core/models/Slug');
      const slugDoc = await Slug.findOne({
        resourceId: userId,
        resourceType: 'learner',
      });
      if (slugDoc) {
        const slugEntry = slugDoc.slugHistory.find((s) => s.isActive);
        currentSlug = slugEntry?.slug || slug;
      }
    }

    return reply.send({
      success: true,
      data: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        bio: user.bio,
        profilePhoto: user.profilePhoto,
        coverPhoto: user.coverPhoto,
        location: user.location,
        socialLinks: user.socialLinks,
        slug: currentSlug,
      },
      message: slugChanged
        ? 'Profile and slug updated successfully'
        : 'Profile updated successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to update learner profile');

    const statusCode =
      error instanceof Error && error.message.includes('already taken') ? 409 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'UPDATE_PROFILE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update profile',
      },
    });
  }
}

/**
 * Check slug availability
 */
export async function checkSlugAvailability(
  request: FastifyRequest<{ Body: HubCheckSlugInput }>,
  reply: FastifyReply,
) {
  try {
    const { slug, resourceType } = request.body;

    const isAvailable = await slugService.isSlugAvailable(
      slug,
      (resourceType as ResourceType) || ResourceType.LEARNER,
    );

    if (isAvailable) {
      return reply.send({
        success: true,
        data: {
          available: true,
          slug,
        },
      });
    } else {
      const suggestions = slugService.generateSuggestions(slug);

      return reply.send({
        success: true,
        data: {
          available: false,
          slug,
          suggestions,
        },
      });
    }
  } catch (error) {
    request.log.error({ error }, 'Failed to check slug availability');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'SLUG_CHECK_FAILED',
        message: 'Failed to check slug availability',
      },
    });
  }
}
