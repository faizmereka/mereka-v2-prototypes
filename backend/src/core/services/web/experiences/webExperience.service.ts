import { Booking, BookingStatus } from '@core/models/Booking';
import { Experience } from '@core/models/Experience';
import { ExperienceEvent } from '@core/models/ExperienceEvent';
import { ExperienceTheme } from '@core/models/ExperienceTheme';
import { Favorite, FavoriteableType, FavoriteStatus } from '@core/models/Favorite';
import { Hub } from '@core/models/Hub';
import { SlotHold, SlotHoldStatus } from '@core/models/SlotHold';
import type {
  WebExperienceDetailResponse,
  WebExperienceSlot,
  WebExperienceSlotsResponse,
} from '@schemas/web';
import mongoose from 'mongoose';

// ============================================================================
// Constants
// ============================================================================

const UPCOMING_EVENTS_LIMIT = 10;

// ============================================================================
// Types
// ============================================================================

export interface WebExperienceListOptions {
  page?: number;
  limit?: number;
  category?: string;
  type?: 'Physical' | 'Virtual' | 'Hybrid';
  city?: string;
  search?: string;
}

export interface WebExperienceListItem {
  _id: string;
  experienceTitle: string;
  slug: string;
  coverPhoto?: string;
  experienceType: string;
  experienceCategory?: string;
  location?: {
    city?: string;
    country?: string;
  };
  ticket?: Array<{
    ticketType: string;
    ticketPrice: number;
  }>;
  currency?: string;
  rating?: number;
  views?: number;
}

export interface WebExperienceListResult {
  experiences: WebExperienceListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// Web Experience Service - Public API (Optimized with Parallel Queries)
// ============================================================================

export class WebExperienceService {
  /**
   * Get experience detail by slug for public viewing
   * Uses parallel queries (3 queries) instead of 7 sequential queries
   * Featured experiences are lazy loaded separately
   * @param slugOrId - Experience slug or ObjectId
   * @param userId - Optional authenticated user ID to check favorite status
   */
  async getExperienceBySlug(
    slugOrId: string,
    userId?: string,
  ): Promise<(WebExperienceDetailResponse & { isFavorited?: boolean }) | null> {
    // Step 1: Get main experience (single indexed query)
    // Support both slug and ObjectId
    const isObjectId = mongoose.isValidObjectId(slugOrId) && slugOrId.length === 24;
    const query = isObjectId ? { _id: slugOrId } : { slug: slugOrId };

    const experience = await Experience.findOne({
      ...query,
      status: 'ACTIVE',
      audienceType: { $nin: ['Hidden', 'PRIVATE'] },
    }).lean();

    if (!experience) {
      return null;
    }

    // Step 2: Fetch related data in parallel (3 queries instead of 7)
    // - Hub info
    // - Category name (if valid ObjectId) or use string value directly
    // - Upcoming events
    // NOTE: Topics and Featured are NOT fetched here (lazy load / IDs only)

    // Check if experienceCategory is a valid ObjectId or a legacy string value
    const categoryValue = experience.experienceCategory;
    const isValidCategoryId = categoryValue && mongoose.isValidObjectId(categoryValue);

    const [hub, categoryFromDb, upcomingEvents] = await Promise.all([
      // Get hub info
      Hub.findById(experience.hubId)
        .select('name slug logo description location.city location.country')
        .lean(),

      // Get category name (only if valid ObjectId)
      isValidCategoryId ? ExperienceTheme.findById(categoryValue).select('name').lean() : null,

      // Get upcoming events (next 10)
      ExperienceEvent.find({
        experienceId: experience._id?.toString(),
        status: 'ACTIVE',
        startTime: { $gte: new Date() },
      })
        .sort({ startTime: 1 })
        .limit(UPCOMING_EVENTS_LIMIT)
        .select('startTime endTime timeZone')
        .lean(),
    ]);

    // Handle category - either from DB lookup or use legacy string value directly
    const category = categoryFromDb
      ? { _id: categoryFromDb._id?.toString(), name: categoryFromDb.name }
      : categoryValue && !isValidCategoryId
        ? { _id: undefined, name: String(categoryValue) } // Legacy string value (e.g., "Workshop")
        : undefined;

    // Increment view count asynchronously (fire and forget)
    Experience.updateOne(query, { $inc: { views: 1 } }).exec();

    // Build response
    const response = {
      _id: experience._id?.toString(),
      experienceTitle: experience.experienceTitle,
      slug: experience.slug,
      experienceDescription: experience.experienceDescription,
      experienceType: experience.experienceType,

      // Category (already processed - handles both ObjectId references and legacy string values)
      experienceCategory: category,

      // Topics - simplified (theme/topic IDs only, frontend can resolve names if needed)
      experienceTopics: experience.experienceTopics || [],

      // Location
      location: experience.location,
      timeZone: experience.timeZone,

      // Host
      hostDetails: experience.hostDetails || [],
      hub: hub
        ? {
            _id: hub._id?.toString(),
            name: hub.name,
            slug: hub.slug,
            logo: hub.logo,
            description: hub.description,
            location: hub.location
              ? { city: hub.location.city, country: hub.location.country }
              : undefined,
          }
        : {
            _id: experience.hubId?.toString(),
            name: 'Unknown Hub',
            slug: '',
            logo: '',
          },

      // Audience
      audienceType: experience.audienceType,
      targetAudience: experience.targetAudience || [],
      expertiseLevel: experience.expertiseLevel,

      // Languages
      primaryLanguage: experience.primaryLanguage,
      secondaryLanguage: experience.secondaryLanguage,

      // Pricing
      currency: experience.currency || 'MYR',
      ticket: experience.ticket,
      canBookAsPrivate: experience.canBookAsPrivate || false,

      // Duration
      experienceDuration: experience.experienceDuration,

      // Media
      coverPhoto: experience.coverPhoto,
      gallery: experience.gallery,
      video: experience.video,

      // Content
      learnerOutcome: experience.learnerOutcome,
      instruction: experience.instruction,
      materialProvided: experience.materialProvided,
      materialNeedToBring: experience.materialNeedToBring,

      // Metadata
      status: experience.status,
      views: experience.views || 0,
      rating: experience.rating,
      totalReviews: 0, // TODO: Add when reviews model is implemented

      // Events
      upcomingEvents: upcomingEvents.map((event) => ({
        _id: event._id?.toString(),
        startTime: event.startTime,
        endTime: event.endTime,
        timeZone: event.timeZone,
      })),

      // Featured experiences - REMOVED (lazy load via separate API)
      // featuredExperiences: undefined,
    };

    // Check if favorited by user (if authenticated)
    let isFavorited = false;
    if (userId && experience._id) {
      const favorite = await Favorite.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        favoriteableType: FavoriteableType.EXPERIENCE,
        favoriteableId: experience._id,
        status: FavoriteStatus.ACTIVE,
      }).lean();
      isFavorited = !!favorite;
    }

    return {
      ...response,
      isFavorited,
    };
  }

  /**
   * Get upcoming events for an experience
   */
  async getUpcomingEvents(
    experienceId: string,
    limit: number = 10,
    page: number = 1,
  ): Promise<Array<{ _id: string; startTime: Date; endTime: Date; timeZone: string }>> {
    const now = new Date();
    const skip = (page - 1) * limit;

    const events = await ExperienceEvent.find({
      experienceId,
      status: 'ACTIVE',
      startTime: { $gte: now },
    })
      .sort({ startTime: 1 })
      .skip(skip)
      .limit(limit)
      .select('startTime endTime timeZone')
      .lean();

    return events.map((event) => ({
      _id: event._id?.toString(),
      startTime: event.startTime,
      endTime: event.endTime,
      timeZone: event.timeZone,
    }));
  }

  /**
   * Get paginated upcoming events for an experience
   */
  async getUpcomingEventsPaginated(
    slug: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<{
    events: Array<{ _id: string; startTime: Date; endTime: Date; timeZone: string }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null> {
    const { page = 1, limit = 10 } = options;

    // Find experience by slug
    const experience = await Experience.findOne({
      slug,
      status: 'ACTIVE',
    }).select('_id');

    if (!experience) {
      return null;
    }

    const now = new Date();
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      ExperienceEvent.find({
        experienceId: experience._id,
        status: 'ACTIVE',
        startTime: { $gte: now },
      })
        .sort({ startTime: 1 })
        .skip(skip)
        .limit(limit)
        .select('startTime endTime timeZone')
        .lean(),
      ExperienceEvent.countDocuments({
        experienceId: experience._id,
        status: 'ACTIVE',
        startTime: { $gte: now },
      }),
    ]);

    return {
      events: events.map((event) => ({
        _id: event._id?.toString(),
        startTime: event.startTime,
        endTime: event.endTime,
        timeZone: event.timeZone,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * List public experiences with filtering
   */
  async listExperiences(options: WebExperienceListOptions = {}): Promise<WebExperienceListResult> {
    const { page = 1, limit = 20, category, type, city, search } = options;

    // Build query
    const query: Record<string, unknown> = {
      status: 'ACTIVE',
      audienceType: { $nin: ['Hidden', 'PRIVATE'] },
    };

    if (category) {
      query.experienceCategory = category;
    }

    if (type) {
      query.experienceType = type;
    }

    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;

    const [experienceDocs, total] = await Promise.all([
      Experience.find(query)
        .sort({ isFeatured: -1, priority: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          'experienceTitle slug coverPhoto experienceType experienceCategory location ticket currency rating views',
        )
        .lean(),
      Experience.countDocuments(query),
    ]);

    const experiences: WebExperienceListItem[] = experienceDocs.map((exp) => ({
      _id: exp._id?.toString(),
      experienceTitle: exp.experienceTitle,
      slug: exp.slug,
      coverPhoto: exp.coverPhoto,
      experienceType: exp.experienceType,
      experienceCategory: exp.experienceCategory?.toString(),
      location: exp.location
        ? { city: exp.location.city, country: exp.location.country }
        : undefined,
      ticket: exp.ticket?.map((t) => ({
        ticketType: t.ticketType,
        ticketPrice: t.ticketPrice,
      })),
      currency: exp.currency,
      rating: exp.rating,
      views: exp.views,
    }));

    return {
      experiences,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get featured experiences from the same hub (for lazy loading)
   * Called separately after initial page load
   */
  async getFeaturedExperiences(
    hubId: string,
    excludeId: string,
    limit: number = 4,
  ): Promise<
    Array<{
      _id: string;
      experienceTitle: string;
      slug: string;
      coverPhoto?: string;
      experienceType: string;
      ticket?: Array<{ ticketType: string; ticketPrice: number }>;
    }>
  > {
    const experiences = await Experience.find({
      hubId,
      _id: { $ne: excludeId },
      status: 'ACTIVE',
      audienceType: { $nin: ['Hidden', 'PRIVATE'] },
    })
      .sort({ isFeatured: -1, priority: 1, views: -1 })
      .limit(limit)
      .select('experienceTitle slug coverPhoto experienceType ticket')
      .lean();

    return experiences.map((exp) => ({
      _id: exp._id?.toString(),
      experienceTitle: exp.experienceTitle,
      slug: exp.slug,
      coverPhoto: exp.coverPhoto,
      experienceType: exp.experienceType,
      ticket: exp.ticket?.map((t) => ({
        ticketType: t.ticketType,
        ticketPrice: t.ticketPrice,
      })),
    }));
  }

  /**
   * Get experience slots with per-ticket availability for booking widget
   * Calculates available quantity based on existing bookings
   */
  async getExperienceSlots(
    slug: string,
    limit: number = 100,
  ): Promise<WebExperienceSlotsResponse | null> {
    // Step 1: Get the experience with ticket definitions
    const experience = await Experience.findOne({
      slug,
      status: 'ACTIVE',
      audienceType: { $nin: ['Hidden', 'PRIVATE'] },
    })
      .select('_id ticket currency feePaidBy')
      .lean();

    if (!experience) {
      return null;
    }

    const tickets = experience.ticket || [];
    if (tickets.length === 0) {
      return {
        slots: [],
        currency: experience.currency || 'MYR',
        minPrice: 0,
        isHubPayingFee: experience.feePaidBy === 'hub',
      };
    }

    // Step 2: Get upcoming events
    const now = new Date();
    const events = await ExperienceEvent.find({
      experienceId: experience._id,
      status: 'ACTIVE',
      startTime: { $gte: now },
    })
      .sort({ startTime: 1 })
      .limit(limit)
      .select('_id startTime endTime timeZone')
      .lean();

    if (events.length === 0) {
      return {
        slots: [],
        currency: experience.currency || 'MYR',
        minPrice: Math.min(...tickets.map((t) => t.ticketPrice)),
        isHubPayingFee: experience.feePaidBy === 'hub',
      };
    }

    // Step 3: Get all bookings and active holds for these events to calculate availability
    const eventIds = events.map((e) => e._id);

    // Get booking counts per event-ticket combination
    const bookings = await Booking.aggregate([
      {
        $match: {
          eventId: { $in: eventIds },
          status: { $in: [BookingStatus.PENDING, BookingStatus.ACTIVE] },
        },
      },
      { $unwind: '$selectedTickets' },
      {
        $group: {
          _id: {
            eventId: '$eventId',
            ticketId: '$selectedTickets.id',
          },
          bookedCount: { $sum: '$selectedTickets.numberOfSelectedTickets' },
        },
      },
    ]);

    // Get active hold counts per event-ticket combination (non-expired holds)
    const holds = await SlotHold.aggregate([
      {
        $match: {
          eventId: { $in: eventIds },
          status: SlotHoldStatus.ACTIVE,
          expiresAt: { $gt: new Date() },
        },
      },
      { $unwind: '$tickets' },
      {
        $group: {
          _id: {
            eventId: '$eventId',
            ticketId: '$tickets.ticketId',
          },
          heldCount: { $sum: '$tickets.quantity' },
        },
      },
    ]);

    // Create maps for quick lookup: eventId-ticketId -> count
    const bookedMap = new Map<string, number>();
    for (const booking of bookings) {
      const key = `${booking._id.eventId}-${booking._id.ticketId}`;
      bookedMap.set(key, booking.bookedCount);
    }

    const heldMap = new Map<string, number>();
    for (const hold of holds) {
      const key = `${hold._id.eventId}-${hold._id.ticketId}`;
      heldMap.set(key, hold.heldCount);
    }

    // Step 4: Build slots with ticket availability (accounting for bookings AND holds)
    const slots: WebExperienceSlot[] = events.map((event) => {
      const eventTickets = tickets.map((ticket) => {
        const ticketId = ticket._id?.toString() ?? '';
        const key = `${event._id}-${ticketId}`;
        const bookedCount = bookedMap.get(key) || 0;
        const heldCount = heldMap.get(key) || 0;
        const maximumQuantity = ticket.ticketQty || 0;
        const availableQuantity = Math.max(0, maximumQuantity - bookedCount - heldCount);

        // Calculate cutoff time if defined
        let ticketSalePeriodEndTime: string | undefined;
        if (ticket.hasCutoffTime && ticket.cutoffNumber && ticket.cutoffTime) {
          const eventStart = new Date(event.startTime);
          let cutoffMs = 0;

          // Convert cutoff to milliseconds
          switch (ticket.cutoffTime) {
            case 'Hour(s)':
              cutoffMs = ticket.cutoffNumber * 60 * 60 * 1000;
              break;
            case 'Day(s)':
              cutoffMs = ticket.cutoffNumber * 24 * 60 * 60 * 1000;
              break;
            case 'Minute(s)':
              cutoffMs = ticket.cutoffNumber * 60 * 1000;
              break;
            default:
              cutoffMs = ticket.cutoffNumber * 60 * 60 * 1000; // Default to hours
          }

          // cutoffBeforeAfter determines if cutoff is before or after start
          if (ticket.cutoffBeforeAfter === 'Before Experience starts') {
            ticketSalePeriodEndTime = new Date(eventStart.getTime() - cutoffMs).toISOString();
          } else {
            ticketSalePeriodEndTime = new Date(eventStart.getTime() + cutoffMs).toISOString();
          }
        }

        return {
          id: ticketId,
          name: ticket.ticketName,
          price: ticket.ticketPrice,
          type: (ticket.ticketType === 'Paid' ? 'Paid' : 'Free') as 'Paid' | 'Free',
          description: ticket.description,
          maximumQuantity,
          availableQuantity,
          ticketSalePeriodEndTime,
        };
      });

      const totalAvailableQuantity = eventTickets.reduce((sum, t) => sum + t.availableQuantity, 0);

      return {
        id: event._id?.toString(),
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        timeZone: event.timeZone,
        tickets: eventTickets,
        totalAvailableQuantity,
      };
    });

    // Calculate min price from ticket prices
    const prices = tickets.map((t) => t.ticketPrice);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

    return {
      slots,
      currency: experience.currency || 'MYR',
      minPrice,
      isHubPayingFee: experience.feePaidBy === 'hub',
    };
  }
}

export const webExperienceService = new WebExperienceService();
