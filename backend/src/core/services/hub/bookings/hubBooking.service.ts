import {
  Booking,
  BookingStatus,
  BookingType,
  DisputeStatus,
  StripePaymentStatus,
} from '@core/models/Booking';
import { BookingReview, BookingReviewStatus } from '@core/models/BookingReview';
import { Experience } from '@core/models/Experience';
import { ExperienceEvent } from '@core/models/ExperienceEvent';
import { Expertise } from '@core/models/Expertise';
import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import { conversationTriggerService } from '@core/services/shared/chat';
import { communicationTriggerService } from '@services/communications';
import mongoose from 'mongoose';

/**
 * Hub booking list params (for all bookings)
 */
export interface HubListAllBookingsParams {
  hubId: string;
  serviceType?: 'experience' | 'expertise' | 'all';
  status?: 'upcoming' | 'past' | 'cancelled' | 'all';
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  grouped?: boolean;
}

/**
 * Hub booking list params (for experience bookings)
 */
export interface HubListBookingsParams {
  hubId: string;
  experienceId?: string;
  eventId?: string;
  status?: 'upcoming' | 'past' | 'cancelled' | 'all';
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Update booking status params
 */
export interface HubUpdateBookingStatusParams {
  hubId: string;
  bookingId: string;
  status: 'active' | 'cancelled' | 'rejected';
  reason?: string;
}

/**
 * Export bookings params
 */
export interface HubExportBookingsParams {
  hubId: string;
  serviceType?: 'experience' | 'expertise' | 'all';
  status?: 'upcoming' | 'past' | 'cancelled' | 'all';
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Create booking params (for manual hub booking)
 */
export interface HubCreateBookingParams {
  hubId: string;
  userId: string;
  serviceType: 'experience' | 'expertise';
  serviceId: string;
  eventId?: string; // MongoDB ObjectId for experiences, slot identifier for expertise (e.g., "2025-12-26-09:30")
  slotDate?: string; // For expertise: YYYY-MM-DD
  slotTime?: string; // For expertise: HH:mm
  learners: Array<{
    name: string;
    email: string;
    phone: string;
    ticketId?: string;
  }>;
}

/**
 * Booking item for hub listing
 */
export interface HubBookingItem {
  _id: string;
  bookingType: string;
  serviceName: string;
  serviceId: string;
  eventId?: string;
  bookingStartDate: Date;
  bookingEndDate: Date;
  status: string;
  totalCost: number;
  currency: string;
  isFree: boolean;
  ticketCount: number;
  learners: Array<{
    name: string;
    email: string;
    ticketName?: string;
    ticketType?: string;
  }>;
  bookerName: string;
  bookerEmail: string;
  hub?: {
    _id: string;
    name: string;
    slug?: string;
    logo?: string;
  };
  review?: {
    _id: string;
    rating: number;
    content: string;
    photos?: string[];
    createdAt: string;
    hubReply?: {
      content: string;
      createdAt: string;
    };
  };
  createdAt: Date;
}

/**
 * Extended booking item for list all bookings (includes service details)
 */
export interface HubBookingListItem {
  _id: string;
  bookingType: 'experience' | 'expertise';
  service: {
    _id: string;
    title: string;
    coverPhoto?: string;
    type?: string; // Physical/Virtual/Online/Hybrid
  };
  host?: {
    name: string;
    profileUrl?: string;
  };
  eventId?: string;
  scheduleId?: string;
  bookingStartDate: Date;
  bookingEndDate: Date;
  timeZone?: string;
  status: string;
  totalCost: number;
  currency: string;
  isFree: boolean;
  learnerDetail: Array<{
    id: number;
    name: string;
    email: string;
    phone?: string;
    ticketId?: string;
    ticketName?: string;
    isBooker?: boolean;
    attendance?: boolean;
  }>;
  selectedTickets: Array<{
    id: string;
    ticketName: string;
    ticketType: string;
    numberOfSelectedTickets: number;
    standardRate: number;
  }>;
  bookedSeats: number;
  totalSeats: number;
  bookingPercentage: number;
  bookingStatus:
    | 'no-bookings'
    | 'low-bookings'
    | 'partially-booked'
    | 'mostly-booked'
    | 'fully-booked';
  lastBooked?: Date;
  createdAt: Date;
}

/**
 * Hub Booking Service
 * Handles hub-level booking operations for experience/expertise
 */
export class HubBookingService {
  /**
   * List bookings for a hub's experience with optional event filter
   */
  async listExperienceBookings(params: HubListBookingsParams): Promise<{
    bookings: HubBookingItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { hubId, experienceId, eventId, status = 'all', page = 1, limit = 20, search } = params;
    const now = new Date();

    // Build match stage
    const matchStage: Record<string, unknown> = {
      hubId: new mongoose.Types.ObjectId(hubId),
      bookingType: BookingType.EXPERIENCE,
    };

    // Filter by experience
    if (experienceId) {
      matchStage.serviceId = new mongoose.Types.ObjectId(experienceId);
    }

    // Filter by specific event
    if (eventId) {
      matchStage.eventId = new mongoose.Types.ObjectId(eventId);
    }

    // Filter by status
    if (status === 'upcoming') {
      matchStage.bookingStartDate = { $gte: now };
      matchStage.status = { $in: [BookingStatus.ACTIVE, BookingStatus.PENDING] };
    } else if (status === 'past') {
      matchStage.bookingEndDate = { $lt: now };
      matchStage.status = { $in: [BookingStatus.ACTIVE, BookingStatus.COMPLETED] };
    } else if (status === 'cancelled') {
      matchStage.status = {
        $in: [BookingStatus.CANCELLED, BookingStatus.WITHDRAWN, BookingStatus.REJECTED],
      };
    } else {
      // 'all' - exclude deleted but show all statuses
      matchStage.status = { $ne: BookingStatus.EXPIRED };
    }

    // Search filter
    if (search) {
      matchStage.$or = [
        { 'learnerDetail.name': { $regex: search, $options: 'i' } },
        { 'learnerDetail.email': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    // Build aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },
      { $sort: { bookingStartDate: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Lookup experience for service name
      {
        $lookup: {
          from: 'experiences',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'experience',
        },
      },
      { $unwind: { path: '$experience', preserveNullAndEmptyArrays: true } },
      // Project the fields we need
      {
        $project: {
          _id: 1,
          bookingType: 1,
          serviceName: { $ifNull: ['$experience.experienceTitle', 'Unknown Experience'] },
          serviceId: 1,
          eventId: 1,
          bookingStartDate: 1,
          bookingEndDate: 1,
          status: 1,
          totalCost: 1,
          currency: 1,
          isFree: 1,
          learnerDetail: 1,
          selectedTickets: 1,
          createdAt: 1,
        },
      },
    ];

    const [bookings, totalResult] = await Promise.all([
      Booking.aggregate(pipeline),
      Booking.countDocuments(matchStage),
    ]);

    // Transform bookings to response format
    const transformedBookings: HubBookingItem[] = bookings.map((b) => {
      const learners = (b.learnerDetail || []).map(
        (l: { name: string; email: string; ticketName?: string; ticketType?: string }) => ({
          name: l.name,
          email: l.email,
          ticketName: l.ticketName,
          ticketType: l.ticketType,
        }),
      );

      const booker =
        b.learnerDetail?.find((l: { isBooker?: boolean }) => l.isBooker) || b.learnerDetail?.[0];
      const ticketCount = (b.selectedTickets || []).reduce(
        (sum: number, t: { numberOfSelectedTickets: number }) =>
          sum + (t.numberOfSelectedTickets || 0),
        0,
      );

      return {
        _id: b._id.toString(),
        bookingType: b.bookingType,
        serviceName: b.serviceName,
        serviceId: b.serviceId.toString(),
        eventId: b.eventId?.toString(),
        bookingStartDate: b.bookingStartDate,
        bookingEndDate: b.bookingEndDate,
        status: b.status,
        totalCost: b.totalCost || 0,
        currency: b.currency || 'MYR',
        isFree: b.isFree || false,
        ticketCount,
        learners,
        bookerName: booker?.name || 'Unknown',
        bookerEmail: booker?.email || '',
        createdAt: b.createdAt,
      };
    });

    return {
      bookings: transformedBookings,
      total: totalResult,
      page,
      limit,
      totalPages: Math.ceil(totalResult / limit),
    };
  }

  /**
   * Get a single booking by ID for hub
   * Includes learner review if available
   */
  async getBookingById(hubId: string, bookingId: string): Promise<HubBookingItem | null> {
    const booking = await Booking.findOne({
      _id: new mongoose.Types.ObjectId(bookingId),
      hubId: new mongoose.Types.ObjectId(hubId),
    }).lean();

    if (!booking) return null;

    // Get experience/expertise name, hub, and review in parallel
    let serviceName = 'Unknown';
    const [experience, expertise, hub, review] = await Promise.all([
      booking.bookingType === BookingType.EXPERIENCE
        ? Experience.findById(booking.serviceId).select('experienceTitle').lean()
        : null,
      booking.bookingType === BookingType.EXPERTISE
        ? Expertise.findById(booking.serviceId).select('expertiseTitle').lean()
        : null,
      Hub.findById(hubId).select('name slug logo').lean(),
      BookingReview.findOne({
        bookingId: booking._id,
        status: BookingReviewStatus.ACTIVE,
      }).lean(),
    ]);

    if (experience) {
      serviceName = experience.experienceTitle || 'Unknown Experience';
    } else if (expertise) {
      serviceName = expertise.expertiseTitle || 'Unknown Expertise';
    }

    const learners = (booking.learnerDetail || []).map((l) => ({
      name: l.name,
      email: l.email,
      ticketName: l.ticketName,
      ticketType: l.ticketType,
    }));

    const booker = booking.learnerDetail?.find((l) => l.isBooker) || booking.learnerDetail?.[0];
    const ticketCount = (booking.selectedTickets || []).reduce(
      (sum, t) => sum + (t.numberOfSelectedTickets || 0),
      0,
    );

    // Build review response if exists
    let reviewData:
      | {
          _id: string;
          rating: number;
          content: string;
          photos?: string[];
          createdAt: string;
          hubReply?: { content: string; createdAt: string };
        }
      | undefined;

    if (review) {
      reviewData = {
        _id: review._id.toString(),
        rating: review.rating,
        content: review.content,
        photos: review.photos,
        createdAt: review.createdAt.toISOString(),
        hubReply: review.hubReply
          ? {
              content: review.hubReply.content,
              createdAt: review.hubReply.createdAt.toISOString(),
            }
          : undefined,
      };
    }

    return {
      _id: booking._id.toString(),
      bookingType: booking.bookingType,
      serviceName,
      serviceId: booking.serviceId.toString(),
      eventId: booking.eventId?.toString(),
      bookingStartDate: booking.bookingStartDate,
      bookingEndDate: booking.bookingEndDate,
      status: booking.status,
      totalCost: booking.totalCost || 0,
      currency: booking.currency || 'MYR',
      isFree: booking.isFree || false,
      ticketCount,
      learners,
      bookerName: booker?.name || 'Unknown',
      bookerEmail: booker?.email || '',
      hub: hub
        ? {
            _id: hub._id.toString(),
            name: hub.name || 'Unknown Hub',
            slug: hub.slug,
            logo: hub.logo,
          }
        : undefined,
      review: reviewData,
      createdAt: booking.createdAt,
    };
  }

  /**
   * List all bookings for a hub (experiences + expertise)
   */
  async listAllBookings(params: HubListAllBookingsParams): Promise<{
    bookings: HubBookingListItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const {
      hubId,
      serviceType = 'all',
      status = 'upcoming',
      page = 1,
      limit = 20,
      search,
      dateFrom,
      dateTo,
    } = params;
    const now = new Date();

    // Build match stage
    const matchStage: Record<string, unknown> = {
      hubId: new mongoose.Types.ObjectId(hubId),
    };

    // Filter by service type
    if (serviceType === 'experience') {
      matchStage.bookingType = BookingType.EXPERIENCE;
    } else if (serviceType === 'expertise') {
      matchStage.bookingType = BookingType.EXPERTISE;
    } else {
      matchStage.bookingType = { $in: [BookingType.EXPERIENCE, BookingType.EXPERTISE] };
    }

    // Filter by status
    if (status === 'upcoming') {
      matchStage.bookingStartDate = { $gte: now };
      matchStage.status = { $in: [BookingStatus.ACTIVE, BookingStatus.PENDING] };
    } else if (status === 'past') {
      matchStage.bookingEndDate = { $lt: now };
      matchStage.status = { $in: [BookingStatus.ACTIVE, BookingStatus.COMPLETED] };
    } else if (status === 'cancelled') {
      matchStage.status = {
        $in: [BookingStatus.CANCELLED, BookingStatus.WITHDRAWN, BookingStatus.REJECTED],
      };
    } else {
      matchStage.status = { $ne: BookingStatus.EXPIRED };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      const existingDateFilter =
        typeof matchStage.bookingStartDate === 'object' ? matchStage.bookingStartDate : {};
      const dateFilter: Record<string, unknown> = { ...existingDateFilter };
      if (dateFrom) {
        dateFilter.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.$lte = toDate;
      }
      matchStage.bookingStartDate = dateFilter;
    }

    // Search filter
    if (search) {
      matchStage.$or = [
        { 'learnerDetail.name': { $regex: search, $options: 'i' } },
        { 'learnerDetail.email': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    // Aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },
      { $sort: { bookingStartDate: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      // Lookup experience
      {
        $lookup: {
          from: 'experiences',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'experience',
        },
      },
      // Lookup expertise
      {
        $lookup: {
          from: 'expertises',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'expertise',
        },
      },
      // Project fields
      {
        $project: {
          _id: 1,
          bookingType: 1,
          serviceId: 1,
          eventId: 1,
          scheduleId: 1,
          bookingStartDate: 1,
          bookingEndDate: 1,
          timeZone: 1,
          status: 1,
          totalCost: 1,
          currency: 1,
          isFree: 1,
          learnerDetail: 1,
          selectedTickets: 1,
          createdAt: 1,
          experience: { $arrayElemAt: ['$experience', 0] },
          expertise: { $arrayElemAt: ['$expertise', 0] },
        },
      },
    ];

    const [bookings, totalResult] = await Promise.all([
      Booking.aggregate(pipeline),
      Booking.countDocuments(matchStage),
    ]);

    // Transform bookings
    const transformedBookings: HubBookingListItem[] = bookings.map((b) => {
      const isExperience = b.bookingType === BookingType.EXPERIENCE;
      const service = isExperience ? b.experience : b.expertise;

      // Calculate booked seats
      const bookedSeats = (b.selectedTickets || []).reduce(
        (sum: number, t: { numberOfSelectedTickets?: number }) =>
          sum + (t.numberOfSelectedTickets || 0),
        0,
      );

      // Get total seats from service tickets
      const totalSeats = this.getTotalSeats(service);
      const bookingPercentage = totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0;
      const bookingStatus = this.getBookingStatus(bookingPercentage, b.status);

      return {
        _id: b._id.toString(),
        bookingType: b.bookingType as 'experience' | 'expertise',
        service: {
          _id: b.serviceId.toString(),
          title: isExperience
            ? service?.experienceTitle || 'Unknown Experience'
            : service?.expertiseTitle || 'Unknown Expertise',
          coverPhoto: service?.coverPhoto,
          type: isExperience ? service?.experienceType : service?.expertiseMode,
        },
        host: service?.host
          ? {
              name: service.host.name || 'Unknown',
              profileUrl: service.host.profileUrl,
            }
          : undefined,
        eventId: b.eventId?.toString(),
        scheduleId: b.scheduleId,
        bookingStartDate: b.bookingStartDate,
        bookingEndDate: b.bookingEndDate,
        timeZone: b.timeZone,
        status: b.status,
        totalCost: b.totalCost || 0,
        currency: b.currency || 'MYR',
        isFree: b.isFree || false,
        learnerDetail: b.learnerDetail || [],
        selectedTickets: b.selectedTickets || [],
        bookedSeats,
        totalSeats,
        bookingPercentage,
        bookingStatus,
        lastBooked: b.createdAt,
        createdAt: b.createdAt,
      };
    });

    return {
      bookings: transformedBookings,
      pagination: {
        page,
        limit,
        total: totalResult,
        totalPages: Math.ceil(totalResult / limit),
      },
    };
  }

  /**
   * Update booking status (approve/reject/cancel)
   */
  async updateBookingStatus(params: HubUpdateBookingStatusParams): Promise<{
    _id: string;
    status: string;
    updatedAt: Date;
  }> {
    const { hubId, bookingId, status, reason } = params;

    const booking = await Booking.findOne({
      _id: new mongoose.Types.ObjectId(bookingId),
      hubId: new mongoose.Types.ObjectId(hubId),
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    // Validate status transition
    const currentStatus = booking.status;
    if (status === 'active' && currentStatus !== BookingStatus.PENDING) {
      throw new Error('Can only approve pending bookings');
    }
    if (
      (status === 'cancelled' || status === 'rejected') &&
      ![BookingStatus.PENDING, BookingStatus.ACTIVE].includes(currentStatus as BookingStatus)
    ) {
      throw new Error('Can only cancel/reject pending or active bookings');
    }

    // Update booking
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'cancelled' || status === 'rejected') {
      updateData.cancelledDate = new Date();
      updateData.cancelledBy = 'hub';
      if (reason) {
        updateData.cancellationReason = reason;
      }
    }

    const updated = await Booking.findByIdAndUpdate(bookingId, updateData, { new: true }).lean();

    if (!updated) {
      throw new Error('Failed to update booking');
    }

    // Send status change notifications (non-blocking)
    void this.sendBookingStatusNotification(updated, status, reason);

    return {
      _id: String(updated._id),
      status: updated.status,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Send booking status change notification to learner
   */
  private async sendBookingStatusNotification(
    booking: typeof Booking.prototype,
    newStatus: string,
    reason?: string,
  ): Promise<void> {
    try {
      if (!booking.bookedBy) return;

      const [user, hub, experience, expertise] = await Promise.all([
        User.findById(booking.bookedBy).select('name email phone').lean(),
        booking.hubId ? Hub.findById(booking.hubId).select('name').lean() : null,
        booking.bookingType === BookingType.EXPERIENCE && booking.serviceId
          ? Experience.findById(booking.serviceId).select('experienceTitle').lean()
          : null,
        booking.bookingType === BookingType.EXPERTISE && booking.serviceId
          ? Expertise.findById(booking.serviceId).select('expertiseTitle').lean()
          : null,
      ]);

      if (!user) return;

      const experienceName =
        experience?.experienceTitle || expertise?.expertiseTitle || 'Unknown Service';
      const hubName = hub?.name || 'The host';

      // Format booking date for notifications
      const bookingDate = booking.bookingStartDate
        ? booking.bookingStartDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '';

      let templateId: string;
      switch (newStatus) {
        case 'active':
          templateId = 'BOOKING_APPROVED';
          break;
        case 'rejected':
          templateId = 'BOOKING_REJECTED';
          break;
        case 'cancelled':
          templateId = 'BOOKING_CANCELLED_BY_HOST';
          break;
        default:
          return;
      }

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId,
        user: {
          _id: booking.bookedBy.toString(),
          name: user.name,
          email: user.email,
          phone: user.phoneNumber,
        },
        hubId: booking.hubId?.toString(),
        data: {
          userName: user.name,
          userEmail: user.email,
          userPhone: user.phoneNumber,
          experienceName,
          hubName,
          bookingDate,
          bookingId: booking._id?.toString(),
          rejectReason: reason || '',
          cancellationReason: reason || '',
          refundInfo: newStatus === 'cancelled' ? 'Refund will be processed if applicable.' : '',
        },
      });
    } catch (error) {
      console.error('Failed to send booking status notification:', error);
    }
  }

  /**
   * Export bookings as CSV data
   */
  async exportBookings(params: HubExportBookingsParams): Promise<{
    headers: string[];
    rows: string[][];
    filename: string;
  }> {
    const { hubId, serviceType = 'all', status = 'all', dateFrom, dateTo } = params;

    // Get bookings without pagination
    const result = await this.listAllBookings({
      hubId,
      serviceType,
      status,
      dateFrom,
      dateTo,
      page: 1,
      limit: 10000, // Export all
    });

    const headers = [
      'Booking ID',
      'Service Type',
      'Service Name',
      'Booking Date',
      'Booking Time',
      'Status',
      'Learner Name',
      'Learner Email',
      'Learner Phone',
      'Tickets',
      'Total Cost',
      'Currency',
      'Created At',
    ];

    const rows: string[][] = [];

    for (const booking of result.bookings) {
      for (const learner of booking.learnerDetail) {
        rows.push([
          booking._id,
          booking.bookingType,
          booking.service.title,
          new Date(booking.bookingStartDate).toLocaleDateString(),
          new Date(booking.bookingStartDate).toLocaleTimeString(),
          booking.status,
          learner.name,
          learner.email,
          learner.phone || '',
          learner.ticketName || '',
          booking.totalCost.toString(),
          booking.currency,
          new Date(booking.createdAt).toISOString(),
        ]);
      }
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `bookings-${status}-${dateStr}.csv`;

    return { headers, rows, filename };
  }

  /**
   * Create a manual booking by hub admin
   */
  async createBooking(params: HubCreateBookingParams): Promise<{
    _id: string;
    bookingType: string;
    status: string;
    createdAt: Date;
  }> {
    const { hubId, userId, serviceType, serviceId, eventId, slotDate, slotTime, learners } = params;

    // Event ticket type helper
    type EventTicket = {
      id?: string;
      _id?: mongoose.Types.ObjectId;
      ticketName?: string;
      ticketType?: string;
      standardRate?: number;
      sessionDuration?: number;
      durationUnit?: string;
    };

    // Validate service exists
    let eventTickets: EventTicket[] = [];
    let bookingStartDate: Date;
    let bookingEndDate: Date;
    let timeZone = 'Asia/Kuala_Lumpur';

    if (serviceType === 'experience') {
      const experience = await Experience.findOne({
        _id: new mongoose.Types.ObjectId(serviceId),
        hubId: new mongoose.Types.ObjectId(hubId),
      })
        .select('_id timeZone')
        .lean();

      if (!experience) {
        throw new Error('Experience not found');
      }

      timeZone = (experience as unknown as { timeZone?: string }).timeZone || 'Asia/Kuala_Lumpur';

      // For experience, event is required
      if (!eventId) {
        throw new Error('Event ID is required for experience bookings');
      }

      const experienceEvent = await ExperienceEvent.findOne({
        _id: new mongoose.Types.ObjectId(eventId),
        experienceId: new mongoose.Types.ObjectId(serviceId),
      })
        .select('_id startTime endTime ticket')
        .lean();

      if (!experienceEvent) {
        throw new Error('Event not found');
      }

      bookingStartDate = experienceEvent.startTime;
      bookingEndDate = experienceEvent.endTime;
      eventTickets = (experienceEvent as unknown as { ticket?: EventTicket[] }).ticket || [];
    } else {
      // expertise
      const expertise = await Expertise.findOne({
        _id: new mongoose.Types.ObjectId(serviceId),
        hubId: new mongoose.Types.ObjectId(hubId),
      })
        .select('_id timeZone ticket')
        .lean();

      if (!expertise) {
        throw new Error('Expertise not found');
      }

      timeZone = (expertise as unknown as { timeZone?: string }).timeZone || 'Asia/Kuala_Lumpur';
      eventTickets = ((expertise as unknown as { ticket?: EventTicket[] }).ticket || []).map(
        (t) => ({
          ...t,
          id: t._id?.toString(),
        }),
      );

      // Parse slot date/time from eventId or separate fields
      let parsedDate: string | undefined;
      let parsedTime: string | undefined;

      if (slotDate && slotTime) {
        parsedDate = slotDate;
        parsedTime = slotTime;
      } else if (eventId) {
        // Parse from eventId format: "YYYY-MM-DD-HH:mm"
        const parts = eventId.split('-');
        if (parts.length >= 4) {
          parsedDate = `${parts[0]}-${parts[1]}-${parts[2]}`;
          parsedTime = parts[3];
        } else {
          throw new Error('Invalid slot format. Expected YYYY-MM-DD-HH:mm');
        }
      }

      if (!parsedDate || !parsedTime) {
        throw new Error('Slot date/time is required for expertise bookings');
      }

      // Create booking start date from slot
      const dateParts = parsedDate.split('-').map(Number);
      const timeParts = parsedTime.split(':').map(Number);
      const year = dateParts[0] ?? 2025;
      const month = dateParts[1] ?? 1;
      const day = dateParts[2] ?? 1;
      const hours = timeParts[0] ?? 0;
      const minutes = timeParts[1] ?? 0;
      bookingStartDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

      // Calculate end time based on ticket duration
      const firstLearnerTicketId = learners[0]?.ticketId;
      const matchingTicket = eventTickets.find(
        (t) => t.id === firstLearnerTicketId || t._id?.toString() === firstLearnerTicketId,
      );
      let durationMins = matchingTicket?.sessionDuration || 60;
      if (matchingTicket?.durationUnit === 'hours') {
        durationMins = durationMins * 60;
      }
      bookingEndDate = new Date(bookingStartDate.getTime() + durationMins * 60 * 1000);
    }

    // Build learner details
    const learnerDetail = learners.map((l, index) => {
      // Find matching ticket from event if available
      let ticketInfo: { ticketName?: string; ticketType?: string } = {};
      if (eventTickets.length > 0 && l.ticketId) {
        const matchingTicket = eventTickets.find((t) => t.id === l.ticketId);
        if (matchingTicket) {
          ticketInfo = {
            ticketName: matchingTicket.ticketName,
            ticketType: matchingTicket.ticketType,
          };
        }
      }

      return {
        id: index + 1,
        name: l.name,
        email: l.email,
        phone: l.phone,
        ticketId: l.ticketId,
        ticketName: ticketInfo.ticketName,
        ticketType: ticketInfo.ticketType,
        isBooker: index === 0, // First learner is the booker
      };
    });

    // Build selected tickets summary
    const ticketCounts: Record<string, number> = {};
    for (const l of learners) {
      if (l.ticketId) {
        ticketCounts[l.ticketId] = (ticketCounts[l.ticketId] || 0) + 1;
      }
    }

    const selectedTickets = Object.entries(ticketCounts).map(([ticketId, count]) => {
      const matchingTicket = eventTickets.find((t) => t.id === ticketId);
      return {
        id: ticketId,
        numberOfSelectedTickets: count,
        standardRate: matchingTicket?.standardRate || 0,
        ticketName: matchingTicket?.ticketName || 'General Admission',
        ticketType: matchingTicket?.ticketType || 'adult',
      };
    });

    // If no specific tickets, create a default one
    if (selectedTickets.length === 0) {
      selectedTickets.push({
        id: 'default',
        numberOfSelectedTickets: learners.length,
        standardRate: 0,
        ticketName: 'General Admission',
        ticketType: 'adult',
      });
    }

    // Create booking
    const booking = new Booking({
      bookingType: serviceType === 'experience' ? BookingType.EXPERIENCE : BookingType.EXPERTISE,
      hubId: new mongoose.Types.ObjectId(hubId),
      serviceId: new mongoose.Types.ObjectId(serviceId),
      eventId: eventId ? new mongoose.Types.ObjectId(eventId) : undefined,
      bookedBy: new mongoose.Types.ObjectId(userId),
      bookingStartDate,
      bookingEndDate,
      timeZone,
      learnerDetail,
      selectedTickets,
      totalCost: 0,
      currency: 'MYR',
      isFree: true,
      status: BookingStatus.ACTIVE,
      stripeStatus: StripePaymentStatus.SUCCEEDED,
      disputeStatus: DisputeStatus.NONE,
      platformFee: 0,
      platformFeeRate: 0.15,
      stripeFee: 0,
      transferAmount: 0,
      addedByHub: new mongoose.Types.ObjectId(hubId),
      isBookingSuccessNotificationSentToExpert: true,
      isBookingSuccessNotificationSentToLearner: true,
    });

    await booking.save();

    // @spec: messaging-conversation-triggers_spec.md
    // @covers AC-CT-002, AC-CT-003, AC-CT-004, AC-CT-005, AC-CT-006
    // Create chat room for booking (non-blocking)
    void this.createBookingChatRoom(booking, serviceType, serviceId, hubId);

    // Send manual booking notifications (non-blocking)
    const firstLearner = learners[0];
    if (firstLearner) {
      void this.sendManualBookingNotifications(
        booking,
        serviceType,
        serviceId,
        hubId,
        firstLearner,
      );
    }

    return {
      _id: String(booking._id),
      bookingType: booking.bookingType,
      status: booking.status,
      createdAt: booking.createdAt,
    };
  }

  /**
   * Create chat room for a manual booking
   * @covers AC-CT-002, AC-CT-005
   */
  private async createBookingChatRoom(
    booking: typeof Booking.prototype,
    serviceType: string,
    serviceId: string,
    hubId: string,
  ): Promise<void> {
    try {
      if (!booking.bookedBy) return;

      // Get service name
      let serviceName = 'Booking';
      if (serviceType === 'experience') {
        const experience = await Experience.findById(serviceId).select('experienceTitle').lean();
        serviceName = experience?.experienceTitle || 'Experience Booking';
      } else if (serviceType === 'expertise') {
        const expertise = await Expertise.findById(serviceId).select('expertiseTitle').lean();
        serviceName = expertise?.expertiseTitle || 'Expertise Booking';
      }

      await conversationTriggerService.createBookingRoom({
        bookingId: booking._id as mongoose.Types.ObjectId,
        hubId: new mongoose.Types.ObjectId(hubId),
        learnerId: booking.bookedBy,
        serviceId: new mongoose.Types.ObjectId(serviceId),
        serviceType: serviceType as 'experience' | 'expertise',
        serviceName,
        bookingDate: booking.bookingStartDate,
      });
    } catch (error) {
      // Log but don't fail the booking
      console.error('Failed to create chat room for hub booking:', error);
    }
  }

  /**
   * Send notifications for manual booking creation
   */
  private async sendManualBookingNotifications(
    booking: typeof Booking.prototype,
    serviceType: string,
    serviceId: string,
    hubId: string,
    firstLearner: { name: string; email: string; phone: string },
  ): Promise<void> {
    try {
      const [hub, experience, expertise] = await Promise.all([
        Hub.findById(hubId).select('name').lean(),
        serviceType === 'experience'
          ? Experience.findById(serviceId).select('experienceTitle hostDetails').lean()
          : null,
        serviceType === 'expertise'
          ? Expertise.findById(serviceId).select('expertiseTitle host').lean()
          : null,
      ]);

      const experienceName =
        experience?.experienceTitle || expertise?.expertiseTitle || 'Unknown Service';
      const hubName = hub?.name || 'The host';
      const bookingDate = booking.bookingStartDate?.toLocaleDateString() || '';
      const bookingTime = booking.bookingStartDate?.toLocaleTimeString() || '';

      // Send notification to learner (using email as identifier since they may not have an account)
      const user = await User.findOne({ email: firstLearner.email.toLowerCase() })
        .select('_id name email phoneNumber')
        .lean();

      if (user) {
        await communicationTriggerService.triggerCommunicationWithUser({
          templateId: 'MANUAL_BOOKING_CREATED_LEARNER',
          user: {
            _id: user._id.toString(),
            name: user.name || firstLearner.name,
            email: user.email,
            phone: user.phoneNumber,
          },
          hubId,
          data: {
            userName: user.name || firstLearner.name,
            userEmail: user.email,
            hubName,
            experienceName,
            bookingDate,
            bookingTime,
            bookingId: booking._id?.toString(),
          },
        });
      }

      // Send notification to expert/host if applicable
      // Experience uses hostDetails array, Expertise may have different structure
      const hostDetails = experience?.hostDetails?.[0];
      const expertiseHost =
        expertise && 'host' in expertise
          ? (expertise as { host?: { userId?: string } }).host
          : undefined;
      const host = hostDetails || expertiseHost;
      if (host && typeof host === 'object' && 'userId' in host && host.userId) {
        const expertUser = await User.findById(host.userId)
          .select('_id name email phoneNumber')
          .lean();
        if (expertUser) {
          await communicationTriggerService.triggerCommunicationWithUser({
            templateId: 'MANUAL_BOOKING_CREATED_EXPERT',
            user: {
              _id: expertUser._id.toString(),
              name: expertUser.name,
              email: expertUser.email,
              phone: expertUser.phoneNumber,
            },
            hubId,
            data: {
              userName: expertUser.name,
              userEmail: expertUser.email,
              learnerName: firstLearner.name,
              experienceName,
              bookingDate,
              bookingTime,
              bookingId: booking._id?.toString(),
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to send manual booking notifications:', error);
    }
  }

  /**
   * Get total seats from service tickets
   */
  private getTotalSeats(
    service: { ticket?: Array<{ maxSeats?: number; quantity?: number }> } | null,
  ): number {
    if (!service?.ticket) return 0;
    // Sum up max seats from all tickets
    return service.ticket.reduce((sum, t) => sum + (t.maxSeats || t.quantity || 10), 0);
  }

  /**
   * Calculate booking status based on percentage
   */
  private getBookingStatus(
    percentage: number,
    status: string,
  ): 'no-bookings' | 'low-bookings' | 'partially-booked' | 'mostly-booked' | 'fully-booked' {
    if (
      status === BookingStatus.CANCELLED ||
      status === BookingStatus.WITHDRAWN ||
      status === BookingStatus.REJECTED
    ) {
      return 'no-bookings';
    }
    if (percentage === 0) return 'no-bookings';
    if (percentage <= 50) return 'low-bookings';
    if (percentage <= 80) return 'partially-booked';
    if (percentage < 100) return 'mostly-booked';
    return 'fully-booked';
  }
}

export const hubBookingService = new HubBookingService();
