import { Booking, BookingStatus, BookingType } from '@core/models/Booking';
import { BookingReview, BookingReviewStatus } from '@core/models/BookingReview';
import { Experience } from '@core/models/Experience';
import { Expertise } from '@core/models/Expertise';
import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import type { UserBookingResponse, UserBookingsQuery, UserBookingTicket } from '@schemas/web';
import { communicationTriggerService } from '@services/communications';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

// ============================================================================
// Detailed Booking Response Types (for single booking view)
// ============================================================================

export interface BookingDetailTicket {
  ticketId: string;
  ticketName: string;
  quantity: number;
  standardRate: number;
  totalPrice: number;
  sessionDuration?: string;
  guests?: Array<{ name: string; email: string; phone?: string }>;
}

export interface BookingDetailLocation {
  streetAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
}

export interface BookingDetailReview {
  _id: string;
  rating: number;
  content: string;
  photos?: string[];
  createdAt: string;
  updatedAt: string;
  hubReply?: {
    content: string;
    createdAt: string;
  };
}

export interface BookingDetailHub {
  _id: string;
  name: string;
  slug?: string;
  logo?: string;
}

export interface BookingDetailResponse {
  _id: string;
  confirmationCode?: string;
  serviceId: string;
  serviceType: 'experience' | 'expertise' | 'space';
  serviceTitle: string;
  serviceCover?: string;
  serviceSlug?: string;
  experienceType?: 'Online' | 'Physical' | 'Hybrid';

  hubId: string;
  hub: BookingDetailHub;

  hostName?: string;
  hostDetails?: Array<{ fullName: string; profileImage?: string }>;

  bookingStartDate: string;
  bookingEndDate: string;
  timeZone?: string;

  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  cancelledBy?: 'learner' | 'hub';
  cancellationReason?: string;
  cancelledDate?: string;

  selectedTickets: BookingDetailTicket[];

  bookerName: string;
  bookerEmail: string;
  phoneNumber?: string;

  totalCost: number;
  totalAmount: number;
  currency: string;
  serviceFee?: number;
  serviceFeePayBy?: 'learner' | 'hub';
  membershipDiscount?: number;
  membershipDiscountAmount?: number;
  promotionCode?: string;
  discountAmount?: number;
  isFree?: boolean;

  paymentMethod?: {
    type: 'card' | 'fpx' | 'grabpay';
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
  };

  refundAmount?: number;
  refundPercentage?: number;

  location?: BookingDetailLocation;
  review?: BookingDetailReview;

  createdAt: string;
  updatedAt: string;
}

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Map booking status to frontend status
 */
function mapBookingStatus(booking: {
  status: string;
  bookingStartDate: Date;
  bookingEndDate: Date;
}): 'upcoming' | 'past' | 'cancelled' | 'pending' | 'rejected' {
  const now = new Date();

  // Handle cancelled/rejected/withdrawn status
  if (booking.status === BookingStatus.CANCELLED) {
    return 'cancelled';
  }
  if (booking.status === BookingStatus.REJECTED) {
    return 'rejected';
  }
  if (booking.status === BookingStatus.WITHDRAWN) {
    return 'cancelled';
  }

  // Handle pending status
  if (booking.status === BookingStatus.PENDING) {
    return 'pending';
  }

  // For active/completed bookings, determine based on date
  if (booking.status === BookingStatus.ACTIVE || booking.status === BookingStatus.COMPLETED) {
    // If booking end date has passed, it's in the past
    if (booking.bookingEndDate < now) {
      return 'past';
    }
    return 'upcoming';
  }

  // Default to upcoming for other statuses
  return 'upcoming';
}

/**
 * Build filter based on query parameters
 */
function buildBookingFilter(userId: string, query: UserBookingsQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    bookedBy: userId,
  };

  // Filter by service type
  if (query.serviceType) {
    filter.bookingType = query.serviceType;
  }

  const now = new Date();

  // Filter by status
  if (query.status) {
    switch (query.status) {
      case 'upcoming':
        filter.status = { $in: [BookingStatus.ACTIVE, BookingStatus.PENDING] };
        filter.bookingEndDate = { $gte: now };
        break;
      case 'past':
        filter.$or = [
          { status: BookingStatus.COMPLETED },
          {
            status: { $in: [BookingStatus.ACTIVE] },
            bookingEndDate: { $lt: now },
          },
        ];
        break;
      case 'cancelled':
        filter.status = { $in: [BookingStatus.CANCELLED, BookingStatus.WITHDRAWN] };
        break;
      case 'pending':
        filter.status = BookingStatus.PENDING;
        break;
      case 'rejected':
        filter.status = BookingStatus.REJECTED;
        break;
    }
  }

  return filter;
}

/**
 * Format booking time string
 */
function formatBookingTime(startDate: Date, endDate: Date, tz: string): string {
  try {
    const startTime = dayjs(startDate).tz(tz).format('h:mm A');
    const endTime = dayjs(endDate).tz(tz).format('h:mm A');
    return `${startTime} - ${endTime}`;
  } catch {
    // Fallback to simple format
    const startTime = dayjs(startDate).format('h:mm A');
    const endTime = dayjs(endDate).format('h:mm A');
    return `${startTime} - ${endTime}`;
  }
}

/**
 * Format booking date string
 */
function formatBookingDate(date: Date, tz: string): string {
  try {
    return dayjs(date).tz(tz).format('MMM D, YYYY');
  } catch {
    return dayjs(date).format('MMM D, YYYY');
  }
}

/**
 * User Booking Service
 * Handles booking queries for authenticated users (my bookings)
 */
class UserBookingService {
  /**
   * Get user's bookings with filters and pagination
   */
  async getUserBookings(
    userId: string,
    query: UserBookingsQuery,
  ): Promise<{
    bookings: UserBookingResponse[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 50);
    const skip = (page - 1) * limit;

    const filter = buildBookingFilter(userId, query);

    // Get total count
    const total = await Booking.countDocuments(filter);

    // Get bookings with pagination
    const bookings = await Booking.find(filter)
      .sort({ bookingStartDate: query.status === 'past' ? -1 : 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Collect all service IDs by type for batch lookup
    const experienceIds: string[] = [];
    const expertiseIds: string[] = [];
    const hubIds = new Set<string>();

    for (const booking of bookings) {
      const serviceId = booking.serviceId?.toString();
      const hubId = booking.hubId?.toString();

      if (serviceId) {
        if (booking.bookingType === BookingType.EXPERIENCE) {
          experienceIds.push(serviceId);
        } else if (booking.bookingType === BookingType.EXPERTISE) {
          expertiseIds.push(serviceId);
        }
      }

      if (hubId) {
        hubIds.add(hubId);
      }
    }

    // Batch load experiences, expertises, and hubs
    const [experiences, expertises, hubs] = await Promise.all([
      experienceIds.length > 0
        ? Experience.find({ _id: { $in: experienceIds } })
            .select('experienceTitle slug experienceType location')
            .lean()
        : [],
      expertiseIds.length > 0
        ? Expertise.find({ _id: { $in: expertiseIds } })
            .select('expertiseTitle slug ticket location host')
            .lean()
        : [],
      hubIds.size > 0
        ? Hub.find({ _id: { $in: Array.from(hubIds) } })
            .select('name')
            .lean()
        : [],
    ]);

    // Create lookup maps
    const experienceMap = new Map(experiences.map((e) => [e._id.toString(), e]));
    const expertiseMap = new Map(expertises.map((e) => [e._id.toString(), e]));
    const hubMap = new Map(hubs.map((h) => [h._id.toString(), h]));

    // Transform bookings to response format
    const bookingResponses: UserBookingResponse[] = bookings.map((booking) => {
      const serviceId = booking.serviceId?.toString();
      const hubId = booking.hubId?.toString();
      const hub = hubId ? hubMap.get(hubId) : null;

      let serviceName = 'Unknown Service';
      let serviceSlug: string | undefined;
      let location = 'Unknown Location';
      let locationType: 'Online' | 'Physical' = 'Physical';
      let hostName: string | undefined;

      if (booking.bookingType === BookingType.EXPERIENCE && serviceId) {
        const experience = experienceMap.get(serviceId);
        if (experience) {
          serviceName = experience.experienceTitle;
          serviceSlug = experience.slug;
          locationType = experience.experienceType === 'Virtual' ? 'Online' : 'Physical';
          if (experience.experienceType === 'Virtual') {
            location = 'Online';
          } else if (experience.location) {
            location =
              [experience.location.city, experience.location.country].filter(Boolean).join(', ') ||
              'Unknown Location';
          }
        }
      } else if (booking.bookingType === BookingType.EXPERTISE && serviceId) {
        const expertise = expertiseMap.get(serviceId);
        if (expertise) {
          serviceName = expertise.expertiseTitle;
          serviceSlug = expertise.slug;

          // Determine mode from first ticket if available
          const firstTicket = expertise.ticket?.[0];
          const expertiseMode = firstTicket?.expertiseMode;
          locationType = expertiseMode === 'online' ? 'Online' : 'Physical';

          if (expertiseMode === 'online') {
            location = 'Online';
          } else if (expertise.location) {
            location =
              [expertise.location.city, expertise.location.country].filter(Boolean).join(', ') ||
              'Unknown Location';
          }

          // Get host name if available (single host object)
          if (expertise.host?.name) {
            hostName = expertise.host.name;
          }
        }
      }

      // Map tickets from selectedTickets
      const tickets: UserBookingTicket[] = (booking.selectedTickets || []).map((ticket) => ({
        name: ticket.ticketName,
        quantity: ticket.numberOfSelectedTickets,
        duration: ticket.sessionDuration,
      }));

      const tz = booking.timeZone || 'Asia/Kuala_Lumpur';

      // Determine cancellation info
      let cancelledBy: 'learner' | 'hub' | undefined;
      if (
        booking.status === BookingStatus.CANCELLED ||
        booking.status === BookingStatus.WITHDRAWN
      ) {
        // If cancelledBy matches the bookedBy user, it's learner-cancelled
        const cancelledById = booking.cancelledBy?.toString();
        const bookedById = booking.bookedBy?.toString();
        cancelledBy = cancelledById === bookedById ? 'learner' : 'hub';
      }

      return {
        id: booking._id.toString(),
        serviceType: booking.bookingType as 'experience' | 'expertise' | 'space',
        serviceName,
        serviceSlug,
        hubId: hubId || '',
        hubName: hub?.name || 'Unknown Hub',
        hostName,
        location,
        locationType,
        bookingDate: formatBookingDate(booking.bookingStartDate, tz),
        bookingTime: formatBookingTime(booking.bookingStartDate, booking.bookingEndDate, tz),
        timezone: tz.split('/').pop()?.replace('_', ' ') || 'MYT',
        tickets,
        totalPaid: booking.totalCost,
        currency: booking.currency === 'MYR' ? 'RM' : booking.currency,
        status: mapBookingStatus(booking),
        cancelledBy,
        cancellationReason: booking.cancellationReason,
        createdAt: booking.createdAt.toISOString(),
      };
    });

    return {
      bookings: bookingResponses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single booking by ID for the user (detailed view)
   * Returns full booking details including review, payment info, location, etc.
   */
  async getUserBookingById(
    userId: string,
    bookingId: string,
  ): Promise<BookingDetailResponse | null> {
    const booking = await Booking.findOne({
      _id: bookingId,
      bookedBy: userId,
    }).lean();

    if (!booking) {
      return null;
    }

    // Get service, hub, booker details, and review in parallel
    const hubId = booking.hubId?.toString();
    const serviceId = booking.serviceId?.toString();
    const bookerId = booking.bookedBy?.toString();

    const [hub, experience, expertise, booker, review] = await Promise.all([
      hubId ? Hub.findById(hubId).select('name slug logo').lean() : null,
      booking.bookingType === BookingType.EXPERIENCE && serviceId
        ? Experience.findById(serviceId)
            .select('experienceTitle slug experienceType location coverPhoto')
            .lean()
        : null,
      booking.bookingType === BookingType.EXPERTISE && serviceId
        ? Expertise.findById(serviceId)
            .select('expertiseTitle slug ticket location host coverPhoto')
            .lean()
        : null,
      bookerId ? User.findById(bookerId).select('name email phoneNumber').lean() : null,
      BookingReview.findOne({
        bookingId: booking._id,
        status: BookingReviewStatus.ACTIVE,
      }).lean(),
    ]);

    // Build service details
    let serviceTitle = 'Unknown Service';
    let serviceSlug: string | undefined;
    let serviceCover: string | undefined;
    let experienceType: 'Online' | 'Physical' | 'Hybrid' | undefined;
    let hostName: string | undefined;
    let hostDetails: Array<{ fullName: string; profileImage?: string }> | undefined;
    let locationData: BookingDetailLocation | undefined;

    // Type assertions for experience and expertise
    const exp = experience as {
      experienceTitle?: string;
      slug?: string;
      coverPhoto?: string;
      experienceType?: string;
      location?: { city?: string; state?: string; country?: string; lat?: number; lng?: number };
    } | null;

    const ext = expertise as {
      expertiseTitle?: string;
      slug?: string;
      coverPhoto?: string;
      ticket?: Array<{ expertiseMode?: string }>;
      location?: { city?: string; state?: string; country?: string; lat?: number; lng?: number };
      host?: { name?: string; profilePhoto?: string };
    } | null;

    if (exp) {
      serviceTitle = exp.experienceTitle || 'Unknown Experience';
      serviceSlug = exp.slug;
      serviceCover = exp.coverPhoto;
      experienceType =
        exp.experienceType === 'Virtual'
          ? 'Online'
          : exp.experienceType === 'Hybrid'
            ? 'Hybrid'
            : 'Physical';

      // Get location
      if (exp.location) {
        locationData = {
          city: exp.location.city,
          state: exp.location.state,
          country: exp.location.country,
          lat: exp.location.lat,
          lng: exp.location.lng,
        };
      }
    } else if (ext) {
      serviceTitle = ext.expertiseTitle || 'Unknown Expertise';
      serviceSlug = ext.slug;
      serviceCover = ext.coverPhoto;

      const firstTicket = ext.ticket?.[0];
      const expertiseMode = firstTicket?.expertiseMode;
      experienceType = expertiseMode === 'online' ? 'Online' : 'Physical';

      // Get host
      if (ext.host?.name) {
        hostName = ext.host.name;
        hostDetails = [
          {
            fullName: ext.host.name,
            profileImage: ext.host.profilePhoto,
          },
        ];
      }

      // Get location
      if (ext.location) {
        locationData = {
          city: ext.location.city,
          state: ext.location.state,
          country: ext.location.country,
          lat: ext.location.lat,
          lng: ext.location.lng,
        };
      }
    }

    // Build tickets with full details from selectedTickets
    const selectedTickets: BookingDetailTicket[] = (booking.selectedTickets || []).map(
      (ticket) => ({
        ticketId: ticket.id || '',
        ticketName: ticket.ticketName || 'Ticket',
        quantity: ticket.numberOfSelectedTickets || 1,
        standardRate: ticket.standardRate || 0,
        totalPrice: (ticket.standardRate || 0) * (ticket.numberOfSelectedTickets || 1),
        sessionDuration: ticket.sessionDuration,
      }),
    );

    // Map status
    const now = new Date();
    let status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.WITHDRAWN) {
      status = 'cancelled';
    } else if (booking.status === BookingStatus.PENDING) {
      status = 'pending';
    } else if (booking.bookingEndDate < now) {
      status = 'completed';
    } else {
      status = 'confirmed';
    }

    // Determine cancellation info
    let cancelledBy: 'learner' | 'hub' | undefined;
    if (status === 'cancelled') {
      const cancelledById = booking.cancelledBy?.toString();
      const bookedById = booking.bookedBy?.toString();
      cancelledBy = cancelledById === bookedById ? 'learner' : 'hub';
    }

    // Build review response
    let reviewData: BookingDetailReview | undefined;
    if (review) {
      reviewData = {
        _id: review._id.toString(),
        rating: review.rating,
        content: review.content,
        photos: review.photos,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
        hubReply: review.hubReply
          ? {
              content: review.hubReply.content,
              createdAt: review.hubReply.createdAt.toISOString(),
            }
          : undefined,
      };
    }

    // Get booker info from learnerDetail if booker lookup fails
    const bookerFromLearnerDetail =
      booking.learnerDetail?.find((l) => l.isBooker) || booking.learnerDetail?.[0];

    // Build hub response
    const hubData: BookingDetailHub = {
      _id: hubId || '',
      name: hub?.name || 'Unknown Hub',
      slug: hub?.slug,
      logo: hub?.logo,
    };

    return {
      _id: booking._id.toString(),
      confirmationCode: undefined, // Not in model
      serviceId: serviceId || '',
      serviceType: booking.bookingType as 'experience' | 'expertise' | 'space',
      serviceTitle,
      serviceCover,
      serviceSlug,
      experienceType,

      hubId: hubId || '',
      hub: hubData,

      hostName,
      hostDetails,

      bookingStartDate: booking.bookingStartDate.toISOString(),
      bookingEndDate: booking.bookingEndDate.toISOString(),
      timeZone: booking.timeZone || 'Asia/Kuala_Lumpur',

      status,
      cancelledBy,
      cancellationReason: booking.cancellationReason,
      cancelledDate: booking.cancelledDate?.toISOString(),

      selectedTickets,

      bookerName: booker?.name || bookerFromLearnerDetail?.name || 'Unknown',
      bookerEmail: booker?.email || bookerFromLearnerDetail?.email || '',
      phoneNumber: booker?.phoneNumber || booking.phoneNumber || bookerFromLearnerDetail?.phone,

      totalCost: booking.totalCost || 0,
      totalAmount: booking.totalCost || 0,
      currency: booking.currency === 'MYR' ? 'RM' : booking.currency || 'RM',
      serviceFee: booking.platformFee,
      serviceFeePayBy: booking.stripeFeePayBy as 'learner' | 'hub' | undefined,
      membershipDiscount: undefined,
      membershipDiscountAmount: undefined,
      promotionCode: booking.promotionCode,
      discountAmount: booking.discountAmount,
      isFree: booking.isFree || booking.totalCost === 0,

      paymentMethod: booking.cardType
        ? {
            type: 'card',
            brand: booking.cardType,
            last4: booking.cardLastDigit,
          }
        : undefined,

      refundAmount: booking.refundAmount,
      refundPercentage: undefined,

      location: locationData,
      review: reviewData,

      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(
    userId: string,
    bookingId: string,
    reason: string,
  ): Promise<{ success: boolean; message: string }> {
    const booking = await Booking.findOne({
      _id: bookingId,
      bookedBy: userId,
    });

    if (!booking) {
      throw new Error('BOOKING_NOT_FOUND: Booking not found');
    }

    // Check if booking can be cancelled
    if (![BookingStatus.PENDING, BookingStatus.ACTIVE].includes(booking.status as BookingStatus)) {
      throw new Error('CANNOT_CANCEL: This booking cannot be cancelled');
    }

    // Check if booking hasn't already started
    const now = new Date();
    if (booking.bookingStartDate < now) {
      throw new Error('CANNOT_CANCEL: Cannot cancel a booking that has already started');
    }

    // Update booking status
    booking.status = BookingStatus.CANCELLED;
    booking.cancelledBy = userId as unknown as typeof booking.cancelledBy;
    booking.cancelledDate = now;
    booking.cancellationReason = reason;

    await booking.save();

    // Send cancellation notifications (non-blocking)
    void this.sendCancellationNotifications(booking, userId, reason);

    // TODO: Process refund if applicable

    return {
      success: true,
      message: 'Booking cancelled successfully',
    };
  }

  /**
   * Send booking cancellation notifications to learner and host
   */
  private async sendCancellationNotifications(
    booking: typeof Booking.prototype,
    userId: string,
    reason: string,
  ): Promise<void> {
    try {
      // Get booking details
      const [user, hub, experience, expertise] = await Promise.all([
        User.findById(userId).select('name email phone').lean(),
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
      const tz = booking.timeZone || 'Asia/Kuala_Lumpur';
      const bookingDate = formatBookingDate(booking.bookingStartDate, tz);

      // Send notification to learner
      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'BOOKING_CANCELLED_LEARNER',
        user: {
          _id: userId,
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
          bookingDate,
          cancellationReason: reason,
          refundInfo: 'Refund will be processed if applicable.',
        },
      });

      // Send notification to host (hub owner/admin)
      if (hub && booking.hubId) {
        // Get the hub owner to notify
        const { HubMember } = await import('@core/models/HubMember');
        const hubOwner = await HubMember.findOne({
          hubId: booking.hubId,
          roleIds: { $elemMatch: { $exists: true } }, // Has at least one role (likely owner/admin)
        })
          .populate('userId', 'name email phone')
          .lean();

        if (hubOwner?.userId) {
          const owner = hubOwner.userId as unknown as {
            _id: string;
            name: string;
            email: string;
            phone?: string;
          };
          await communicationTriggerService.triggerCommunicationWithUser({
            templateId: 'BOOKING_CANCELLED_HOST',
            user: {
              _id: owner._id.toString(),
              name: owner.name,
              email: owner.email,
              phone: owner.phone,
            },
            hubId: booking.hubId.toString(),
            data: {
              userName: owner.name,
              userEmail: owner.email,
              learnerName: user.name,
              experienceName,
              bookingDate,
              cancellationReason: reason,
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to send booking cancellation notifications:', error);
    }
  }
}

export const userBookingService = new UserBookingService();
