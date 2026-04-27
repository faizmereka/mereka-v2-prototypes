import { Booking, BookingStatus } from '@core/models/Booking';
import { Expertise, ExpertiseStatus } from '@core/models/Expertise';
import { Favorite, FavoriteableType, FavoriteStatus } from '@core/models/Favorite';
import { Hub } from '@core/models/Hub';
import type { WebExpertiseDetailResponse, WebExpertiseFeaturedResponse } from '@schemas/web';
import mongoose from 'mongoose';

// ============================================================================
// Types - Expertise Slots
// ============================================================================

export interface ExpertiseTicketInfo {
  id: string;
  name: string;
  price: number;
  type: 'Paid' | 'Free';
  description?: string;
  mode: string;
  sessionDuration: number;
  durationUnit: string;
  bufferTime?: number;
  instantBooking: boolean;
}

export interface ExpertiseTimeSlot {
  time: string; // HH:mm format
  available: boolean;
}

export interface ExpertiseDateSlots {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  slots: ExpertiseTimeSlot[];
}

export interface ExpertiseSlotsResponse {
  expertise: {
    _id: string;
    expertiseTitle: string;
    slug: string;
    coverPhoto?: string;
    host?: {
      id: string;
      name: string;
      profileUrl?: string;
    };
    hub: {
      _id: string;
      name: string;
      slug: string;
      logo?: string;
    };
  };
  tickets: ExpertiseTicketInfo[];
  currency: string;
  minPrice: number;
  isHubPayingFee: boolean;
  availableDates: ExpertiseDateSlots[];
}

// ============================================================================
// Types
// ============================================================================

export interface WebExpertiseListOptions {
  page?: number;
  limit?: number;
  city?: string;
  mode?: 'online' | 'physical';
  search?: string;
}

export interface WebExpertiseListItem {
  _id: string;
  expertiseTitle: string;
  slug: string;
  coverPhoto?: string;
  host?: { name: string };
  location?: { city?: string };
  ticket?: Array<{
    ticketType: string;
    standardRate: number;
    expertiseMode: string;
  }>;
  currency?: string;
  rating?: number;
}

export interface WebExpertiseListResult {
  expertises: WebExpertiseListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// Web Expertise Service - Public API
// ============================================================================

export class WebExpertiseService {
  /**
   * Get expertise detail by slug for public viewing
   * @param slugOrId - Expertise slug or ObjectId
   * @param userId - Optional authenticated user ID to check favorite status
   */
  async getExpertiseBySlug(
    slugOrId: string,
    userId?: string,
  ): Promise<(WebExpertiseDetailResponse & { isFavorited?: boolean }) | null> {
    // Support both slug and ObjectId
    const isObjectId = mongoose.isValidObjectId(slugOrId) && slugOrId.length === 24;
    const query = isObjectId ? { _id: slugOrId } : { slug: slugOrId };

    const expertise = await Expertise.findOne({
      ...query,
      status: ExpertiseStatus.PUBLISHED,
      audienceType: { $nin: ['Hidden', 'PRIVATE'] },
    }).lean();

    if (!expertise) {
      return null;
    }

    // Fetch hub info
    const hub = await Hub.findById(expertise.hubId)
      .select('name slug logo description location.city location.country')
      .lean();

    // Build response
    const response = {
      _id: expertise._id?.toString(),
      expertiseTitle: expertise.expertiseTitle,
      slug: expertise.slug,
      expertiseDescription: expertise.expertiseDescription,
      expertiseSummary: expertise.expertiseSummary,

      // Host & Hub
      host: expertise.host
        ? {
            id: expertise.host.id,
            name: expertise.host.name,
            profileUrl: expertise.host.profileUrl,
            description: expertise.host.description,
          }
        : undefined,
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
        : undefined,

      // Location
      location: expertise.location
        ? {
            venueName: expertise.location.venueName,
            address: expertise.location.address,
            city: expertise.location.city,
            state: expertise.location.state,
            country: expertise.location.country,
            lat: expertise.location.lat,
            lng: expertise.location.lng,
          }
        : undefined,

      // Languages
      primaryLanguage: expertise.primaryLanguage,
      secondaryLanguages: expertise.secondaryLanguages,

      // Tags
      tags: expertise.tags,

      // Pricing
      currency: expertise.currency || 'MYR',
      ticket: expertise.ticket?.map((t) => ({
        id: t._id?.toString() ?? '',
        ticketName: t.ticketName,
        ticketType: t.ticketType,
        standardRate: t.standardRate,
        ticketQty: t.ticketQty,
        expertiseMode: t.expertiseMode,
        sessionDuration: t.sessionDuration,
        durationUnit: t.durationUnit,
        description: t.description,
        // Booking settings
        hasBufferTime: t.hasBufferTime,
        bufferTime: t.bufferTime,
        instantBooking: t.instantBooking,
      })),
      feePaidBy: expertise.feePaidBy,

      // Media
      coverPhoto: expertise.coverPhoto,
      gallery: expertise.gallery,

      // Content
      expertiseInstructions: expertise.expertiseInstructions,
      materialProvided: [], // TODO: Add when model has this field
      materialNeedToBring: [], // TODO: Add when model has this field

      // Metadata
      status: expertise.status,
      rating: expertise.rating,
      totalReviews: 0, // TODO: Add when reviews model is implemented

      // Booking configuration
      availabilityType: expertise.availabilityType || 'manual',
      operatingHours: expertise.operatingHours
        ? {
            sameOperatingHoursForAll: expertise.operatingHours.sameOperatingHoursForAll,
            allOperatingHours: expertise.operatingHours.allOperatingHours,
            allOperatingStartTime: expertise.operatingHours.allOperatingStartTime,
            allOperatingEndTime: expertise.operatingHours.allOperatingEndTime,
            days:
              expertise.operatingHours.days?.map((d) => ({
                key: d.key,
                fullTitle: d.fullTitle,
                title: d.title,
                isActive: d.isActive,
                fullDay: d.fullDay,
                startTime: d.startTime,
                endTime: d.endTime,
              })) || [],
          }
        : undefined,

      // Timestamps
      createdAt: expertise.createdAt?.toISOString(),
      updatedAt: expertise.updatedAt?.toISOString(),
    };

    // Check if favorited by user (if authenticated)
    let isFavorited = false;
    if (userId && expertise._id) {
      const favorite = await Favorite.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        favoriteableType: FavoriteableType.EXPERTISE,
        favoriteableId: expertise._id,
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
   * List public expertises with filtering
   */
  async listExpertises(options: WebExpertiseListOptions = {}): Promise<WebExpertiseListResult> {
    const { page = 1, limit = 20, city, mode, search } = options;

    // Build query
    const query: Record<string, unknown> = {
      status: ExpertiseStatus.PUBLISHED,
      audienceType: { $nin: ['Hidden', 'PRIVATE'] },
    };

    if (city) {
      query['location.city'] = { $regex: city, $options: 'i' };
    }

    if (mode) {
      query['ticket.expertiseMode'] = mode;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;

    const [expertiseDocs, total] = await Promise.all([
      Expertise.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('expertiseTitle slug coverPhoto host location ticket currency rating')
        .lean(),
      Expertise.countDocuments(query),
    ]);

    const expertises: WebExpertiseListItem[] = expertiseDocs.map((exp) => ({
      _id: exp._id?.toString(),
      expertiseTitle: exp.expertiseTitle,
      slug: exp.slug,
      coverPhoto: exp.coverPhoto,
      host: exp.host ? { name: exp.host.name } : undefined,
      location: exp.location ? { city: exp.location.city } : undefined,
      ticket: exp.ticket?.map((t) => ({
        ticketType: t.ticketType,
        standardRate: t.standardRate,
        expertiseMode: t.expertiseMode,
      })),
      currency: exp.currency,
      rating: exp.rating,
    }));

    return {
      expertises,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get featured expertises from the same hub (for lazy loading)
   */
  async getFeaturedExpertises(
    hubId: string,
    excludeId: string,
    limit: number = 4,
  ): Promise<WebExpertiseFeaturedResponse[]> {
    const expertises = await Expertise.find({
      hubId,
      _id: { $ne: excludeId },
      status: ExpertiseStatus.PUBLISHED,
      audienceType: { $nin: ['Hidden', 'PRIVATE'] },
    })
      .sort({ rating: -1, createdAt: -1 })
      .limit(limit)
      .select('expertiseTitle slug coverPhoto host ticket rating location')
      .lean();

    return expertises.map((exp) => ({
      _id: exp._id?.toString(),
      expertiseTitle: exp.expertiseTitle,
      slug: exp.slug,
      coverPhoto: exp.coverPhoto,
      host: exp.host ? { name: exp.host.name } : undefined,
      ticket: exp.ticket?.map((t) => ({
        id: t._id?.toString() ?? '',
        ticketName: t.ticketName,
        ticketType: t.ticketType,
        standardRate: t.standardRate,
        ticketQty: t.ticketQty,
        expertiseMode: t.expertiseMode,
        sessionDuration: t.sessionDuration,
        durationUnit: t.durationUnit,
        description: t.description,
        hasBufferTime: t.hasBufferTime,
        bufferTime: t.bufferTime,
        instantBooking: t.instantBooking,
      })),
      rating: exp.rating,
      location: exp.location ? { city: exp.location.city } : undefined,
    }));
  }

  /**
   * Get expertise slots with available dates and times for booking widget
   * Generates available slots based on operating hours
   */
  async getExpertiseSlots(
    slug: string,
    ticketId?: string,
    daysAhead: number = 30,
  ): Promise<ExpertiseSlotsResponse | null> {
    // Step 1: Get the expertise with ticket definitions and operating hours
    const expertise = await Expertise.findOne({
      slug,
      status: ExpertiseStatus.PUBLISHED,
      audienceType: { $nin: ['Hidden', 'PRIVATE'] },
    })
      .select(
        '_id expertiseTitle slug coverPhoto host hubId ticket currency feePaidBy operatingHours',
      )
      .lean();

    if (!expertise) {
      return null;
    }

    // Step 2: Get hub info
    const hub = await Hub.findById(expertise.hubId).select('name slug logo').lean();

    // Step 3: Build ticket info
    const tickets = expertise.ticket || [];
    if (tickets.length === 0) {
      return {
        expertise: {
          _id: expertise._id?.toString(),
          expertiseTitle: expertise.expertiseTitle,
          slug: expertise.slug,
          coverPhoto: expertise.coverPhoto,
          host: expertise.host
            ? {
                id: expertise.host.id,
                name: expertise.host.name,
                profileUrl: expertise.host.profileUrl,
              }
            : undefined,
          hub: hub
            ? {
                _id: hub._id?.toString(),
                name: hub.name,
                slug: hub.slug,
                logo: hub.logo,
              }
            : { _id: '', name: '', slug: '' },
        },
        tickets: [],
        currency: expertise.currency || 'MYR',
        minPrice: 0,
        isHubPayingFee: expertise.feePaidBy === 'hub',
        availableDates: [],
      };
    }

    // Build ticket info array
    const ticketInfos: ExpertiseTicketInfo[] = tickets.map((t) => ({
      id: t._id?.toString() ?? '',
      name: t.ticketName,
      price: t.standardRate,
      type: t.ticketType === 'Paid' ? 'Paid' : 'Free',
      description: t.description,
      mode: t.expertiseMode || 'online',
      sessionDuration: t.sessionDuration || 60,
      durationUnit: t.durationUnit || 'minutes',
      bufferTime: t.hasBufferTime ? t.bufferTime : undefined,
      instantBooking: t.instantBooking ?? true,
    }));

    // Get the selected ticket (or first one by default) for slot generation
    const selectedTicket = ticketId
      ? ticketInfos.find((t) => t.id === ticketId) || ticketInfos[0]
      : ticketInfos[0];

    // Ensure we have a selected ticket
    if (!selectedTicket) {
      return {
        expertise: {
          _id: expertise._id?.toString() || '',
          expertiseTitle: expertise.expertiseTitle,
          slug: expertise.slug,
          coverPhoto: expertise.coverPhoto,
          host: expertise.host
            ? {
                id: expertise.host.id,
                name: expertise.host.name,
                profileUrl: expertise.host.profileUrl,
              }
            : undefined,
          hub: hub
            ? {
                _id: hub._id?.toString() || '',
                name: hub.name,
                slug: hub.slug,
                logo: hub.logo,
              }
            : { _id: '', name: '', slug: '' },
        },
        tickets: ticketInfos,
        currency: expertise.currency || 'MYR',
        minPrice: 0,
        isHubPayingFee: expertise.feePaidBy === 'hub',
        availableDates: [],
      };
    }

    // Step 4: Generate available dates based on operating hours
    const operatingHours = expertise.operatingHours;
    const availableDates: ExpertiseDateSlots[] = [];

    if (operatingHours) {
      // Get existing bookings for this expertise in the next N days
      const now = new Date();
      const startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + daysAhead);
      endDate.setHours(23, 59, 59, 999);

      // Get all active/pending bookings for this expertise in the date range
      const existingBookings = await Booking.find({
        serviceId: expertise._id,
        bookingType: 'expertise',
        status: { $in: [BookingStatus.ACTIVE, BookingStatus.PENDING] },
        bookingStartDate: { $gte: startDate, $lte: endDate },
      })
        .select('bookingStartDate bookingEndDate')
        .lean();

      // Convert bookings to a set of booked time ranges for quick lookup
      const bookedSlots = existingBookings.map((b) => ({
        start: new Date(b.bookingStartDate).getTime(),
        end: new Date(b.bookingEndDate).getTime(),
      }));

      // Day key mapping - DB stores short keys (sun, mon, etc.)
      const dayKeyMap: Record<number, string> = {
        0: 'sun',
        1: 'mon',
        2: 'tue',
        3: 'wed',
        4: 'thu',
        5: 'fri',
        6: 'sat',
      };

      const dayNameMap: Record<number, string> = {
        0: 'Sunday',
        1: 'Monday',
        2: 'Tuesday',
        3: 'Wednesday',
        4: 'Thursday',
        5: 'Friday',
        6: 'Saturday',
      };

      // Session duration in minutes
      let sessionDurationMins = selectedTicket.sessionDuration;
      if (selectedTicket.durationUnit === 'hours') {
        sessionDurationMins = selectedTicket.sessionDuration * 60;
      }
      const bufferMins = selectedTicket.bufferTime || 0;
      const totalSlotDuration = sessionDurationMins + bufferMins;

      // Generate slots for each day
      for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + dayOffset);

        const dayOfWeek = currentDate.getDay();
        const dayKey = dayKeyMap[dayOfWeek] || 'sunday';
        const dayName = dayNameMap[dayOfWeek] || 'Sunday';

        // Find operating hours for this day
        const dayConfig = operatingHours.days?.find((d) => d.key === dayKey);

        // Skip if day is not active
        if (!dayConfig?.isActive) continue;

        // Get start and end times
        let dayStartTime: string;
        let dayEndTime: string;

        if (operatingHours.sameOperatingHoursForAll) {
          dayStartTime = operatingHours.allOperatingStartTime || '09:00';
          dayEndTime = operatingHours.allOperatingEndTime || '17:00';
        } else {
          dayStartTime = dayConfig.startTime || '09:00';
          dayEndTime = dayConfig.endTime || '17:00';
        }

        // Parse times
        const timeParts = dayStartTime.split(':');
        const endTimeParts = dayEndTime.split(':');
        const startHour = Number(timeParts[0]) || 9;
        const startMin = Number(timeParts[1]) || 0;
        const endHour = Number(endTimeParts[0]) || 17;
        const endMin = Number(endTimeParts[1]) || 0;

        // Generate time slots
        // Use local date format (YYYY-MM-DD) to avoid timezone issues with toISOString()
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const slots: ExpertiseTimeSlot[] = [];

        let slotHour: number = startHour;
        let slotMin: number = startMin;

        while (true) {
          // Check if slot fits within operating hours (session must end before closing)
          const sessionEndHour = slotHour + Math.floor((slotMin + sessionDurationMins) / 60);
          const sessionEndMin = (slotMin + sessionDurationMins) % 60;

          if (sessionEndHour > endHour || (sessionEndHour === endHour && sessionEndMin > endMin)) {
            break;
          }

          const timeStr = `${slotHour.toString().padStart(2, '0')}:${slotMin.toString().padStart(2, '0')}`;

          // Create slot datetime for conflict check
          const slotStart = new Date(currentDate);
          slotStart.setHours(slotHour, slotMin, 0, 0);
          const slotEnd = new Date(slotStart.getTime() + sessionDurationMins * 60 * 1000);

          // Check if slot is in the past (must be at least 2 hours from now for same-day bookings)
          const minBookingTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
          const isPast = slotStart < minBookingTime;

          // Check for conflicts with existing bookings
          const hasConflict = bookedSlots.some((booked) => {
            return slotStart.getTime() < booked.end && slotEnd.getTime() > booked.start;
          });

          slots.push({
            time: timeStr,
            available: !isPast && !hasConflict,
          });

          // Move to next slot
          slotMin += totalSlotDuration;
          slotHour += Math.floor(slotMin / 60);
          slotMin = slotMin % 60;
        }

        // Only add dates that have at least one available slot
        if (slots.some((s) => s.available)) {
          availableDates.push({
            date: dateStr,
            dayOfWeek: dayName,
            slots,
          });
        }
      }
    }

    // Calculate min price from ticket prices
    const prices = ticketInfos.map((t) => t.price);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

    return {
      expertise: {
        _id: expertise._id?.toString(),
        expertiseTitle: expertise.expertiseTitle,
        slug: expertise.slug,
        coverPhoto: expertise.coverPhoto,
        host: expertise.host
          ? {
              id: expertise.host.id,
              name: expertise.host.name,
              profileUrl: expertise.host.profileUrl,
            }
          : undefined,
        hub: hub
          ? {
              _id: hub._id?.toString(),
              name: hub.name,
              slug: hub.slug,
              logo: hub.logo,
            }
          : { _id: '', name: '', slug: '' },
      },
      tickets: ticketInfos,
      currency: expertise.currency || 'MYR',
      minPrice,
      isHubPayingFee: expertise.feePaidBy === 'hub',
      availableDates,
    };
  }
}

export const webExpertiseService = new WebExpertiseService();
