import { Booking, BookingStatus, BookingType } from '@core/models/Booking';
import { Experience } from '@core/models/Experience';
import { Expertise } from '@core/models/Expertise';
import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import type {
  LearnerOverviewResponse,
  LearnerOverviewStats,
  LearnerUpcomingBooking,
} from '@schemas/web';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Learner Overview Service
 * Provides dashboard overview data for authenticated learners
 */
class LearnerOverviewService {
  /**
   * Get dashboard overview data for a learner
   */
  async getOverview(userId: string): Promise<LearnerOverviewResponse> {
    const now = new Date();

    // Fetch user and stats in parallel
    const [user, stats, upcomingBookings] = await Promise.all([
      this.getUserInfo(userId),
      this.getStats(userId, now),
      this.getUpcomingBookings(userId, now),
    ]);

    return {
      user,
      stats,
      upcomingBookings,
      currency: user.currency || 'RM',
    };
  }

  /**
   * Get user info for overview
   */
  private async getUserInfo(userId: string): Promise<{
    name: string;
    firstName: string;
    emailVerified: boolean;
    profileComplete: boolean;
    currency: string;
  }> {
    const user = await User.findById(userId)
      .select('name emailVerified profilePhoto bio currency')
      .lean();

    if (!user) {
      return {
        name: '',
        firstName: '',
        emailVerified: false,
        profileComplete: false,
        currency: 'RM',
      };
    }

    const firstName = user.name?.split(' ')[0] || '';
    // Consider profile complete if they have name, photo, and bio
    const profileComplete = !!(user.name && user.profilePhoto && user.bio);

    return {
      name: user.name || '',
      firstName,
      emailVerified: user.emailVerified || false,
      profileComplete,
      currency: user.currency || 'RM',
    };
  }

  /**
   * Get stats for the learner dashboard
   */
  private async getStats(userId: string, now: Date): Promise<LearnerOverviewStats> {
    // Run all count queries in parallel
    const [upcomingCount, completedCount, totalSpentResult] = await Promise.all([
      // Upcoming bookings: active/pending status AND end date in future
      Booking.countDocuments({
        bookedBy: userId,
        status: { $in: [BookingStatus.ACTIVE, BookingStatus.PENDING] },
        bookingEndDate: { $gte: now },
      }),

      // Completed sessions: completed status OR (active with past end date)
      Booking.countDocuments({
        bookedBy: userId,
        $or: [
          { status: BookingStatus.COMPLETED },
          {
            status: BookingStatus.ACTIVE,
            bookingEndDate: { $lt: now },
          },
        ],
      }),

      // Total spent: sum of totalCost for all non-cancelled bookings
      Booking.aggregate([
        {
          $match: {
            bookedBy: userId,
            status: {
              $nin: [BookingStatus.CANCELLED, BookingStatus.WITHDRAWN, BookingStatus.REJECTED],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalCost' },
          },
        },
      ]),
    ]);

    const totalSpent = totalSpentResult[0]?.total || 0;

    // Reviews given - for now return 0 since we don't have a reviews model yet
    const reviewsGiven = 0;

    return {
      upcomingBookings: upcomingCount,
      completedSessions: completedCount,
      totalSpent,
      reviewsGiven,
    };
  }

  /**
   * Get upcoming bookings list (limited to 5)
   */
  private async getUpcomingBookings(userId: string, now: Date): Promise<LearnerUpcomingBooking[]> {
    const bookings = await Booking.find({
      bookedBy: userId,
      status: { $in: [BookingStatus.ACTIVE, BookingStatus.PENDING] },
      bookingEndDate: { $gte: now },
    })
      .sort({ bookingStartDate: 1 })
      .limit(5)
      .lean();

    if (bookings.length === 0) {
      return [];
    }

    // Collect service and hub IDs for batch lookup
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
            .select('expertiseTitle slug ticket location')
            .lean()
        : [],
      hubIds.size > 0
        ? Hub.find({ _id: { $in: Array.from(hubIds) } })
            .select('name slug')
            .lean()
        : [],
    ]);

    // Create lookup maps
    const experienceMap = new Map(experiences.map((e) => [e._id.toString(), e]));
    const expertiseMap = new Map(expertises.map((e) => [e._id.toString(), e]));
    const hubMap = new Map(hubs.map((h) => [h._id.toString(), h]));

    // Transform bookings
    return bookings.map((booking) => {
      const serviceId = booking.serviceId?.toString();
      const hubId = booking.hubId?.toString();
      const hub = hubId ? hubMap.get(hubId) : null;

      let serviceName = 'Unknown Service';
      let serviceSlug: string | undefined;
      let location = 'Unknown Location';
      let locationType: 'Online' | 'Physical' = 'Physical';

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
        }
      }

      const tz = booking.timeZone || 'Asia/Kuala_Lumpur';
      const startDate = dayjs(booking.bookingStartDate).tz(tz);

      return {
        id: booking._id.toString(),
        serviceName,
        serviceSlug,
        hubName: hub?.name || 'Unknown Hub',
        hubSlug: hub?.slug,
        date: startDate.format('MMM D, YYYY'),
        time: startDate.format('h:mm A'),
        locationType,
        location,
      };
    });
  }
}

export const learnerOverviewService = new LearnerOverviewService();
