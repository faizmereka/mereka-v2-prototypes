import { Amenity } from '@core/models/Amenity';
import { CompanyType } from '@core/models/CompanyType';
import { Experience } from '@core/models/Experience';
import { Expertise, ExpertiseStatus } from '@core/models/Expertise';
import { Facility } from '@core/models/Facility';
import { Favorite, FavoriteableType, FavoriteStatus } from '@core/models/Favorite';
import { FocusArea } from '@core/models/FocusArea';
import { Hub, HubStatus } from '@core/models/Hub';
import { HubMember, HubMemberStatus } from '@core/models/HubMember';
import { User, UserStatus } from '@core/models/User';
import type {
  WebHubDetailResponse,
  WebHubExpertItem,
  WebHubListItem,
  WebHubListResult,
  WebHubServiceItem,
} from '@schemas/web';
import mongoose from 'mongoose';

// ============================================================================
// Types
// ============================================================================

export interface WebHubListOptions {
  page?: number;
  limit?: number;
  focusArea?: string;
  companyType?: string;
  city?: string;
  country?: string;
  search?: string;
  featured?: boolean;
}

export interface WebHubDetailOptions {
  slug: string;
  userId?: string; // Optional: logged-in user ID to check ownership
}

// ============================================================================
// Web Hub Service - Public API
// ============================================================================

export class WebHubService {
  /**
   * List public hubs with filtering
   */
  async listHubs(options: WebHubListOptions = {}): Promise<WebHubListResult> {
    const {
      page = 1,
      limit = 20,
      focusArea,
      companyType,
      city,
      country,
      search,
      featured,
    } = options;

    // Build query for active hubs
    const query: Record<string, unknown> = {
      status: HubStatus.ACTIVE,
      isActive: true,
    };

    // Filter by focus area
    if (focusArea && mongoose.isValidObjectId(focusArea)) {
      query.focusAreas = new mongoose.Types.ObjectId(focusArea);
    }

    // Filter by company type
    if (companyType && mongoose.isValidObjectId(companyType)) {
      query.companyType = new mongoose.Types.ObjectId(companyType);
    }

    // Filter by city (partial match)
    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    // Filter by country (partial match)
    if (country) {
      query['location.country'] = { $regex: country, $options: 'i' };
    }

    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by featured
    if (featured !== undefined) {
      query.isFeatured = featured;
    }

    const skip = (page - 1) * limit;

    // Get hubs with sorting (featured first, then by display order)
    const [hubDocs, total] = await Promise.all([
      Hub.find(query)
        .sort({ isFeatured: -1, displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name slug logo description companyType location focusAreas rating')
        .lean(),
      Hub.countDocuments(query),
    ]);

    // Get all company type and focus area IDs for batch lookup
    const companyTypeIds = [...new Set(hubDocs.map((h) => h.companyType).filter(Boolean))];
    const focusAreaIds = [...new Set(hubDocs.flatMap((h) => h.focusAreas || []))];
    const hubIds = hubDocs.map((h) => h._id);

    // Batch lookup company types, focus areas, and expert counts
    const [companyTypes, focusAreas, expertCounts] = await Promise.all([
      companyTypeIds.length > 0
        ? CompanyType.find({ _id: { $in: companyTypeIds } })
            .select('name')
            .lean()
        : [],
      focusAreaIds.length > 0
        ? FocusArea.find({ _id: { $in: focusAreaIds } })
            .select('name')
            .lean()
        : [],
      // Count experts per hub
      HubMember.aggregate([
        {
          $match: {
            hubId: { $in: hubIds },
            status: HubMemberStatus.ACTIVE,
          },
        },
        {
          $group: {
            _id: '$hubId',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Create maps for quick lookup
    const companyTypeMap = new Map(
      companyTypes.map((c) => [c._id?.toString(), { _id: c._id?.toString(), name: c.name }]),
    );
    const focusAreaMap = new Map(
      focusAreas.map((f) => [f._id?.toString(), { _id: f._id?.toString(), name: f.name }]),
    );
    const expertCountMap = new Map(expertCounts.map((e) => [e._id?.toString(), e.count]));

    // Build response items
    const hubs: WebHubListItem[] = hubDocs.map((hub) => ({
      _id: hub._id?.toString(),
      name: hub.name,
      slug: hub.slug,
      logo: hub.logo,
      description: hub.description,
      companyType: hub.companyType ? companyTypeMap.get(hub.companyType?.toString()) : undefined,
      location: {
        city: hub.location?.city || '',
        country: hub.location?.country || '',
      },
      focusAreas: (hub.focusAreas || [])
        .map((id) => focusAreaMap.get(id?.toString()))
        .filter((f): f is { _id: string; name: string } => f !== undefined)
        .slice(0, 3), // Limit to 3 focus areas for list view
      expertsCount: expertCountMap.get(hub._id?.toString()) || 0,
    }));

    return {
      hubs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get hub detail by slug
   * If userId is provided and user is a member, allow viewing draft hubs
   */
  async getHubBySlug(
    options: WebHubDetailOptions,
  ): Promise<
    (WebHubDetailResponse & { isOwner?: boolean; isDraft?: boolean; isFavorited?: boolean }) | null
  > {
    const { slug: slugOrId, userId } = options;

    // Step 1: Get hub by slug or ID (without status filter first)
    // Support both slug and ObjectId
    const isObjectId = mongoose.isValidObjectId(slugOrId) && slugOrId.length === 24;
    const query = isObjectId ? { _id: slugOrId } : { slug: slugOrId };

    const hub = await Hub.findOne(query).lean();

    if (!hub) {
      return null;
    }

    // Step 2: Check if user is a member/owner of this hub
    let isMember = false;
    if (userId && mongoose.isValidObjectId(userId)) {
      const membership = await HubMember.findOne({
        hubId: hub._id,
        userId: new mongoose.Types.ObjectId(userId),
        status: HubMemberStatus.ACTIVE,
      }).lean();
      isMember = !!membership;
    }

    // Step 3: If hub is not active and user is not a member, return null
    const isDraft = hub.status !== HubStatus.ACTIVE;
    if (isDraft && !isMember) {
      return null;
    }

    // Step 2: Fetch related data in parallel
    const [
      companyType,
      focusAreas,
      amenities,
      facilities,
      expertsCount,
      expertisesCount,
      experiencesCount,
    ] = await Promise.all([
      // Get company type
      hub.companyType ? CompanyType.findById(hub.companyType).select('name').lean() : null,

      // Get focus areas
      hub.focusAreas && hub.focusAreas.length > 0
        ? FocusArea.find({ _id: { $in: hub.focusAreas } })
            .select('name')
            .lean()
        : [],

      // Get amenities
      hub.amenities && hub.amenities.length > 0
        ? Amenity.find({ _id: { $in: hub.amenities } })
            .select('name')
            .lean()
        : [],

      // Get facilities
      hub.facilities && hub.facilities.length > 0
        ? Facility.find({ _id: { $in: hub.facilities } })
            .select('name')
            .lean()
        : [],

      // Count experts
      HubMember.countDocuments({
        hubId: hub._id,
        status: HubMemberStatus.ACTIVE,
      }),

      // Count expertises
      Expertise.countDocuments({
        hubId: hub._id,
        status: ExpertiseStatus.PUBLISHED,
      }),

      // Count experiences
      Experience.countDocuments({
        hubId: hub._id?.toString(),
        status: 'ACTIVE',
        audienceType: { $nin: ['Hidden', 'PRIVATE'] },
      }),
    ]);

    // Check if favorited by user (if authenticated)
    let isFavorited = false;
    if (userId && hub._id) {
      const favorite = await Favorite.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        favoriteableType: FavoriteableType.HUB,
        favoriteableId: hub._id,
        status: FavoriteStatus.ACTIVE,
      }).lean();
      isFavorited = !!favorite;
    }

    // Build response
    return {
      _id: hub._id?.toString(),
      name: hub.name,
      slug: hub.slug,
      logo: hub.logo,
      coverImage: hub.coverImage,
      description: hub.description,
      phoneNumber: hub.phoneNumber,

      // Company Type
      companyType: companyType
        ? { _id: companyType._id?.toString(), name: companyType.name }
        : undefined,

      // Location
      location: {
        address: hub.displayFullAddress ? hub.location?.address : undefined,
        city: hub.location?.city || '',
        state: hub.location?.state,
        country: hub.location?.country || '',
        postcode: hub.displayFullAddress ? hub.location?.postcode : undefined,
        lat: hub.location?.lat,
        lng: hub.location?.lng,
      },
      displayFullAddress: hub.displayFullAddress,

      // Media
      introVideo: hub.introVideo,
      gallery: hub.gallery || [],
      portfolio: hub.portfolio?.map((p) => ({
        title: p.title,
        description: p.description,
        images: p.images,
        year: p.year,
      })),

      // Operating Hours
      operatingHours: hub.operatingHours,

      // Social Links
      socialLinks: hub.socialLinks,

      // Focus Areas & Categories
      focusAreas: focusAreas.map((f) => ({ _id: f._id?.toString(), name: f.name })),
      amenities: amenities.map((a) => ({ _id: a._id?.toString(), name: a.name })),
      facilities: facilities.map((f) => ({ _id: f._id?.toString(), name: f.name })),

      // Services & Tags
      services: hub.services || [],
      tags: hub.tags || [],

      // Metadata
      isFeatured: hub.isFeatured,
      status: hub.status,

      // Counts
      expertsCount,
      expertisesCount,
      experiencesCount,

      // Ownership flags (for frontend to show banner)
      isOwner: isMember,
      isDraft,

      // Favorite status
      isFavorited,
    };
  }

  /**
   * Get hub experts
   */
  async getHubExperts(
    slug: string,
    limit: number = 10,
    userId?: string,
  ): Promise<WebHubExpertItem[]> {
    // Get hub by slug
    const hub = await Hub.findOne({ slug }).select('_id status').lean();

    if (!hub) {
      return [];
    }

    // Check if hub is draft and user is not a member
    if (hub.status !== HubStatus.ACTIVE) {
      let isMember = false;
      if (userId && mongoose.isValidObjectId(userId)) {
        const membership = await HubMember.findOne({
          hubId: hub._id,
          userId: new mongoose.Types.ObjectId(userId),
          status: HubMemberStatus.ACTIVE,
        }).lean();
        isMember = !!membership;
      }
      if (!isMember) {
        return [];
      }
    }

    // Get hub members
    const members = await HubMember.find({
      hubId: hub._id,
      status: HubMemberStatus.ACTIVE,
      userId: { $exists: true },
    })
      .limit(limit)
      .select('userId')
      .lean();

    if (members.length === 0) {
      return [];
    }

    // Get user details for members
    const userIds = members.map((m) => m.userId).filter(Boolean);
    const users = await User.find({
      _id: { $in: userIds },
      status: UserStatus.ACTIVE,
    })
      .select('name username professionalTitle profilePhoto focusAreaId')
      .lean();

    // Get focus areas
    const focusAreaIds = [...new Set(users.map((u) => u.focusAreaId).filter(Boolean))];
    const focusAreas =
      focusAreaIds.length > 0
        ? await FocusArea.find({ _id: { $in: focusAreaIds } })
            .select('name')
            .lean()
        : [];

    const focusAreaMap = new Map(
      focusAreas.map((f) => [f._id?.toString(), { _id: f._id?.toString(), name: f.name }]),
    );

    // Build response
    return users.map((user) => ({
      _id: user._id?.toString(),
      name: user.name,
      username: user.username || '',
      professionalTitle: user.professionalTitle,
      profilePhoto: user.profilePhoto,
      focusArea: user.focusAreaId ? focusAreaMap.get(user.focusAreaId?.toString()) : undefined,
    }));
  }

  /**
   * Get hub services (expertises and experiences)
   */
  async getHubServices(
    slug: string,
    options: { limit?: number; type?: 'expertise' | 'experience' | 'all'; userId?: string } = {},
  ): Promise<WebHubServiceItem[]> {
    const { limit = 10, type = 'all', userId } = options;

    // Get hub by slug
    const hub = await Hub.findOne({ slug }).select('_id status').lean();

    if (!hub) {
      return [];
    }

    // Check if hub is draft and user is not a member
    if (hub.status !== HubStatus.ACTIVE) {
      let isMember = false;
      if (userId && mongoose.isValidObjectId(userId)) {
        const membership = await HubMember.findOne({
          hubId: hub._id,
          userId: new mongoose.Types.ObjectId(userId),
          status: HubMemberStatus.ACTIVE,
        }).lean();
        isMember = !!membership;
      }
      if (!isMember) {
        return [];
      }
    }

    const services: WebHubServiceItem[] = [];
    const halfLimit = Math.ceil(limit / 2);

    // Get expertises if type is 'all' or 'expertise'
    if (type === 'all' || type === 'expertise') {
      const expertises = await Expertise.find({
        hubId: hub._id,
        status: ExpertiseStatus.PUBLISHED,
      })
        .sort({ createdAt: -1 })
        .limit(type === 'expertise' ? limit : halfLimit)
        .select('expertiseTitle slug coverPhoto ticket currency rating')
        .lean();

      for (const exp of expertises) {
        const tickets = exp.ticket || [];
        const lowestPrice =
          tickets.length > 0 ? Math.min(...tickets.map((t) => t.standardRate)) : undefined;

        services.push({
          _id: exp._id?.toString(),
          title: exp.expertiseTitle,
          slug: exp.slug,
          coverPhoto: exp.coverPhoto,
          type: 'expertise',
          price: lowestPrice,
          currency: exp.currency,
          rating: exp.rating,
        });
      }
    }

    // Get experiences if type is 'all' or 'experience'
    if (type === 'all' || type === 'experience') {
      const experiences = await Experience.find({
        hubId: hub._id?.toString(),
        status: 'ACTIVE',
        audienceType: { $nin: ['Hidden', 'PRIVATE'] },
      })
        .sort({ createdAt: -1 })
        .limit(type === 'experience' ? limit : halfLimit)
        .select('experienceTitle slug coverPhoto ticket currency rating')
        .lean();

      for (const exp of experiences) {
        const tickets = exp.ticket || [];
        const lowestPrice =
          tickets.length > 0 ? Math.min(...tickets.map((t) => t.ticketPrice)) : undefined;

        services.push({
          _id: exp._id?.toString(),
          title: exp.experienceTitle,
          slug: exp.slug,
          coverPhoto: exp.coverPhoto,
          type: 'experience',
          price: lowestPrice,
          currency: exp.currency,
          rating: exp.rating,
        });
      }
    }

    // Sort by rating (highest first) and limit
    return services.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, limit);
  }
}

export const webHubService = new WebHubService();
