import { Booking, BookingStatus, BookingType } from '@core/models/Booking';
import { Experience } from '@core/models/Experience';
import { Expertise } from '@core/models/Expertise';
import { Hub } from '@core/models/Hub';
import { Plan } from '@core/models/Plan';
import { Subscription, SubscriptionStatus } from '@core/models/Subscription';
import { Transaction, TransactionStatus, TransactionType } from '@core/models/Transaction';
import { User } from '@core/models/User';
import { StripeServiceFactory } from '@core/services/shared/payments/stripeFactory.service';
import mongoose from 'mongoose';

// ============================================================================
// Types
// ============================================================================

export interface HubDashboardStats {
  earnings: {
    total: number;
    thisMonth: number;
    currency: string;
  };
  listings: {
    services: number;
    experiences: number;
    gigs: number;
    spaces: number;
  };
  orders: {
    active: number;
    totalValue: number;
  };
}

export interface ServiceRequest {
  id: string;
  contactName: string;
  contactEmail: string;
  contactAvatar?: string;
  expertise: string;
  dateTime: string;
  mode: string;
  paidAmount: string;
}

export interface ExperienceBooking {
  id: string;
  title: string;
  image?: string;
  status: 'active' | 'completed' | 'cancelled';
  lastBooked: string;
  tickets: number;
  profit: string;
}

export interface HubSubscriptionInfo {
  planCode: string | null;
  planName: string;
  status: string | null;
}

export interface HubOnboardingStatus {
  profileComplete: boolean;
  profileCompletionPercentage: number;
  stripeVerified: boolean;
  hasWorkExperience: boolean;
  missingFields: string[];
  subscription: HubSubscriptionInfo;
}

export interface CollaboratorExperience {
  _id: string;
  title: string;
  slug: string;
  status: string;
  coverPhoto?: string;
  hostDetails?: { name?: string; email?: string }[];
}

export interface CollaboratorBooking {
  _id: string;
  experienceId: string;
  experienceTitle: string;
  experienceSlug: string;
  customerName: string;
  customerEmail: string;
  bookingDate: string;
  status: string;
  totalCost: number;
  currency: string;
  ticketCount: number;
}

export interface CollaboratorDashboardData {
  hub: {
    id: string;
    name: string;
    logo?: string;
    companyType?: string;
    location?: {
      city?: string;
      country?: string;
    };
  };
  experienceCount: number;
  bookingCount: number;
  experiences: CollaboratorExperience[];
  bookings: CollaboratorBooking[];
}

// ============================================================================
// Service
// ============================================================================

export class HubDashboardService {
  /**
   * Get hub by ID - access control is handled by middleware
   */
  private async getHub(hubId: string) {
    const hub = await Hub.findById(hubId);
    if (!hub) {
      throw new Error('Hub not found');
    }
    return hub;
  }

  /**
   * Get hub dashboard statistics
   * Note: Access control is handled by middleware
   */
  async getStats(hubId: string): Promise<HubDashboardStats> {
    // Get hub first to get currency
    const hub = await this.getHub(hubId);
    const hubCurrency = hub.currency || 'MYR';

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Run all queries in parallel
    const [
      // Total withdrawals (amount already withdrawn)
      totalWithdrawalsResult,
      // This month's withdrawals
      monthlyWithdrawalsResult,
      // Listings
      servicesCount,
      experiencesCount,
      // Active orders
      activeOrdersResult,
    ] = await Promise.all([
      // Total earnings = Total withdrawals (sum of all withdrawal transactions)
      Transaction.aggregate([
        {
          $match: {
            hubId: new mongoose.Types.ObjectId(hubId),
            status: {
              $in: [
                TransactionStatus.SUCCEEDED,
                TransactionStatus.PENDING,
                TransactionStatus.PROCESSING,
              ],
            },
            type: TransactionType.WITHDRAWAL,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $abs: '$amount' } },
          },
        },
      ]),
      // This month's withdrawals
      Transaction.aggregate([
        {
          $match: {
            hubId: new mongoose.Types.ObjectId(hubId),
            status: {
              $in: [
                TransactionStatus.SUCCEEDED,
                TransactionStatus.PENDING,
                TransactionStatus.PROCESSING,
              ],
            },
            type: TransactionType.WITHDRAWAL,
            createdAt: { $gte: startOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $abs: '$amount' } },
          },
        },
      ]),
      // Expertise (services) count
      Expertise.countDocuments({ hubId: hubId, status: 'published' }),
      // Experiences count
      Experience.countDocuments({ hubId: hubId, status: 'published' }),
      // Active orders
      Booking.aggregate([
        {
          $match: {
            hubId: new mongoose.Types.ObjectId(hubId),
            status: { $in: [BookingStatus.PENDING, BookingStatus.ACTIVE] },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            totalValue: { $sum: '$totalCost' },
          },
        },
      ]),
    ]);

    // Round to 2 decimal places
    const round2 = (n: number) => Math.round(n * 100) / 100;

    return {
      earnings: {
        total: round2(totalWithdrawalsResult[0]?.total ?? 0),
        thisMonth: round2(monthlyWithdrawalsResult[0]?.total ?? 0),
        currency: hubCurrency,
      },
      listings: {
        services: servicesCount,
        experiences: experiencesCount,
        gigs: 0, // Not implemented yet
        spaces: 0, // Not implemented yet
      },
      orders: {
        active: activeOrdersResult[0]?.count ?? 0,
        totalValue: round2(activeOrdersResult[0]?.totalValue ?? 0),
      },
    };
  }

  /**
   * Get active orders (service requests and experience bookings)
   */
  async getOrders(hubId: string): Promise<{
    serviceRequests: ServiceRequest[];
    experienceBookings: ExperienceBooking[];
  }> {
    // Get expertise bookings (service requests)
    const expertiseBookings = await Booking.find({
      hubId: new mongoose.Types.ObjectId(hubId),
      bookingType: BookingType.EXPERTISE,
      status: { $in: [BookingStatus.PENDING, BookingStatus.ACTIVE] },
    })
      .populate('bookedBy', 'name email profilePhoto')
      .populate({ path: 'serviceId', model: 'Expertise', select: 'expertiseTitle mode' })
      .sort({ bookingStartDate: -1 })
      .limit(10)
      .lean();

    // Get experience bookings summary
    const experienceBookingsSummary = await Booking.aggregate([
      {
        $match: {
          hubId: new mongoose.Types.ObjectId(hubId),
          bookingType: BookingType.EXPERIENCE,
        },
      },
      {
        $group: {
          _id: '$serviceId',
          totalTickets: { $sum: { $size: { $ifNull: ['$learnerDetail', []] } } },
          totalProfit: { $sum: { $ifNull: ['$transferAmount', 0] } },
          lastBooked: { $max: '$createdAt' },
          statuses: { $push: '$status' },
        },
      },
      {
        $lookup: {
          from: 'experiences',
          localField: '_id',
          foreignField: '_id',
          as: 'experience',
        },
      },
      { $unwind: { path: '$experience', preserveNullAndEmptyArrays: true } },
      { $limit: 10 },
    ]);

    // Format service requests
    const serviceRequests: ServiceRequest[] = expertiseBookings.map((booking) => {
      const bookedBy = booking.bookedBy as unknown as {
        name?: string;
        email?: string;
        profilePhoto?: string;
      };
      const service = booking.serviceId as unknown as { expertiseTitle?: string; mode?: string };

      return {
        id: String(booking._id),
        contactName: bookedBy?.name ?? booking.learnerDetail?.[0]?.name ?? 'Unknown',
        contactEmail: bookedBy?.email ?? booking.learnerDetail?.[0]?.email ?? '',
        contactAvatar: bookedBy?.profilePhoto,
        expertise: service?.expertiseTitle ?? 'Unknown Service',
        dateTime: new Date(booking.bookingStartDate).toLocaleString(),
        mode: service?.mode ?? 'online',
        paidAmount: `${booking.currency ?? 'MYR'} ${(booking.totalCost ?? 0).toFixed(2)}`,
      };
    });

    // Format experience bookings
    const experienceBookingsFormatted: ExperienceBooking[] = experienceBookingsSummary.map(
      (item) => {
        const hasActive = item.statuses?.includes(BookingStatus.ACTIVE) ?? false;
        const allCompleted =
          item.statuses?.every((s: string) => s === BookingStatus.COMPLETED) ?? false;

        return {
          id: String(item._id),
          title: item.experience?.experienceTitle ?? 'Unknown Experience',
          image: item.experience?.coverPhoto,
          status: hasActive ? 'active' : allCompleted ? 'completed' : 'cancelled',
          lastBooked: item.lastBooked ? new Date(item.lastBooked).toLocaleDateString() : '',
          tickets: item.totalTickets ?? 0,
          profit: `MYR ${(item.totalProfit ?? 0).toFixed(2)}`,
        };
      },
    );

    return {
      serviceRequests,
      experienceBookings: experienceBookingsFormatted,
    };
  }

  /**
   * Get hub onboarding/profile completion status
   */
  async getOnboardingStatus(userId: string, hubId: string): Promise<HubOnboardingStatus> {
    const hub = await this.getHub(hubId);

    // Get user, hub, and subscription in parallel
    const [user, hubData, subscription] = await Promise.all([
      User.findById(userId).select('stripeAccountId stripeRegion location').lean(),
      Hub.findById(hubId).select('stripeRegion location').lean(),
      Subscription.findOne({
        hubId: new mongoose.Types.ObjectId(hubId),
        status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      }),
    ]);

    // Check Stripe verification status if user has account
    // Use regional Stripe service based on user's/hub's region
    let stripeVerified = false;
    if (user?.stripeAccountId) {
      try {
        const regionalStripeService = StripeServiceFactory.getServiceForUser(user, hubData);
        const account = await regionalStripeService.retrieveAccount(user.stripeAccountId);
        stripeVerified = account.charges_enabled && account.payouts_enabled;
      } catch {
        stripeVerified = false;
      }
    }

    // Get plan details if subscription exists
    let subscriptionInfo: HubSubscriptionInfo = {
      planCode: null,
      planName: 'FREE',
      status: null,
    };

    if (subscription) {
      const plan = await Plan.findOne({ planCode: subscription.planCode });
      subscriptionInfo = {
        planCode: subscription.planCode,
        planName: plan?.name ?? subscription.planCode.toUpperCase(),
        status: subscription.status,
      };
    }

    // Calculate profile completion
    const missingFields: string[] = [];
    let completedFields = 0;
    const totalFields = 8;

    // Check required fields
    if (hub.name) completedFields++;
    else missingFields.push('name');

    if (hub.logo) completedFields++;
    else missingFields.push('logo');

    if (hub.description) completedFields++;
    else missingFields.push('description');

    if (hub.phoneNumber) completedFields++;
    else missingFields.push('phoneNumber');

    if (hub.location?.city && hub.location?.country) completedFields++;
    else missingFields.push('location');

    if (hub.coverImage) completedFields++;
    else missingFields.push('coverImage');

    if (hub.focusAreas?.length > 0) completedFields++;
    else missingFields.push('focusAreas');

    if (hub.socialLinks?.website || hub.socialLinks?.linkedin) completedFields++;
    else missingFields.push('socialLinks');

    const profileCompletionPercentage = Math.round((completedFields / totalFields) * 100);

    // Get full user for employment check
    const fullUser = await User.findById(userId).select('employment').lean();

    return {
      profileComplete: profileCompletionPercentage === 100,
      profileCompletionPercentage,
      stripeVerified,
      hasWorkExperience: (fullUser?.employment?.length ?? 0) > 0,
      missingFields,
      subscription: subscriptionInfo,
    };
  }

  /**
   * Get collaborator dashboard data
   * Shows hub info, experiences and bookings the collaborator has access to
   */
  async getCollaboratorDashboard(
    userId: string,
    hubId: string,
  ): Promise<CollaboratorDashboardData> {
    const hub = await this.getHub(hubId);

    // Get user's email to find experiences they're a host of
    const user = await User.findById(userId).select('email').lean();
    if (!user?.email) {
      throw new Error('User not found');
    }

    // Get experiences where user is a host (by userId or email)
    // Handle both string and ObjectId hubId formats using $and
    const hubIdConditions = mongoose.isValidObjectId(hubId)
      ? [{ hubId }, { hubId: new mongoose.Types.ObjectId(hubId) }]
      : [{ hubId }];

    const experiences = await Experience.find({
      $and: [
        { $or: hubIdConditions },
        { $or: [{ 'hostDetails.userId': userId }, { 'hostDetails.email': user.email }] },
      ],
    })
      .select('_id experienceTitle slug status coverPhoto hostDetails')
      .sort({ createdAt: -1 })
      .lean();

    const experienceIds = experiences.map((exp) => exp._id);

    // Get bookings for these experiences
    const bookings = await Booking.find({
      hubId: new mongoose.Types.ObjectId(hubId),
      bookingType: BookingType.EXPERIENCE,
      serviceId: { $in: experienceIds },
    })
      .populate('bookedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Get total booking count
    const bookingCount = await Booking.countDocuments({
      hubId: new mongoose.Types.ObjectId(hubId),
      bookingType: BookingType.EXPERIENCE,
      serviceId: { $in: experienceIds },
    });

    // Create experience lookup map
    const experienceMap = new Map(experiences.map((exp) => [String(exp._id), exp]));

    const formattedExperiences: CollaboratorExperience[] = experiences.map((exp) => ({
      _id: String(exp._id),
      title: exp.experienceTitle ?? 'Untitled',
      slug: exp.slug ?? String(exp._id),
      status: exp.status ?? 'drafted',
      coverPhoto: exp.coverPhoto,
      hostDetails: exp.hostDetails?.map((h) => ({
        name: h.name,
        email: h.email,
      })),
    }));

    const formattedBookings: CollaboratorBooking[] = bookings.map((booking) => {
      const experience = experienceMap.get(String(booking.serviceId));
      const bookedBy = booking.bookedBy as unknown as { name?: string; email?: string };

      return {
        _id: String(booking._id),
        experienceId: String(booking.serviceId),
        experienceTitle: experience?.experienceTitle ?? 'Unknown Experience',
        experienceSlug: experience?.slug ?? String(booking.serviceId),
        customerName: bookedBy?.name ?? booking.learnerDetail?.[0]?.name ?? 'Unknown',
        customerEmail: bookedBy?.email ?? booking.learnerDetail?.[0]?.email ?? '',
        bookingDate: booking.bookingStartDate
          ? new Date(booking.bookingStartDate).toISOString()
          : new Date(booking.createdAt).toISOString(),
        status: booking.status,
        totalCost: booking.totalCost ?? 0,
        currency: booking.currency ?? 'MYR',
        ticketCount: booking.learnerDetail?.length ?? 1,
      };
    });

    return {
      hub: {
        id: String(hub._id),
        name: hub.name,
        logo: hub.logo,
        companyType: hub.companyType ? String(hub.companyType) : undefined,
        location: hub.location
          ? {
              city: hub.location.city,
              country: hub.location.country,
            }
          : undefined,
      },
      experienceCount: experiences.length,
      bookingCount,
      experiences: formattedExperiences,
      bookings: formattedBookings,
    };
  }
}

export const hubDashboardService = new HubDashboardService();
