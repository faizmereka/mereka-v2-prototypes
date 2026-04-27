import { Booking, BookingStatus, BookingType } from '@core/models/Booking';
import { Experience } from '@core/models/Experience';
import { ExperienceEvent } from '@core/models/ExperienceEvent';
import { Expertise } from '@core/models/Expertise';
import type {
  BookingStatus as CalendarBookingStatus,
  CalendarBookingSummary,
  CalendarEventDetail,
  CalendarEventSummary,
  CalendarEventsResponse,
  CalendarEventType,
  HubCalendarEventsQuery,
} from '@core/schemas/hub/calendar';
import mongoose from 'mongoose';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate booking status based on percentage
 */
function calculateBookingStatus(bookingCount: number, maxCapacity: number): CalendarBookingStatus {
  if (maxCapacity === 0 || bookingCount === 0) {
    return 'no-bookings';
  }

  const percentage = (bookingCount / maxCapacity) * 100;

  if (percentage >= 100) {
    return 'fully-booked';
  } else if (percentage >= 51) {
    return 'mostly-booked';
  } else if (percentage > 0) {
    return 'partially-booked';
  }

  return 'no-bookings';
}

/**
 * Parse date string to start of day
 */
function parseStartOfDay(dateStr: string): Date {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Parse date string to end of day
 */
function parseEndOfDay(dateStr: string): Date {
  const date = new Date(dateStr);
  date.setHours(23, 59, 59, 999);
  return date;
}

// ============================================================================
// Hub Calendar Service
// ============================================================================

export class HubCalendarService {
  /**
   * Get calendar events for a date range
   * Fetches both experience events and expertise bookings
   */
  async getCalendarEvents(
    hubId: string,
    query: HubCalendarEventsQuery,
  ): Promise<CalendarEventsResponse> {
    const { startDate, endDate, type = 'all' } = query;

    const startDateTime = parseStartOfDay(startDate);
    const endDateTime = parseEndOfDay(endDate);

    // Always fetch both types to get accurate counts for meta
    const [experienceEvents, expertiseEvents] = await Promise.all([
      this.fetchExperienceEvents(hubId, startDateTime, endDateTime),
      this.fetchExpertiseEvents(hubId, startDateTime, endDateTime),
    ]);

    // Calculate total counts (always show full counts regardless of filter)
    const experienceCount = experienceEvents.length;
    const expertiseCount = expertiseEvents.length;
    const totalEvents = experienceCount + expertiseCount;

    // Filter events based on type parameter
    let events: CalendarEventSummary[] = [];
    if (type === 'all') {
      events = [...experienceEvents, ...expertiseEvents];
    } else if (type === 'experience') {
      events = experienceEvents;
    } else if (type === 'expertise') {
      events = expertiseEvents;
    }

    // Sort by start time
    events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return {
      events,
      meta: {
        startDate,
        endDate,
        totalEvents,
        experienceCount,
        expertiseCount,
      },
    };
  }

  /**
   * Get events for a specific date
   */
  async getEventsByDate(
    hubId: string,
    date: string,
    type: 'all' | CalendarEventType = 'all',
  ): Promise<CalendarEventSummary[]> {
    const startDateTime = parseStartOfDay(date);
    const endDateTime = parseEndOfDay(date);

    const events: CalendarEventSummary[] = [];

    if (type === 'all' || type === 'experience') {
      const experienceEvents = await this.fetchExperienceEvents(hubId, startDateTime, endDateTime);
      events.push(...experienceEvents);
    }

    if (type === 'all' || type === 'expertise') {
      const expertiseEvents = await this.fetchExpertiseEvents(hubId, startDateTime, endDateTime);
      events.push(...expertiseEvents);
    }

    // Sort by start time
    events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return events;
  }

  /**
   * Get detailed event information with bookings
   */
  async getEventDetails(
    hubId: string,
    eventId: string,
    type: CalendarEventType,
  ): Promise<CalendarEventDetail | null> {
    if (type === 'experience') {
      return this.getExperienceEventDetails(hubId, eventId);
    } else {
      return this.getExpertiseEventDetails(hubId, eventId);
    }
  }

  // ============================================================================
  // Private Methods - Experience Events
  // ============================================================================

  /**
   * Fetch experience events for date range
   */
  private async fetchExperienceEvents(
    hubId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEventSummary[]> {
    // Get all experiences for this hub
    const hubIdQuery = mongoose.isValidObjectId(hubId)
      ? { $or: [{ hubId }, { hubId: new mongoose.Types.ObjectId(hubId) }] }
      : { hubId };

    const experiences = await Experience.find({
      ...hubIdQuery,
      status: { $ne: 'DELETED' },
    })
      .select('_id experienceTitle ticket coverPhoto')
      .lean();

    if (experiences.length === 0) {
      return [];
    }

    const experienceIds = experiences.map((e) => e._id);
    const experienceMap = new Map(experiences.map((e) => [e._id.toString(), e]));

    // Fetch experience events in date range
    const events = await ExperienceEvent.find({
      experienceId: { $in: experienceIds },
      status: 'ACTIVE',
      startTime: { $gte: startDate, $lte: endDate },
    })
      .sort({ startTime: 1 })
      .lean();

    if (events.length === 0) {
      return [];
    }

    // Get booking counts for these events
    const eventIds = events.map((e) => e._id);
    const bookingCounts = await Booking.aggregate([
      {
        $match: {
          eventId: { $in: eventIds },
          bookingType: BookingType.EXPERIENCE,
          status: { $in: [BookingStatus.ACTIVE, BookingStatus.COMPLETED, BookingStatus.PENDING] },
        },
      },
      { $unwind: '$selectedTickets' },
      {
        $group: {
          _id: '$eventId',
          count: { $sum: '$selectedTickets.numberOfSelectedTickets' },
        },
      },
    ]);

    const bookingCountMap = new Map<string, number>();
    for (const b of bookingCounts) {
      bookingCountMap.set(b._id.toString(), b.count);
    }

    // Transform to calendar events
    return events.map((event) => {
      const experience = experienceMap.get(event.experienceId.toString());
      const tickets = experience?.ticket || [];
      const maxCapacity = tickets.reduce((sum, t) => sum + (t.ticketQty || 0), 0);
      const bookingCount = bookingCountMap.get(event._id.toString()) || 0;

      return {
        id: event._id.toString(),
        title: experience?.experienceTitle || 'Untitled Experience',
        type: 'experience' as const,
        startTime: event.startTime,
        endTime: event.endTime,
        serviceId: event.experienceId.toString(),
        serviceName: experience?.experienceTitle || 'Untitled Experience',
        bookingCount,
        maxCapacity,
        bookingStatus: calculateBookingStatus(bookingCount, maxCapacity),
        status: event.status,
      };
    });
  }

  /**
   * Get detailed experience event with bookings
   */
  private async getExperienceEventDetails(
    hubId: string,
    eventId: string,
  ): Promise<CalendarEventDetail | null> {
    // Fetch event
    const event = await ExperienceEvent.findById(eventId).lean();
    if (!event) {
      return null;
    }

    // Fetch experience
    const experience = await Experience.findById(event.experienceId).lean();
    if (!experience) {
      return null;
    }

    // Verify hub ownership
    const experienceHubId = experience.hubId?.toString() ?? '';
    if (experienceHubId !== hubId) {
      return null;
    }

    // Fetch bookings for this event
    const bookings = await Booking.find({
      eventId: new mongoose.Types.ObjectId(eventId),
      bookingType: BookingType.EXPERIENCE,
      status: { $in: [BookingStatus.ACTIVE, BookingStatus.COMPLETED, BookingStatus.PENDING] },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Calculate stats
    const tickets = experience.ticket || [];
    const maxCapacity = tickets.reduce((sum, t) => sum + (t.ticketQty || 0), 0);
    let totalLearners = 0;
    let totalRevenue = 0;

    const bookingSummaries: CalendarBookingSummary[] = bookings.map((booking) => {
      const learnerCount = booking.learnerDetail?.length || 0;
      totalLearners += learnerCount;
      totalRevenue += booking.totalCost || 0;

      const primaryLearner = booking.learnerDetail?.[0];

      return {
        id: booking._id.toString(),
        learner: {
          name: primaryLearner?.name || 'Unknown',
          email: primaryLearner?.email || '',
          phone: primaryLearner?.phone || booking.phoneNumber,
        },
        ticketDetails: (booking.selectedTickets || []).map((t) => ({
          ticketName: t.ticketName,
          quantity: t.numberOfSelectedTickets,
          price: t.standardRate,
        })),
        totalCost: booking.totalCost,
        status: booking.status,
        createdAt: booking.createdAt,
      };
    });

    const bookingCount = bookingSummaries.reduce(
      (sum: number, b) =>
        sum + b.ticketDetails.reduce((s: number, t: { quantity: number }) => s + t.quantity, 0),
      0,
    );

    return {
      event: {
        id: event._id.toString(),
        title: experience.experienceTitle || 'Untitled Experience',
        type: 'experience',
        startTime: event.startTime,
        endTime: event.endTime,
        serviceId: experience._id.toString(),
        serviceName: experience.experienceTitle || 'Untitled Experience',
        bookingCount,
        maxCapacity,
        bookingStatus: calculateBookingStatus(bookingCount, maxCapacity),
        status: event.status,
        experienceType: experience.experienceType || '',
        location: experience.location
          ? {
              address: experience.location.address,
              city: experience.location.city,
              country: experience.location.country,
            }
          : undefined,
        coverPhoto: experience.coverPhoto,
        hostDetails: experience.hostDetails?.map((h) => ({
          fullName: h.name,
          profileUrl: h.photoUrl,
        })),
        tickets: tickets.map((t) => ({
          id: t._id?.toString() || '',
          ticketName: t.ticketName || '',
          ticketPrice: t.ticketPrice || 0,
          ticketQty: t.ticketQty || 0,
        })),
      },
      bookings: bookingSummaries,
      stats: {
        totalBookings: bookings.length,
        totalLearners,
        totalRevenue,
      },
    };
  }

  // ============================================================================
  // Private Methods - Expertise Events
  // ============================================================================

  /**
   * Fetch expertise bookings as calendar events
   * Expertise doesn't have events - bookings ARE the events
   */
  private async fetchExpertiseEvents(
    hubId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEventSummary[]> {
    // Fetch expertise bookings in date range
    const bookings = await Booking.find({
      hubId: mongoose.isValidObjectId(hubId) ? new mongoose.Types.ObjectId(hubId) : hubId,
      bookingType: BookingType.EXPERTISE,
      status: { $in: [BookingStatus.ACTIVE, BookingStatus.COMPLETED, BookingStatus.PENDING] },
      bookingStartDate: { $gte: startDate, $lte: endDate },
    })
      .sort({ bookingStartDate: 1 })
      .lean();

    if (bookings.length === 0) {
      return [];
    }

    // Get unique expertise IDs
    const expertiseIds = [...new Set(bookings.map((b) => b.serviceId.toString()))];
    const expertises = await Expertise.find({
      _id: { $in: expertiseIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .select('_id expertiseTitle coverPhoto')
      .lean();

    const expertiseMap = new Map(expertises.map((e) => [e._id.toString(), e]));

    // Transform to calendar events
    return bookings.map((booking) => {
      const expertise = expertiseMap.get(booking.serviceId.toString());

      return {
        id: booking._id.toString(),
        title: expertise?.expertiseTitle || 'Expertise Session',
        type: 'expertise' as const,
        startTime: booking.bookingStartDate,
        endTime: booking.bookingEndDate,
        serviceId: booking.serviceId.toString(),
        serviceName: expertise?.expertiseTitle || 'Expertise Session',
        bookingCount: 1, // Expertise is 1:1
        maxCapacity: 1,
        bookingStatus: 'fully-booked' as const,
        status: booking.status,
      };
    });
  }

  /**
   * Get detailed expertise event (booking) with info
   */
  private async getExpertiseEventDetails(
    hubId: string,
    bookingId: string,
  ): Promise<CalendarEventDetail | null> {
    // Fetch booking
    const booking = await Booking.findById(bookingId).lean();
    if (!booking) {
      return null;
    }

    // Verify hub ownership
    const bookingHubId = booking.hubId?.toString() ?? '';
    if (bookingHubId !== hubId) {
      return null;
    }

    // Fetch expertise
    const expertise = await Expertise.findById(booking.serviceId).lean();
    if (!expertise) {
      return null;
    }

    const primaryLearner = booking.learnerDetail?.[0];
    const selectedTicket = booking.selectedTickets?.[0];

    const bookingSummary: CalendarBookingSummary = {
      id: booking._id.toString(),
      learner: {
        name: primaryLearner?.name || 'Unknown',
        email: primaryLearner?.email || '',
        phone: primaryLearner?.phone || booking.phoneNumber,
      },
      ticketDetails: (booking.selectedTickets || []).map((t) => ({
        ticketName: t.ticketName,
        quantity: t.numberOfSelectedTickets,
        price: t.standardRate,
      })),
      totalCost: booking.totalCost,
      status: booking.status,
      createdAt: booking.createdAt,
    };

    return {
      event: {
        id: booking._id.toString(),
        title: expertise.expertiseTitle || 'Expertise Session',
        type: 'expertise',
        startTime: booking.bookingStartDate,
        endTime: booking.bookingEndDate,
        serviceId: expertise._id.toString(),
        serviceName: expertise.expertiseTitle || 'Expertise Session',
        bookingCount: 1,
        maxCapacity: 1,
        bookingStatus: 'fully-booked',
        status: booking.status,
        expertiseMode: selectedTicket?.expertiseMode,
        location: expertise.location
          ? {
              address: expertise.location.address,
              city: expertise.location.city,
              country: expertise.location.country,
            }
          : undefined,
        coverPhoto: expertise.coverPhoto,
        host: expertise.host
          ? {
              name: expertise.host.name,
              profileUrl: expertise.host.profileUrl,
            }
          : undefined,
        ticket: selectedTicket
          ? {
              ticketName: selectedTicket.ticketName,
              standardRate: selectedTicket.standardRate,
              sessionDuration: selectedTicket.sessionDuration
                ? Number.parseInt(selectedTicket.sessionDuration, 10)
                : undefined,
            }
          : undefined,
      },
      bookings: [bookingSummary],
      stats: {
        totalBookings: 1,
        totalLearners: booking.learnerDetail?.length || 1,
        totalRevenue: booking.totalCost || 0,
      },
    };
  }
}

export const hubCalendarService = new HubCalendarService();
