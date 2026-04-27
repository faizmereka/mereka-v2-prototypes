import { BookingReview, BookingReviewStatus } from '@core/models/BookingReview';
import { Experience } from '@core/models/Experience';
import { Expertise, ExpertiseStatus } from '@core/models/Expertise';
import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import type {
  WebHomeDataResponse,
  WebHomeExperienceItem,
  WebHomeExpertiseItem,
  WebHomeReviewItem,
} from '@core/schemas/web/home/webHome.schema';

// ============================================================================
// Constants
// ============================================================================

const HOME_PAGE_LIMIT = 3;
const FEATURED_REVIEWS_LIMIT = 6;

// ============================================================================
// Service Class
// ============================================================================

class WebHomeService {
  /**
   * Get home page data with top 3 active expertises and experiences
   * Sorted by createdAt (newest first)
   */
  async getHomeData(): Promise<WebHomeDataResponse> {
    const [expertises, experiences] = await Promise.all([
      this.getActiveExpertises(),
      this.getActiveExperiences(),
    ]);

    return {
      expertises,
      experiences,
    };
  }

  /**
   * Get top 3 active/published expertises sorted by createdAt desc
   */
  private async getActiveExpertises(): Promise<WebHomeExpertiseItem[]> {
    const expertises = await Expertise.find({
      status: ExpertiseStatus.PUBLISHED,
    })
      .sort({ createdAt: -1 })
      .limit(HOME_PAGE_LIMIT)
      .select({
        expertiseTitle: 1,
        slug: 1,
        expertiseSummary: 1,
        coverPhoto: 1,
        currency: 1,
        rating: 1,
        ticket: {
          ticketType: 1,
          standardRate: 1,
        },
        host: {
          name: 1,
          profileUrl: 1,
        },
        location: {
          city: 1,
          country: 1,
        },
      })
      .lean();

    return expertises.map((expertise) => ({
      _id: expertise._id.toString(),
      expertiseTitle: expertise.expertiseTitle,
      slug: expertise.slug,
      expertiseSummary: expertise.expertiseSummary,
      coverPhoto: expertise.coverPhoto,
      currency: expertise.currency,
      rating: expertise.rating,
      ticket: expertise.ticket?.map((t) => ({
        ticketType: t.ticketType,
        standardRate: t.standardRate,
      })),
      host: expertise.host
        ? {
            name: expertise.host.name,
            profileUrl: expertise.host.profileUrl,
          }
        : undefined,
      location: expertise.location
        ? {
            city: expertise.location.city,
            country: expertise.location.country,
          }
        : undefined,
    }));
  }

  /**
   * Get top 3 active experiences sorted by createdAt desc
   */
  private async getActiveExperiences(): Promise<WebHomeExperienceItem[]> {
    const experiences = await Experience.find({
      status: 'ACTIVE',
      audienceType: { $in: ['Everyone', 'PUBLIC'] }, // Only public experiences
    })
      .sort({ createdAt: -1 })
      .limit(HOME_PAGE_LIMIT)
      .select({
        experienceTitle: 1,
        slug: 1,
        experienceDescription: 1,
        experienceType: 1,
        coverPhoto: 1,
        currency: 1,
        rating: 1,
        ticket: {
          ticketType: 1,
          ticketPrice: 1,
        },
        hostDetails: {
          name: 1,
          photoUrl: 1,
        },
        location: {
          city: 1,
          country: 1,
        },
      })
      .lean();

    return experiences.map((experience) => ({
      _id: experience._id.toString(),
      experienceTitle: experience.experienceTitle,
      slug: experience.slug,
      experienceDescription: experience.experienceDescription,
      experienceType: experience.experienceType,
      coverPhoto: experience.coverPhoto,
      currency: experience.currency,
      rating: experience.rating,
      ticket: experience.ticket?.map((t) => ({
        ticketType: t.ticketType,
        ticketPrice: t.ticketPrice,
      })),
      hostDetails: experience.hostDetails?.map((h) => ({
        name: h.name,
        photoUrl: h.photoUrl,
      })),
      location: experience.location
        ? {
            city: experience.location.city,
            country: experience.location.country,
          }
        : undefined,
    }));
  }

  /**
   * Get featured reviews for home page
   * Fetches high-rated (4-5 stars) reviews with populated service and hub info
   */
  async getFeaturedReviews(): Promise<WebHomeReviewItem[]> {
    // Get recent high-rated reviews
    const reviews = await BookingReview.find({
      status: BookingReviewStatus.ACTIVE,
      rating: { $gte: 4 },
    })
      .sort({ rating: -1, createdAt: -1 })
      .limit(FEATURED_REVIEWS_LIMIT)
      .lean();

    if (!reviews.length) {
      return [];
    }

    // Collect all unique IDs for batch fetching (filter out undefined)
    const hubIds = [...new Set(reviews.filter((r) => r.hubId).map((r) => r.hubId.toString()))];
    const reviewerIds = [
      ...new Set(reviews.filter((r) => r.reviewerId).map((r) => r.reviewerId.toString())),
    ];
    const experienceIds = reviews
      .filter((r) => r.serviceType === 'experience' && r.serviceId)
      .map((r) => r.serviceId.toString());
    const expertiseIds = reviews
      .filter((r) => r.serviceType === 'expertise' && r.serviceId)
      .map((r) => r.serviceId.toString());

    // Batch fetch all related data
    const [hubs, reviewers, experiences, expertises] = await Promise.all([
      Hub.find({ _id: { $in: hubIds } })
        .select('name slug logo location')
        .lean(),
      User.find({ _id: { $in: reviewerIds } })
        .select('name profilePhoto')
        .lean(),
      experienceIds.length > 0
        ? Experience.find({ _id: { $in: experienceIds } })
            .select('experienceTitle slug coverPhoto')
            .lean()
        : Promise.resolve([]),
      expertiseIds.length > 0
        ? Expertise.find({ _id: { $in: expertiseIds } })
            .select('expertiseTitle slug coverPhoto')
            .lean()
        : Promise.resolve([]),
    ]);

    // Create lookup maps
    const hubMap = new Map(hubs.map((h) => [h._id.toString(), h]));
    const reviewerMap = new Map(reviewers.map((r) => [r._id.toString(), r]));
    const experienceMap = new Map(experiences.map((e) => [e._id.toString(), e]));
    const expertiseMap = new Map(expertises.map((e) => [e._id.toString(), e]));

    // Transform reviews
    const featuredReviews: WebHomeReviewItem[] = [];

    for (const review of reviews) {
      // Skip reviews with missing required fields
      if (!review.hubId || !review.reviewerId) continue;

      const hub = hubMap.get(review.hubId.toString());
      const reviewer = reviewerMap.get(review.reviewerId.toString());

      if (!hub || !reviewer) continue;

      let serviceName = '';
      let serviceSlug = '';
      let serviceType: 'experience' | 'expertise' = 'experience';

      if (!review.serviceId) continue;

      if (review.serviceType === 'experience') {
        const experience = experienceMap.get(review.serviceId.toString());
        if (experience) {
          serviceName = experience.experienceTitle;
          serviceSlug = experience.slug;
          serviceType = 'experience';
        }
      } else {
        const expertise = expertiseMap.get(review.serviceId.toString());
        if (expertise) {
          serviceName = expertise.expertiseTitle;
          serviceSlug = expertise.slug;
          serviceType = 'expertise';
        }
      }

      if (!serviceName) continue;

      // Get hub location string
      const hubLocation = hub.location
        ? [hub.location.city, hub.location.country].filter(Boolean).join(', ')
        : '';

      featuredReviews.push({
        reviewRating: review.rating,
        reviewDescription: review.content,
        reviewerName: reviewer.name || 'Anonymous',
        serviceName,
        serviceSlug,
        serviceType,
        hubLogo: hub.logo || '',
        hubName: hub.name,
        hubLocation,
        hubSlug: hub.slug,
        reviewPhoto: review.photos?.[0],
        hostType: 'hub',
      });
    }

    return featuredReviews;
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const webHomeService = new WebHomeService();
