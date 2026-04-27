import { getStripeCountryConfig } from '@core/constants/stripe-countries';
import { Hub, HubStatus, type IHub } from '@core/models/Hub';
import { HubMember, HubMemberStatus } from '@core/models/HubMember';
import { Role, RoleScope, SystemRoleKey } from '@core/models/Role';
import { ResourceType } from '@core/models/Slug';
import { Subscription } from '@core/models/Subscription';
import { type IUser, User } from '@core/models/User';
import type { HubCreateHubProfileInput, HubUpdateHubProfileInput } from '@schemas/hub';
import { SlugService } from '@services/shared';
import mongoose from 'mongoose';

export class HubProfileService {
  private slugService = new SlugService();

  /**
   * Add user as owner to HubMember collection
   * @private
   */
  private async addHubOwner(
    hubId: mongoose.Types.ObjectId | string,
    userId: string,
  ): Promise<void> {
    try {
      // Find the owner role
      const ownerRole = await Role.findOne({
        key: SystemRoleKey.OWNER,
        scope: RoleScope.SYSTEM,
      });

      if (!ownerRole) {
        console.error('❌ Owner role not found in database');
        throw new Error('Owner role not found. Please run seed script: npm run db:seed');
      }

      console.log(`✅ Found owner role: ${ownerRole._id}`);

      // Check if membership already exists
      const existingMembership = await HubMember.findOne({ hubId, userId });

      if (existingMembership) {
        console.log(`ℹ️  Owner membership already exists for user ${userId}`);
        return;
      }

      // Create owner membership
      console.log(`Creating owner membership for user ${userId} in hub ${hubId}`);
      const membership = await HubMember.create({
        hubId,
        userId,
        roleIds: [ownerRole._id], // Array of roles
        status: HubMemberStatus.ACTIVE,
        title: 'Hub Owner',
        invitedBy: userId,
        joinedAt: new Date(),
      });

      console.log(`✅ Owner membership created: ${membership._id}`);
    } catch (error) {
      console.error('❌ Error in addHubOwner:', error);
      throw error;
    }
  }

  /**
   * Get user's hub profile with optional subscription and user data
   * If hubId is provided, gets that specific hub (must be owned by user)
   * Otherwise gets the first hub owned by user
   */
  async getMyHub(
    userId: string,
    options?: { includeSubscription?: boolean; hubId?: string; includeUserFields?: boolean },
  ): Promise<{
    hub: IHub | null;
    subscription?: { planCode: string; status: string } | null;
    userFields?: {
      // Common fields (synced with Hub for Scale plan)
      profileImage?: string;
      coverImage?: string;
      phoneNumber?: string;
      bio?: string;
      location?: {
        city?: string;
        state?: string;
        country?: string;
        postcode?: string;
        address?: string;
        lat?: number;
        lng?: number;
      };
      socialLinks?: {
        website?: string;
        facebook?: string;
        instagram?: string;
        twitter?: string;
        linkedin?: string;
        email?: string;
      };
      // Scale-specific fields
      professionalTitle?: string;
      jobPreferences?: string[];
      employment?: Array<{
        title: string;
        company: string;
        duration?: string;
        description?: string;
      }>;
      education?: Array<{ degree: string; institution: string; year: string }>;
    } | null;
  }> {
    // If hubId provided, get that specific hub (verify membership via HubMember)
    // Otherwise get the first hub where user is a member
    let hub: IHub | null = null;

    if (options?.hubId) {
      // Verify user has access to this hub via HubMember
      const membership = await HubMember.findOne({
        hubId: new mongoose.Types.ObjectId(options.hubId),
        userId: new mongoose.Types.ObjectId(userId),
        status: HubMemberStatus.ACTIVE,
      });

      if (membership) {
        hub = await Hub.findById(options.hubId);
      }
    } else {
      // Get user's first hub via HubMember
      const membership = await HubMember.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        status: HubMemberStatus.ACTIVE,
      });

      if (membership) {
        hub = await Hub.findById(membership.hubId);
      }
    }

    // Ensure currency is always set (derive from country for legacy hubs)
    if (hub && !hub.currency && hub.location?.country) {
      const countryConfig = getStripeCountryConfig(hub.location.country);
      hub.currency = countryConfig?.currency || 'MYR';
    }

    let subscription = null;
    if (options?.includeSubscription) {
      const sub = await Subscription.findOne({
        userId,
        status: 'active',
      }).sort({ createdAt: -1 });

      if (sub) {
        subscription = {
          planCode: sub.planCode,
          status: sub.status,
        };
      }
    }

    // Get user fields for Scale plan (onboarding form pre-population)
    let userFields = null;
    if (options?.includeUserFields) {
      const user = await User.findById(userId);
      if (user) {
        userFields = {
          // Common fields (synced with Hub for Scale plan)
          profileImage: user.profilePhoto,
          coverImage: user.coverPhoto,
          phoneNumber: user.phoneNumber,
          bio: user.bio,
          location: user.location,
          socialLinks: user.socialLinks,
          // Scale-specific fields
          professionalTitle: user.professionalTitle,
          jobPreferences: user.jobPreferences?.map((id) => String(id)) || [],
          employment: user.employment || [],
          education: user.education || [],
        };
      }
    }

    return { hub, subscription, userFields };
  }

  /**
   * Create initial hub profile (from /hub-onboard/form)
   */
  async createHubProfile(userId: string, data: HubCreateHubProfileInput): Promise<IHub> {
    // Check if slug is available
    const isAvailable = await this.slugService.isSlugAvailable(data.slug, ResourceType.HUB);
    if (!isAvailable) {
      throw new Error('Slug already exists. Please choose a different one.');
    }

    // Parse lat/lng to numbers if they're strings
    const lat =
      typeof data.location.lat === 'string' ? parseFloat(data.location.lat) : data.location.lat;
    const lng =
      typeof data.location.lng === 'string' ? parseFloat(data.location.lng) : data.location.lng;

    // Derive currency from country
    const countryConfig = getStripeCountryConfig(data.location.country);
    const currency = countryConfig?.currency || 'MYR'; // Default to MYR if country not found

    // Create hub profile
    const hub = await Hub.create({
      name: data.agencyName,
      slug: data.slug,
      logo: data.agencyLogo,
      phoneNumber: data.phoneNumber,
      location: {
        city: data.location.city,
        state: data.location.state,
        country: data.location.country,
        lat,
        lng,
        address: data.location.streetAddress,
      },
      currency, // Set currency based on country
      ownerId: userId,
      createdBy: userId,
      lastUpdatedBy: userId,
      description: '', // Required field, will be filled in later steps
      gallery: [],
      portfolio: [],
      amenities: [],
      facilities: [],
      tags: [],
      focusAreas: [],
      services: [],
      status: 'draft',
      onboardingStep: 1,
      isActive: false,
      isFeatured: false,
    });

    // Create slug record using SlugService
    await this.slugService.createSlug(String(hub._id), ResourceType.HUB, data.slug, userId);

    // Add user as owner to HubMember collection
    await this.addHubOwner(String(hub._id), userId);

    return hub;
  }

  /**
   * Update hub profile (upsert - create if doesn't exist)
   */
  async updateHubProfile(
    userId: string,
    data: HubUpdateHubProfileInput,
    options?: { hubId?: string },
  ): Promise<IHub> {
    // Find existing hub via HubMember (new ownership model)
    let existingHub: IHub | null = null;

    if (options?.hubId) {
      // If hubId provided, verify membership and get that specific hub
      const membership = await HubMember.findOne({
        hubId: new mongoose.Types.ObjectId(options.hubId),
        userId: new mongoose.Types.ObjectId(userId),
        status: HubMemberStatus.ACTIVE,
      });

      if (membership) {
        existingHub = await Hub.findById(options.hubId);
      }
    } else {
      // Get user's first hub via HubMember
      const membership = await HubMember.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        status: HubMemberStatus.ACTIVE,
      });

      if (membership) {
        existingHub = await Hub.findById(membership.hubId);
      }
    }

    // If hub doesn't exist, create it if we have required fields
    if (!existingHub) {
      return this.createHubFromUpdate(userId, data);
    }

    // Update existing hub
    return this.updateExistingHub(existingHub, userId, data);
  }

  /**
   * Create hub from update payload (internal method)
   */
  private async createHubFromUpdate(userId: string, data: HubUpdateHubProfileInput): Promise<IHub> {
    // For creation, we need all required fields - validate and narrow types
    if (
      typeof data.agencyName !== 'string' ||
      typeof data.slug !== 'string' ||
      typeof data.agencyLogo !== 'string' ||
      typeof data.phoneNumber !== 'string' ||
      typeof data.location !== 'object' ||
      !data.location ||
      typeof data.location.city !== 'string' ||
      typeof data.location.country !== 'string' ||
      (data.location.lat !== undefined &&
        typeof data.location.lat !== 'string' &&
        typeof data.location.lat !== 'number') ||
      (data.location.lng !== undefined &&
        typeof data.location.lng !== 'string' &&
        typeof data.location.lng !== 'number')
    ) {
      throw new Error('Missing required fields for hub creation');
    }

    // Type narrowing complete - safe to use
    const agencyName: string = data.agencyName;
    const slug: string = data.slug;
    const agencyLogo: string = data.agencyLogo;
    const phoneNumber: string = data.phoneNumber;
    const locationCity: string = data.location.city;
    const locationCountry: string = data.location.country;
    const locationLat: string | number | undefined = data.location.lat;
    const locationLng: string | number | undefined = data.location.lng;

    if (locationLat === undefined || locationLng === undefined) {
      throw new Error('Missing required location coordinates for hub creation');
    }

    // Check slug availability
    const isAvailable = await this.slugService.isSlugAvailable(slug, ResourceType.HUB);
    if (!isAvailable) {
      throw new Error('Slug already exists. Please choose a different one.');
    }

    // Parse lat/lng
    const lat = typeof locationLat === 'string' ? parseFloat(locationLat) : locationLat;
    const lng = typeof locationLng === 'string' ? parseFloat(locationLng) : locationLng;

    // Derive currency from country
    const countryConfig = getStripeCountryConfig(locationCountry);
    const currency = countryConfig?.currency || 'MYR'; // Default to MYR if country not found

    // Create new hub
    const newHub = await Hub.create({
      name: agencyName,
      slug,
      logo: agencyLogo,
      phoneNumber,
      location: {
        city: locationCity,
        state: data.location.state,
        country: locationCountry,
        lat,
        lng,
        address: data.location.address,
      },
      currency, // Set currency based on country
      ownerId: userId,
      createdBy: userId,
      lastUpdatedBy: userId,
      description: '',
      gallery: [],
      portfolio: [],
      amenities: [],
      facilities: [],
      tags: [],
      focusAreas: [],
      services: [],
      status: 'draft',
      onboardingStep: 1,
      isActive: false,
      isFeatured: false,
    });

    // Create slug record
    await this.slugService.createSlug(String(newHub._id), ResourceType.HUB, slug, userId);

    // Add user as owner to HubMember collection
    await this.addHubOwner(String(newHub._id), userId);

    return newHub;
  }

  /**
   * Update existing hub (internal method)
   * Supports updating both Hub and User fields
   */
  private async updateExistingHub(
    hub: IHub,
    userId: string,
    data: HubUpdateHubProfileInput,
  ): Promise<IHub> {
    // Get user's subscription to determine plan
    const subscription = await Subscription.findOne({
      userId,
      status: 'active',
    }).sort({ createdAt: -1 });

    const planCode = subscription?.planCode || 'soar'; // Default to soar if no subscription

    // === UPDATE HUB FIELDS ===
    // Basic fields
    if (typeof data.agencyName === 'string') {
      hub.name = data.agencyName;
    }
    if (typeof data.agencyLogo === 'string') {
      hub.logo = data.agencyLogo;
    }
    if (typeof data.phoneNumber === 'string') {
      hub.phoneNumber = data.phoneNumber;
    }
    if (typeof data.coverImage === 'string') {
      hub.coverImage = data.coverImage;
    }

    // Description fields
    if (typeof data.description === 'string') {
      hub.description = data.description;
    }
    if (typeof data.companyType === 'string') {
      hub.companyType = data.companyType as unknown as mongoose.Types.ObjectId;
    }

    // Media fields
    if (typeof data.introVideo === 'string') {
      hub.introVideo = data.introVideo;
    }
    if (Array.isArray(data.gallery)) {
      hub.gallery = data.gallery;
    }
    if (typeof data.autoPopulateImages === 'boolean') {
      hub.autoPopulateImages = data.autoPopulateImages;
    }

    // Operating hours
    if (data.operatingHours) {
      hub.operatingHours = {
        ...hub.operatingHours,
        ...data.operatingHours,
      };
    }

    // Social links
    if (data.socialLinks) {
      hub.socialLinks = {
        ...hub.socialLinks,
        ...data.socialLinks,
      };
    }

    // Display settings
    if (typeof data.displayFullAddress === 'boolean') {
      hub.displayFullAddress = data.displayFullAddress;
    }

    // Reference Data Arrays (ObjectIds)
    if (Array.isArray(data.amenities)) {
      hub.amenities = data.amenities as unknown as mongoose.Types.ObjectId[];
    }
    if (Array.isArray(data.facilities)) {
      hub.facilities = data.facilities as unknown as mongoose.Types.ObjectId[];
    }
    if (Array.isArray(data.focusAreas)) {
      hub.focusAreas = data.focusAreas as unknown as mongoose.Types.ObjectId[];
    }
    if (Array.isArray(data.spaceTypes)) {
      hub.spaceTypes = data.spaceTypes as unknown as mongoose.Types.ObjectId[];
    }
    if (Array.isArray(data.experienceTypes)) {
      hub.experienceTypes = data.experienceTypes as unknown as mongoose.Types.ObjectId[];
    }

    // Free-form Arrays
    if (Array.isArray(data.tags)) {
      hub.tags = data.tags;
    }
    if (Array.isArray(data.services)) {
      hub.services = data.services;
    }
    // Portfolio: Save to Hub (all users)
    if (Array.isArray(data.portfolio)) {
      hub.portfolio = data.portfolio as unknown as Array<{
        title: string;
        description?: string;
        images?: string[];
        year?: string;
      }>;
    }

    // Onboarding step
    if (typeof data.onboardingStep === 'number') {
      hub.onboardingStep = data.onboardingStep;
    }

    // Handle slug - only process if provided and actually changed
    if (typeof data.slug === 'string') {
      const newSlug = data.slug.toLowerCase();
      const currentSlug = hub.slug?.toLowerCase();

      // Only process if slug is actually different
      if (newSlug !== currentSlug) {
        // Check if slug exists on another hub
        const existingHub = await Hub.findOne({
          slug: { $regex: new RegExp(`^${data.slug}$`, 'i') },
          _id: { $ne: hub._id },
        });
        if (existingHub) {
          throw new Error('Slug already exists. Please choose a different one.');
        }

        // Also check Slug collection for history (exclude current hub)
        const isAvailable = await this.slugService.isSlugAvailable(
          data.slug,
          ResourceType.HUB,
          String(hub._id),
        );
        if (!isAvailable) {
          throw new Error('Slug already exists. Please choose a different one.');
        }
        await this.slugService.updateSlug(String(hub._id), ResourceType.HUB, data.slug, userId);
        hub.slug = data.slug;
      }
      // If slug is the same (case-insensitive), do nothing
    }

    // Update location
    if (data.location && typeof data.location === 'object') {
      // Country lock validation: prevent country change if Stripe account is connected
      if (
        typeof data.location.country === 'string' &&
        hub.stripeAccountId &&
        data.location.country !== hub.location?.country
      ) {
        throw new Error(
          'Cannot change country after Stripe account is connected. Contact support for assistance.',
        );
      }

      if (typeof data.location.city === 'string') {
        hub.location.city = data.location.city;
      }
      if (data.location.state !== undefined) {
        hub.location.state = data.location.state;
      }
      if (typeof data.location.country === 'string') {
        hub.location.country = data.location.country;
      }
      if (data.location.postcode !== undefined) {
        hub.location.postcode = data.location.postcode;
      }
      if (data.location.address !== undefined) {
        hub.location.address = data.location.address;
      }
      if (data.location.lat !== undefined) {
        const lat =
          typeof data.location.lat === 'string' ? parseFloat(data.location.lat) : data.location.lat;
        hub.location.lat = lat;
      }
      if (data.location.lng !== undefined) {
        const lng =
          typeof data.location.lng === 'string' ? parseFloat(data.location.lng) : data.location.lng;
        hub.location.lng = lng;
      }
    }

    hub.lastUpdatedBy = userId;
    await hub.save();

    // === UPDATE USER FIELDS ===
    await this.updateUserFields(userId, data, planCode);

    return hub;
  }

  /**
   * Update user fields (separate from hub)
   * Plan-aware: Scale plan syncs common fields to User collection
   */
  private async updateUserFields(
    userId: string,
    data: HubUpdateHubProfileInput,
    planCode: string,
  ): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Common user fields (both plans)
    if (typeof data.bio === 'string') {
      user.bio = data.bio;
    }
    if (Array.isArray(data.skills)) {
      user.skills = data.skills as unknown as mongoose.Types.ObjectId[];
    }
    if (Array.isArray(data.languages)) {
      user.languages = data.languages as unknown as Array<{
        languageId: mongoose.Types.ObjectId;
        proficiency: string;
      }>;
    }
    if (typeof data.focusAreaId === 'string') {
      user.focusAreaId = data.focusAreaId as unknown as mongoose.Types.ObjectId;
    }
    if (typeof data.hourlyRate === 'number') {
      user.hourlyRate = data.hourlyRate;
    }

    // User location (separate from hub location)
    if (data.userLocation) {
      user.location = {
        ...user.location,
        ...data.userLocation,
      };
    }

    // User social links (separate from hub social links)
    if (data.userSocialLinks) {
      user.socialLinks = {
        ...user.socialLinks,
        ...data.userSocialLinks,
      };
    }

    // Scale plan: Sync common fields from Hub to User collection
    // These fields are shared between Hub and User for individual experts
    if (planCode === 'scale') {
      // Profile image (Hub.logo → User.profilePhoto)
      if (typeof data.agencyLogo === 'string') {
        user.profilePhoto = data.agencyLogo;
      }

      // Cover image (Hub.coverImage → User.coverPhoto)
      if (typeof data.coverImage === 'string') {
        user.coverPhoto = data.coverImage;
      }

      // Phone number (Hub.phoneNumber → User.phoneNumber)
      if (typeof data.phoneNumber === 'string') {
        user.phoneNumber = data.phoneNumber;
      }

      // Description/Bio (Hub.description → User.bio)
      if (typeof data.description === 'string') {
        user.bio = data.description;
      }

      // Location (Hub.location → User.location)
      // Note: User.location only has city, country, lat, lng (no state, postcode, address)
      if (data.location && typeof data.location === 'object') {
        user.location = {
          city: data.location.city || user.location?.city,
          country: data.location.country || user.location?.country,
          lat:
            data.location.lat !== undefined
              ? typeof data.location.lat === 'string'
                ? parseFloat(data.location.lat)
                : data.location.lat
              : user.location?.lat,
          lng:
            data.location.lng !== undefined
              ? typeof data.location.lng === 'string'
                ? parseFloat(data.location.lng)
                : data.location.lng
              : user.location?.lng,
        };
      }

      // Social links (Hub.socialLinks → User.socialLinks)
      if (data.socialLinks) {
        user.socialLinks = {
          ...user.socialLinks,
          ...data.socialLinks,
        };
      }

      // Scale-specific fields
      if (typeof data.professionalTitle === 'string') {
        user.professionalTitle = data.professionalTitle;
      }
      if (typeof data.userIntroVideo === 'string') {
        user.introVideo = data.userIntroVideo;
      }
      if (Array.isArray(data.jobPreferences)) {
        user.jobPreferences = data.jobPreferences as unknown as mongoose.Types.ObjectId[];
      }
      // Portfolio: For Scale plan, also save to User (sync with Hub)
      if (Array.isArray(data.portfolio)) {
        user.portfolio = data.portfolio as unknown as Array<{
          title: string;
          description?: string;
          images?: string[];
          skills?: mongoose.Types.ObjectId[];
          year?: string;
        }>;
      }
      if (Array.isArray(data.employment)) {
        user.employment = data.employment;
      }
      if (Array.isArray(data.education)) {
        user.education = data.education;
      }
    }

    await user.save();
  }

  /**
   * Publish hub for approval
   * Validates required fields based on user's plan
   */
  async publishHub(
    userId: string,
  ): Promise<{ success: boolean; hubId?: string; status?: string; missingFields?: string[] }> {
    // Get hub
    const hub = await Hub.findOne({ ownerId: userId });
    if (!hub) {
      throw new Error('Hub not found');
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get subscription to determine plan
    const subscription = await Subscription.findOne({
      userId,
      status: 'active',
    }).sort({ createdAt: -1 });

    const planCode = subscription?.planCode || 'soar';

    // Validate based on plan
    const validation = this.validateForPublish(hub, user, planCode);

    if (!validation.valid) {
      return {
        success: false,
        missingFields: validation.missingFields,
      };
    }

    // Update hub status
    hub.status = HubStatus.PENDING_REVIEW;
    await hub.save();

    return {
      success: true,
      hubId: String(hub._id),
      status: 'pending_review',
    };
  }

  /**
   * Validate hub and user for publish
   * Returns list of missing required fields based on plan
   */
  private validateForPublish(
    hub: IHub,
    user: IUser,
    planCode: string,
  ): { valid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    // Common required fields (both plans)
    if (!hub.name) missingFields.push('hub.name');
    if (!hub.description) missingFields.push('hub.description');
    if (!hub.location?.city) missingFields.push('hub.location.city');
    if (!hub.focusAreas || hub.focusAreas.length === 0) missingFields.push('hub.focusAreas');

    // Scale-specific required fields
    if (planCode === 'scale') {
      if (!user.professionalTitle) missingFields.push('user.professionalTitle');
      if (!user.jobPreferences || user.jobPreferences.length === 0) {
        missingFields.push('user.jobPreferences');
      }
      // Note: employment and education can be optional even for Scale
    }

    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  }
}

export const hubProfileService = new HubProfileService();
