import { Booking, BookingStatus, BookingType, StripePaymentStatus } from '@core/models/Booking';
import mongoose from 'mongoose';

/**
 * Booking stats interface
 */
export interface BookingStats {
  total: number;
  byType: {
    experience: number;
    expertise: number;
    space: number;
  };
  byStatus: {
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  byPaymentStatus: {
    succeeded: number;
    pending: number;
    failed: number;
    refunded: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    thisWeek: number;
    today: number;
  };
}

/**
 * Calendar event interface
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  bookingType: BookingType;
  status: BookingStatus;
  totalCost: number;
  currency: string;
  learnerCount: number;
  serviceName?: string;
  hubName?: string;
}

/**
 * List bookings params
 */
export interface ListBookingsParams {
  page?: number;
  limit?: number;
  bookingType?: BookingType;
  status?: BookingStatus;
  stripeStatus?: StripePaymentStatus;
  startDate?: Date;
  endDate?: Date;
  hubId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Admin Booking Service
 * Handles admin-level booking operations with stats and calendar support
 */
export class AdminBookingService {
  /**
   * Get booking statistics
   */
  async getStats(): Promise<BookingStats> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalCount, byTypeResult, byStatusResult, byPaymentResult, revenueResult] =
      await Promise.all([
        // Total count
        Booking.countDocuments(),

        // By type
        Booking.aggregate([
          {
            $group: {
              _id: '$bookingType',
              count: { $sum: 1 },
            },
          },
        ]),

        // By status
        Booking.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]),

        // By payment status
        Booking.aggregate([
          {
            $group: {
              _id: '$stripeStatus',
              count: { $sum: 1 },
            },
          },
        ]),

        // Revenue calculations
        Booking.aggregate([
          {
            $match: {
              stripeStatus: StripePaymentStatus.SUCCEEDED,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalCost' },
              thisMonth: {
                $sum: {
                  $cond: [{ $gte: ['$createdAt', startOfMonth] }, '$totalCost', 0],
                },
              },
              thisWeek: {
                $sum: {
                  $cond: [{ $gte: ['$createdAt', startOfWeek] }, '$totalCost', 0],
                },
              },
              today: {
                $sum: {
                  $cond: [{ $gte: ['$createdAt', startOfToday] }, '$totalCost', 0],
                },
              },
            },
          },
        ]),
      ]);

    // Process by type
    const byType = { experience: 0, expertise: 0, space: 0 };
    for (const item of byTypeResult) {
      if (item._id === BookingType.EXPERIENCE) byType.experience = item.count;
      else if (item._id === BookingType.EXPERTISE) byType.expertise = item.count;
      else if (item._id === BookingType.SPACE) byType.space = item.count;
    }

    // Process by status
    const byStatus = { pending: 0, active: 0, completed: 0, cancelled: 0 };
    for (const item of byStatusResult) {
      if (item._id === BookingStatus.PENDING) byStatus.pending = item.count;
      else if (item._id === BookingStatus.ACTIVE) byStatus.active = item.count;
      else if (item._id === BookingStatus.COMPLETED) byStatus.completed = item.count;
      else if (item._id === BookingStatus.CANCELLED) byStatus.cancelled = item.count;
    }

    // Process by payment status
    const byPaymentStatus = { succeeded: 0, pending: 0, failed: 0, refunded: 0 };
    for (const item of byPaymentResult) {
      if (item._id === StripePaymentStatus.SUCCEEDED) byPaymentStatus.succeeded = item.count;
      else if (item._id === StripePaymentStatus.PENDING) byPaymentStatus.pending = item.count;
      else if (item._id === StripePaymentStatus.FAILED) byPaymentStatus.failed = item.count;
    }

    // Count refunded bookings separately
    byPaymentStatus.refunded = await Booking.countDocuments({ isRefunded: true });

    // Process revenue
    const revenueData = revenueResult[0] || { total: 0, thisMonth: 0, thisWeek: 0, today: 0 };

    return {
      total: totalCount,
      byType,
      byStatus,
      byPaymentStatus,
      revenue: {
        total: revenueData.total,
        thisMonth: revenueData.thisMonth,
        thisWeek: revenueData.thisWeek,
        today: revenueData.today,
      },
    };
  }

  /**
   * List bookings with pagination and filters - optimized with aggregation
   */
  async list(params: ListBookingsParams): Promise<{
    bookings: unknown[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      bookingType,
      status,
      stripeStatus,
      startDate,
      endDate,
      hubId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const matchStage: Record<string, unknown> = {};

    if (bookingType) matchStage.bookingType = bookingType;
    if (status) matchStage.status = status;
    if (stripeStatus) matchStage.stripeStatus = stripeStatus;
    if (hubId) matchStage.hubId = new mongoose.Types.ObjectId(hubId);

    if (startDate || endDate) {
      matchStage.bookingStartDate = {};
      if (startDate) (matchStage.bookingStartDate as Record<string, unknown>).$gte = startDate;
      if (endDate) (matchStage.bookingStartDate as Record<string, unknown>).$lte = endDate;
    }

    if (search) {
      matchStage.$or = [
        { 'learnerDetail.name': { $regex: search, $options: 'i' } },
        { 'learnerDetail.email': { $regex: search, $options: 'i' } },
        { promotionCode: { $regex: search, $options: 'i' } },
      ];
    }

    const sortStage: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (page - 1) * limit;

    // Build aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },
      { $sort: sortStage },
      { $skip: skip },
      { $limit: limit },

      // Lookup hub
      {
        $lookup: {
          from: 'hubs',
          localField: 'hubId',
          foreignField: '_id',
          as: 'hubData',
          pipeline: [{ $project: { name: 1, slug: 1, logo: 1 } }],
        },
      },

      // Lookup bookedBy user
      {
        $lookup: {
          from: 'users',
          localField: 'bookedBy',
          foreignField: '_id',
          as: 'bookedByData',
          pipeline: [{ $project: { name: 1, email: 1, profilePhoto: 1 } }],
        },
      },

      // Lookup event
      {
        $lookup: {
          from: 'experienceevents',
          localField: 'eventId',
          foreignField: '_id',
          as: 'eventData',
          pipeline: [{ $project: { startTime: 1, endTime: 1 } }],
        },
      },

      // Lookup experience
      {
        $lookup: {
          from: 'experiences',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'experienceData',
          pipeline: [{ $project: { experienceTitle: 1, slug: 1, coverPhoto: 1 } }],
        },
      },

      // Lookup expertise
      {
        $lookup: {
          from: 'expertises',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'expertiseData',
          pipeline: [{ $project: { expertiseTitle: 1, slug: 1, coverPhoto: 1 } }],
        },
      },

      // Add computed fields with fallbacks for missing data
      {
        $addFields: {
          hubId: { $arrayElemAt: ['$hubData', 0] },
          bookedBy: { $arrayElemAt: ['$bookedByData', 0] },
          eventId: { $arrayElemAt: ['$eventData', 0] },
          serviceName: {
            $cond: [
              { $eq: ['$bookingType', BookingType.EXPERIENCE] },
              {
                $ifNull: [
                  { $arrayElemAt: ['$experienceData.experienceTitle', 0] },
                  'Unknown Experience',
                ],
              },
              {
                $cond: [
                  { $eq: ['$bookingType', BookingType.EXPERTISE] },
                  {
                    $ifNull: [
                      { $arrayElemAt: ['$expertiseData.expertiseTitle', 0] },
                      'Unknown Expertise',
                    ],
                  },
                  'Unknown Space',
                ],
              },
            ],
          },
          serviceSlug: {
            $cond: [
              { $eq: ['$bookingType', BookingType.EXPERIENCE] },
              { $arrayElemAt: ['$experienceData.slug', 0] },
              { $arrayElemAt: ['$expertiseData.slug', 0] },
            ],
          },
          serviceCoverPhoto: {
            $cond: [
              { $eq: ['$bookingType', BookingType.EXPERIENCE] },
              { $arrayElemAt: ['$experienceData.coverPhoto', 0] },
              { $arrayElemAt: ['$expertiseData.coverPhoto', 0] },
            ],
          },
        },
      },

      // Remove temporary arrays
      {
        $project: {
          hubData: 0,
          bookedByData: 0,
          eventData: 0,
          experienceData: 0,
          expertiseData: 0,
        },
      },
    ];

    const [bookings, countResult] = await Promise.all([
      Booking.aggregate(pipeline),
      Booking.countDocuments(matchStage),
    ]);

    return {
      bookings,
      total: countResult,
      page,
      limit,
      totalPages: Math.ceil(countResult / limit),
    };
  }

  /**
   * Get bookings for calendar view - optimized with aggregation
   */
  async getCalendarEvents(
    startDate: Date,
    endDate: Date,
    bookingType?: BookingType,
  ): Promise<CalendarEvent[]> {
    const matchStage: Record<string, unknown> = {
      bookingStartDate: { $gte: startDate, $lte: endDate },
      status: { $nin: [BookingStatus.CANCELLED, BookingStatus.REJECTED] },
    };

    if (bookingType) matchStage.bookingType = bookingType;

    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },
      { $sort: { bookingStartDate: 1 } },

      // Lookup hub (only need name)
      {
        $lookup: {
          from: 'hubs',
          localField: 'hubId',
          foreignField: '_id',
          as: 'hubData',
          pipeline: [{ $project: { name: 1 } }],
        },
      },

      // Lookup experience
      {
        $lookup: {
          from: 'experiences',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'experienceData',
          pipeline: [{ $project: { experienceTitle: 1 } }],
        },
      },

      // Lookup expertise
      {
        $lookup: {
          from: 'expertises',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'expertiseData',
          pipeline: [{ $project: { expertiseTitle: 1 } }],
        },
      },

      // Project only needed fields for calendar with fallbacks
      {
        $project: {
          _id: 1,
          bookingType: 1,
          bookingStartDate: 1,
          bookingEndDate: 1,
          status: 1,
          totalCost: 1,
          currency: 1,
          learnerDetail: 1,
          hubName: { $arrayElemAt: ['$hubData.name', 0] },
          serviceName: {
            $cond: [
              { $eq: ['$bookingType', BookingType.EXPERIENCE] },
              {
                $ifNull: [
                  { $arrayElemAt: ['$experienceData.experienceTitle', 0] },
                  'Unknown Experience',
                ],
              },
              {
                $cond: [
                  { $eq: ['$bookingType', BookingType.EXPERTISE] },
                  {
                    $ifNull: [
                      { $arrayElemAt: ['$expertiseData.expertiseTitle', 0] },
                      'Unknown Expertise',
                    ],
                  },
                  'Unknown Space',
                ],
              },
            ],
          },
        },
      },
    ];

    const bookings = await Booking.aggregate(pipeline);

    return bookings.map((booking) => ({
      id: booking._id.toString(),
      title: booking.serviceName,
      start: booking.bookingStartDate,
      end: booking.bookingEndDate,
      bookingType: booking.bookingType,
      status: booking.status,
      totalCost: booking.totalCost,
      currency: booking.currency,
      learnerCount: booking.learnerDetail?.length || 0,
      serviceName: booking.serviceName,
      hubName: booking.hubName,
    }));
  }

  /**
   * Get booking by ID with full details - optimized with aggregation
   */
  async getById(id: string): Promise<unknown> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    const pipeline: mongoose.PipelineStage[] = [
      { $match: { _id: new mongoose.Types.ObjectId(id) } },

      // Lookup hub
      {
        $lookup: {
          from: 'hubs',
          localField: 'hubId',
          foreignField: '_id',
          as: 'hubData',
          pipeline: [{ $project: { name: 1, slug: 1, logo: 1 } }],
        },
      },

      // Lookup bookedBy user
      {
        $lookup: {
          from: 'users',
          localField: 'bookedBy',
          foreignField: '_id',
          as: 'bookedByData',
          pipeline: [{ $project: { name: 1, email: 1, profilePhoto: 1, phone: 1 } }],
        },
      },

      // Lookup cancelledBy user
      {
        $lookup: {
          from: 'users',
          localField: 'cancelledBy',
          foreignField: '_id',
          as: 'cancelledByData',
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },

      // Lookup event
      {
        $lookup: {
          from: 'experienceevents',
          localField: 'eventId',
          foreignField: '_id',
          as: 'eventData',
        },
      },

      // Lookup experience
      {
        $lookup: {
          from: 'experiences',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'experienceData',
          pipeline: [{ $project: { experienceTitle: 1, slug: 1, coverPhoto: 1 } }],
        },
      },

      // Lookup expertise
      {
        $lookup: {
          from: 'expertises',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'expertiseData',
          pipeline: [{ $project: { expertiseTitle: 1, slug: 1, coverPhoto: 1 } }],
        },
      },

      // Add computed fields with fallbacks for missing data
      {
        $addFields: {
          hubId: { $arrayElemAt: ['$hubData', 0] },
          bookedBy: { $arrayElemAt: ['$bookedByData', 0] },
          cancelledBy: { $arrayElemAt: ['$cancelledByData', 0] },
          eventId: { $arrayElemAt: ['$eventData', 0] },
          serviceName: {
            $cond: [
              { $eq: ['$bookingType', BookingType.EXPERIENCE] },
              {
                $ifNull: [
                  { $arrayElemAt: ['$experienceData.experienceTitle', 0] },
                  'Unknown Experience',
                ],
              },
              {
                $cond: [
                  { $eq: ['$bookingType', BookingType.EXPERTISE] },
                  {
                    $ifNull: [
                      { $arrayElemAt: ['$expertiseData.expertiseTitle', 0] },
                      'Unknown Expertise',
                    ],
                  },
                  'Unknown Space',
                ],
              },
            ],
          },
          serviceSlug: {
            $cond: [
              { $eq: ['$bookingType', BookingType.EXPERIENCE] },
              { $arrayElemAt: ['$experienceData.slug', 0] },
              { $arrayElemAt: ['$expertiseData.slug', 0] },
            ],
          },
          serviceCoverPhoto: {
            $cond: [
              { $eq: ['$bookingType', BookingType.EXPERIENCE] },
              { $arrayElemAt: ['$experienceData.coverPhoto', 0] },
              { $arrayElemAt: ['$expertiseData.coverPhoto', 0] },
            ],
          },
        },
      },

      // Remove temporary arrays
      {
        $project: {
          hubData: 0,
          bookedByData: 0,
          cancelledByData: 0,
          eventData: 0,
          experienceData: 0,
          expertiseData: 0,
        },
      },
    ];

    const result = await Booking.aggregate(pipeline);
    return result[0] || null;
  }

  /**
   * Get monthly booking trends
   */
  async getMonthlyTrends(
    months: number = 12,
  ): Promise<Array<{ year: number; month: number; count: number; revenue: number }>> {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$stripeStatus', StripePaymentStatus.SUCCEEDED] }, '$totalCost', 0],
            },
          },
        },
      },
      {
        $project: {
          year: '$_id.year',
          month: '$_id.month',
          count: 1,
          revenue: 1,
          _id: 0,
        },
      },
      { $sort: { year: 1, month: 1 } },
    ]);
  }

  /**
   * Get top services by bookings - optimized with aggregation
   */
  async getTopServices(limit: number = 10): Promise<
    Array<{
      serviceId: string;
      serviceName: string;
      bookingType: string;
      count: number;
      revenue: number;
    }>
  > {
    const pipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          status: { $in: [BookingStatus.ACTIVE, BookingStatus.COMPLETED] },
        },
      },
      {
        $group: {
          _id: { serviceId: '$serviceId', bookingType: '$bookingType' },
          count: { $sum: 1 },
          revenue: { $sum: '$totalCost' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },

      // Lookup experience
      {
        $lookup: {
          from: 'experiences',
          localField: '_id.serviceId',
          foreignField: '_id',
          as: 'experienceData',
          pipeline: [{ $project: { experienceTitle: 1 } }],
        },
      },

      // Lookup expertise
      {
        $lookup: {
          from: 'expertises',
          localField: '_id.serviceId',
          foreignField: '_id',
          as: 'expertiseData',
          pipeline: [{ $project: { expertiseTitle: 1 } }],
        },
      },

      // Project final shape
      {
        $project: {
          serviceId: '$_id.serviceId',
          bookingType: '$_id.bookingType',
          count: 1,
          revenue: 1,
          serviceName: {
            $cond: [
              { $eq: ['$_id.bookingType', BookingType.EXPERIENCE] },
              {
                $ifNull: [
                  { $arrayElemAt: ['$experienceData.experienceTitle', 0] },
                  'Unknown Experience',
                ],
              },
              {
                $ifNull: [
                  { $arrayElemAt: ['$expertiseData.expertiseTitle', 0] },
                  'Unknown Expertise',
                ],
              },
            ],
          },
          _id: 0,
        },
      },
    ];

    const results = await Booking.aggregate(pipeline);

    return results.map((result) => ({
      serviceId: result.serviceId.toString(),
      serviceName: result.serviceName,
      bookingType: result.bookingType,
      count: result.count,
      revenue: result.revenue,
    }));
  }
}

export const adminBookingService = new AdminBookingService();
