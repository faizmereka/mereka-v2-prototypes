import { ResourceType } from '@core/models/Slug';
import { type IUser, User } from '@core/models/User';
import type { HubUpdateLearnerProfileInput } from '@schemas/hub';
import { SlugService } from '@services/infrastructure';

const slugService = new SlugService();

/**
 * Hub Learner Profile service - Manage learner profiles
 */
export class HubLearnerProfileService {
  /**
   * Get learner profile by user ID
   */
  async getLearnerProfile(userId: string): Promise<IUser | null> {
    const user = await User.findById(userId);
    return user;
  }

  /**
   * Update learner profile
   */
  async updateLearnerProfile(userId: string, data: HubUpdateLearnerProfileInput): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        phoneNumber: data.phoneNumber,
        bio: data.bio,
        coverPhoto: data.coverPhoto,
        location: data.location,
        socialLinks: data.socialLinks,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update learner profile with slug management
   */
  async updateProfileWithSlug(
    userId: string,
    slug: string,
    data: HubUpdateLearnerProfileInput,
  ): Promise<{ user: IUser; slugChanged: boolean }> {
    // Update profile data
    const user = await this.updateLearnerProfile(userId, data);

    // Import Slug model
    const { Slug } = await import('@core/models/Slug');

    // Check if user already has any slug document
    const existingUserSlugDoc = await Slug.findOne({
      resourceId: userId,
      resourceType: ResourceType.LEARNER,
    });

    let slugChanged = false;

    if (!existingUserSlugDoc) {
      // User doesn't have any slug yet - create first one
      await slugService.createSlug(userId, ResourceType.LEARNER, slug, userId);
      slugChanged = true;
    } else {
      // User has existing slug - check if changing
      const currentSlug = slugService.getCurrentSlug(existingUserSlugDoc);

      if (currentSlug !== slug.toLowerCase()) {
        // User is changing their slug
        await slugService.updateSlug(userId, ResourceType.LEARNER, slug, userId);
        slugChanged = true;
      }
    }

    return { user, slugChanged };
  }
}

export const hubLearnerProfileService = new HubLearnerProfileService();
