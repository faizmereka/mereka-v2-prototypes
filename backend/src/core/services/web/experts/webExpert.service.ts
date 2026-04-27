import { BookingReview, BookingReviewStatus } from '@core/models/BookingReview';
import { Experience } from '@core/models/Experience';
import { Expertise, ExpertiseStatus } from '@core/models/Expertise';
import { Favorite, FavoriteableType, FavoriteStatus } from '@core/models/Favorite';
import { FocusArea } from '@core/models/FocusArea';
import { HubStatus } from '@core/models/Hub';
import { HubMember, HubMemberStatus } from '@core/models/HubMember';
import { Language } from '@core/models/Language';
import { Skill } from '@core/models/Skill';
import { User, UserStatus } from '@core/models/User';
import type {
  WebExpertDetailResponse,
  WebExpertListItem,
  WebExpertListResult,
  WebExpertReviewItem,
  WebExpertServiceItem,
} from '@schemas/web';
import mongoose from 'mongoose';

// ============================================================================
// Types
// ============================================================================

export interface WebExpertListOptions {
  page?: number;
  limit?: number;
  focusArea?: string;
  skill?: string;
  city?: string;
  country?: string;
  search?: string;
  hubId?: string;
}

export interface WebExpertDetailOptions {
  slug: string;
  userId?: string; // Optional: logged-in user ID to check ownership
}

// ============================================================================
// Web Expert Service - Public API
// ============================================================================

export class WebExpertService {
  /**
   * List public experts with filtering
   * Experts are users who have a professionalTitle set and are members of active hubs
   */
  async listExperts(options: WebExpertListOptions = {}): Promise<WebExpertListResult> {
    const { page = 1, limit = 20, focusArea, skill, city, country, search, hubId } = options;

    // Build user query for experts
    // Expert = User with professionalTitle set (profile-based)
    const userQuery: Record<string, unknown> = {
      status: UserStatus.ACTIVE,
      professionalTitle: { $exists: true, $ne: '' },
    };

    // Filter by focus area
    if (focusArea && mongoose.isValidObjectId(focusArea)) {
      userQuery.focusAreaId = new mongoose.Types.ObjectId(focusArea);
    }

    // Filter by skill
    if (skill && mongoose.isValidObjectId(skill)) {
      userQuery.skills = new mongoose.Types.ObjectId(skill);
    }

    // Filter by city (partial match)
    if (city) {
      userQuery['location.city'] = { $regex: city, $options: 'i' };
    }

    // Filter by country (partial match)
    if (country) {
      userQuery['location.country'] = { $regex: country, $options: 'i' };
    }

    // Search by name or title
    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { professionalTitle: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    // Get experts with hub membership info
    const [userDocs, total] = await Promise.all([
      User.find(userQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name username professionalTitle profilePhoto bio skills focusAreaId location')
        .lean(),
      User.countDocuments(userQuery),
    ]);

    // Get user IDs for hub lookup
    const userIds = userDocs.map((u) => u._id);

    // Get hub memberships and populate hub info
    const hubMemberships = await HubMember.find({
      userId: { $in: userIds },
      status: HubMemberStatus.ACTIVE,
    })
      .populate<{
        hubId: { _id: string; name: string; slug: string; logo: string; status: HubStatus };
      }>({
        path: 'hubId',
        select: 'name slug logo status',
        match: { status: HubStatus.ACTIVE },
      })
      .lean();

    // Filter memberships to only include those with hubId filter if specified
    let filteredMemberships = hubMemberships.filter((m) => m.hubId !== null);
    if (hubId && mongoose.isValidObjectId(hubId)) {
      filteredMemberships = filteredMemberships.filter(
        (m) => m.hubId && m.hubId._id?.toString() === hubId,
      );
    }

    // Create a map of userId -> hub info
    const userHubMap = new Map<
      string,
      { _id: string; name: string; slug: string; logo?: string }
    >();
    for (const membership of filteredMemberships) {
      if (membership.hubId && membership.userId) {
        userHubMap.set(membership.userId.toString(), {
          _id: membership.hubId._id?.toString(),
          name: membership.hubId.name,
          slug: membership.hubId.slug,
          logo: membership.hubId.logo,
        });
      }
    }

    // If filtering by hubId, only include users who are members of that hub
    let filteredUsers = userDocs;
    if (hubId) {
      filteredUsers = userDocs.filter((u) => userHubMap.has(u._id?.toString()));
    }

    // Get all skill and focus area IDs for batch lookup
    const skillIds = [...new Set(filteredUsers.flatMap((u) => u.skills || []))];
    const focusAreaIds = [...new Set(filteredUsers.map((u) => u.focusAreaId).filter(Boolean))];

    // Batch lookup skills and focus areas
    const [skills, focusAreas] = await Promise.all([
      skillIds.length > 0
        ? Skill.find({ _id: { $in: skillIds } })
            .select('name')
            .lean()
        : [],
      focusAreaIds.length > 0
        ? FocusArea.find({ _id: { $in: focusAreaIds } })
            .select('name')
            .lean()
        : [],
    ]);

    // Create maps for quick lookup
    const skillMap = new Map(
      skills.map((s) => [s._id?.toString(), { _id: s._id?.toString(), name: s.name }]),
    );
    const focusAreaMap = new Map(
      focusAreas.map((f) => [f._id?.toString(), { _id: f._id?.toString(), name: f.name }]),
    );

    // Build response items
    const experts: WebExpertListItem[] = filteredUsers.map((user) => ({
      _id: user._id?.toString(),
      name: user.name,
      username: user.username || user._id?.toString() || '', // Fallback to _id if no username
      professionalTitle: user.professionalTitle,
      profilePhoto: user.profilePhoto,
      bio: user.bio,
      skills: (user.skills || [])
        .map((id) => skillMap.get(id?.toString()))
        .filter((s): s is { _id: string; name: string } => s !== undefined)
        .slice(0, 5), // Limit to 5 skills for list view
      focusArea: user.focusAreaId ? focusAreaMap.get(user.focusAreaId?.toString()) : undefined,
      location: user.location
        ? { city: user.location.city, country: user.location.country }
        : undefined,
      hub: userHubMap.get(user._id?.toString()),
    }));

    return {
      experts,
      total: hubId ? filteredUsers.length : total, // Adjust total if filtering by hub
      page,
      limit,
      totalPages: Math.ceil((hubId ? filteredUsers.length : total) / limit),
    };
  }

  /**
   * Get expert detail by username/slug or _id
   * If userId is provided and matches the profile owner, they can see incomplete profiles
   */
  async getExpertBySlug(options: WebExpertDetailOptions): Promise<
    | (WebExpertDetailResponse & {
        isOwner?: boolean;
        isIncomplete?: boolean;
        isFavorited?: boolean;
      })
    | null
  > {
    const { slug, userId } = options;

    // Step 1: Try to find user by username first (without professionalTitle filter)
    let user = await User.findOne({
      username: slug,
      status: UserStatus.ACTIVE,
    })
      .select(
        'name username email profilePhoto coverPhoto bio professionalTitle introVideo ' +
          'skills focusAreaId languages location socialLinks portfolio education employment hourlyRate currency',
      )
      .lean();

    // Fallback: try to find by _id if username not found and slug is valid ObjectId
    if (!user && mongoose.isValidObjectId(slug)) {
      user = await User.findOne({
        _id: new mongoose.Types.ObjectId(slug),
        status: UserStatus.ACTIVE,
      })
        .select(
          'name username email profilePhoto coverPhoto bio professionalTitle introVideo ' +
            'skills focusAreaId languages location socialLinks portfolio education employment hourlyRate currency',
        )
        .lean();
    }

    if (!user) {
      return null;
    }

    // Step 2: Check if profile is incomplete (no professional title)
    const isIncomplete = !user.professionalTitle || user.professionalTitle.trim() === '';

    // Step 3: Check if current user is the profile owner
    const isOwner = userId ? user._id?.toString() === userId : false;

    // Step 4: If profile is incomplete and user is not the owner, return null
    if (isIncomplete && !isOwner) {
      return null;
    }

    // Step 2: Fetch related data in parallel
    const [skills, focusArea, languages, hubMembership, expertisesCount, experiencesCount] =
      await Promise.all([
        // Get skills
        user.skills && user.skills.length > 0
          ? Skill.find({ _id: { $in: user.skills } })
              .select('name')
              .lean()
          : [],

        // Get focus area
        user.focusAreaId ? FocusArea.findById(user.focusAreaId).select('name').lean() : null,

        // Get languages
        user.languages && user.languages.length > 0
          ? Language.find({
              _id: { $in: user.languages.map((l) => l.languageId) },
            })
              .select('name')
              .lean()
          : [],

        // Get hub membership
        HubMember.findOne({
          userId: user._id,
          status: HubMemberStatus.ACTIVE,
        })
          .populate<{
            hubId: {
              _id: string;
              name: string;
              slug: string;
              logo: string;
              description?: string;
              location?: { city: string; country: string };
            };
          }>({
            path: 'hubId',
            select: 'name slug logo description location',
            match: { status: HubStatus.ACTIVE },
          })
          .lean(),

        // Count expertises created by this user
        Expertise.countDocuments({
          createdBy: user._id,
          status: ExpertiseStatus.PUBLISHED,
        }),

        // Count experiences where user is a host
        Experience.countDocuments({
          'hostDetails.id': user._id?.toString(),
          status: 'ACTIVE',
        }),
      ]);

    // Create language map for lookup
    const languageMap = new Map(languages.map((l) => [l._id?.toString(), l.name]));

    // Check if favorited by user (if authenticated)
    let isFavorited = false;
    if (userId && user._id) {
      const favorite = await Favorite.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        favoriteableType: FavoriteableType.EXPERT,
        favoriteableId: user._id,
        status: FavoriteStatus.ACTIVE,
      }).lean();
      isFavorited = !!favorite;
    }

    // Build response
    return {
      _id: user._id?.toString(),
      name: user.name,
      username: user.username || user._id?.toString() || '',
      email: user.email, // May be hidden in frontend
      profilePhoto: user.profilePhoto,
      coverPhoto: user.coverPhoto,
      bio: user.bio,
      professionalTitle: user.professionalTitle,
      introVideo: user.introVideo,

      // Skills & Focus Area
      skills: skills.map((s) => ({ _id: s._id?.toString(), name: s.name })),
      focusArea: focusArea ? { _id: focusArea._id?.toString(), name: focusArea.name } : undefined,

      // Languages
      languages: (user.languages || []).map((l) => ({
        language: {
          _id: l.languageId?.toString(),
          name: languageMap.get(l.languageId?.toString()) || 'Unknown',
        },
        proficiency: l.proficiency,
      })),

      // Location
      location: user.location,

      // Social Links
      socialLinks: user.socialLinks,

      // Portfolio with skills populated
      portfolio: user.portfolio?.map((p) => ({
        title: p.title,
        description: p.description,
        images: p.images,
        skills: (p.skills || [])
          .map((id) => {
            const skill = skills.find((s) => s._id?.toString() === id?.toString());
            return skill ? { _id: skill._id?.toString(), name: skill.name } : undefined;
          })
          .filter((s): s is { _id: string; name: string } => s !== undefined),
        year: p.year,
      })),

      // Education & Employment
      education: user.education,
      employment: user.employment,

      // Hub Association
      hub: hubMembership?.hubId
        ? {
            _id: hubMembership.hubId._id?.toString(),
            name: hubMembership.hubId.name,
            slug: hubMembership.hubId.slug,
            logo: hubMembership.hubId.logo,
            description: hubMembership.hubId.description,
            location: hubMembership.hubId.location,
          }
        : undefined,

      // Hourly Rate
      hourlyRate: user.hourlyRate,
      currency: user.currency,

      // Service counts
      expertisesCount,
      experiencesCount,

      // Ownership flags (for frontend to show banner/complete profile)
      isOwner,
      isIncomplete,

      // Favorite status
      isFavorited,
    };
  }

  /**
   * Get expert services (expertises and experiences)
   */
  async getExpertServices(
    slug: string,
    options: { limit?: number; type?: 'expertise' | 'experience' | 'all' } = {},
  ): Promise<WebExpertServiceItem[]> {
    const { limit = 10, type = 'all' } = options;

    // Get user by username
    const user = await User.findOne({
      username: slug,
      status: UserStatus.ACTIVE,
    })
      .select('_id')
      .lean();

    if (!user) {
      return [];
    }

    const services: WebExpertServiceItem[] = [];
    const halfLimit = Math.ceil(limit / 2);

    // Get expertises if type is 'all' or 'expertise'
    if (type === 'all' || type === 'expertise') {
      const expertises = await Expertise.find({
        createdBy: user._id,
        status: ExpertiseStatus.PUBLISHED,
      })
        .sort({ createdAt: -1 })
        .limit(type === 'expertise' ? limit : halfLimit)
        .select('expertiseTitle slug coverPhoto ticket currency rating')
        .lean();

      for (const exp of expertises) {
        const lowestPrice =
          exp.ticket?.length > 0 ? Math.min(...exp.ticket.map((t) => t.standardRate)) : undefined;

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
        'hostDetails.id': user._id?.toString(),
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

  /**
   * Get reviews for an expert (reviews across all their services)
   */
  async getExpertReviews(
    slug: string,
    options: { page?: number; limit?: number; rating?: number } = {},
  ): Promise<{
    reviews: WebExpertReviewItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    stats: {
      averageRating: number;
      totalReviews: number;
      distribution: { [key: number]: number };
    };
  }> {
    const { page = 1, limit = 10, rating } = options;

    // Get user by username
    const user = await User.findOne({
      username: slug,
      status: UserStatus.ACTIVE,
    })
      .select('_id')
      .lean();

    if (!user) {
      return {
        reviews: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        stats: {
          averageRating: 0,
          totalReviews: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
      };
    }

    // Get all service IDs for this expert
    const [expertises, experiences] = await Promise.all([
      Expertise.find({
        createdBy: user._id,
        status: ExpertiseStatus.PUBLISHED,
      })
        .select('_id expertiseTitle slug')
        .lean(),
      Experience.find({
        'hostDetails.id': user._id?.toString(),
        status: 'ACTIVE',
      })
        .select('_id experienceTitle slug')
        .lean(),
    ]);

    const expertiseIds = expertises.map((e) => e._id);
    const experienceIds = experiences.map((e) => e._id);

    // Create service maps for later lookup
    const expertiseMap = new Map(
      expertises.map((e) => [e._id.toString(), { title: e.expertiseTitle, slug: e.slug }]),
    );
    const experienceMap = new Map(
      experiences.map((e) => [e._id.toString(), { title: e.experienceTitle, slug: e.slug }]),
    );

    // Build query for reviews
    const reviewQuery: Record<string, unknown> = {
      status: BookingReviewStatus.ACTIVE,
      $or: [
        { serviceType: 'expertise', serviceId: { $in: expertiseIds } },
        { serviceType: 'experience', serviceId: { $in: experienceIds } },
      ],
    };

    if (rating) {
      reviewQuery.rating = rating;
    }

    // Get reviews with pagination
    const skip = (page - 1) * limit;

    const [reviews, total, allReviews] = await Promise.all([
      BookingReview.find(reviewQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reviewerId', 'name profilePhoto')
        .lean(),
      BookingReview.countDocuments(reviewQuery),
      // Get all reviews for stats (without rating filter)
      BookingReview.find({
        status: BookingReviewStatus.ACTIVE,
        $or: [
          { serviceType: 'expertise', serviceId: { $in: expertiseIds } },
          { serviceType: 'experience', serviceId: { $in: experienceIds } },
        ],
      })
        .select('rating')
        .lean(),
    ]);

    // Calculate stats
    const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    for (const review of allReviews) {
      const r = Math.round(review.rating) as 1 | 2 | 3 | 4 | 5;
      if (r >= 1 && r <= 5) {
        distribution[r] = (distribution[r] || 0) + 1;
        totalRating += review.rating;
      }
    }

    const totalReviews = allReviews.length;
    const averageRating = totalReviews > 0 ? Math.round((totalRating / totalReviews) * 10) / 10 : 0;

    // Transform reviews
    const transformedReviews: WebExpertReviewItem[] = reviews.map((review) => {
      const serviceId = review.serviceId.toString();
      const isExpertise = review.serviceType === 'expertise';
      const serviceInfo = isExpertise ? expertiseMap.get(serviceId) : experienceMap.get(serviceId);

      const reviewer = review.reviewerId as unknown as { name: string; profilePhoto?: string };

      return {
        _id: review._id.toString(),
        rating: review.rating,
        content: review.content,
        createdAt: review.createdAt.toISOString(),
        reviewer: {
          name: reviewer?.name || 'Anonymous',
          profilePhoto: reviewer?.profilePhoto,
        },
        service: {
          _id: serviceId,
          title: serviceInfo?.title || 'Unknown Service',
          slug: serviceInfo?.slug || '',
          type: review.serviceType as 'expertise' | 'experience',
        },
        photos: review.photos,
      };
    });

    return {
      reviews: transformedReviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        averageRating,
        totalReviews,
        distribution,
      },
    };
  }
}

export const webExpertService = new WebExpertService();
