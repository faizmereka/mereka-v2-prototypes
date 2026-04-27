/**
 * Admin Review Service
 * Business logic for admin review management
 */

import { Booking } from '@core/models/Booking';
import { BookingReview, BookingReviewStatus } from '@core/models/BookingReview';
import { Contract } from '@core/models/Contract';
import { ContractReview, ContractReviewStatus } from '@core/models/ContractReview';
import { Experience } from '@core/models/Experience';
import { Expertise } from '@core/models/Expertise';
import { Hub } from '@core/models/Hub';
import { Job } from '@core/models/Job';
import { User } from '@core/models/User';
import type {
  AdminBookingReviewResponse,
  AdminContractReviewResponse,
  AdminReviewResponse,
  AdminReviewStatsResponse,
  AdminReviewsListResponse,
  AdminReviewTrendsResponse,
  ListReviewsQuery,
  ModerateReviewBody,
  ModerationResponse,
  ReviewTrendsQuery,
} from '@core/schemas/admin/reviews/adminReview.schema';
import { reviewAggregationService } from '@core/services/reviews/reviewAggregation.service';
import mongoose from 'mongoose';

/**
 * Admin Review Service
 */
class AdminReviewService {
  /**
   * List all reviews (combined booking + contract)
   * AC-AR-001 through AC-AR-013
   */
  async listReviews(query: ListReviewsQuery): Promise<AdminReviewsListResponse> {
    const {
      type = 'all',
      status = 'all',
      rating,
      serviceType,
      hubId,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 20,
      sort = 'newest',
    } = query;

    const reviews: AdminReviewResponse[] = [];
    let totalBooking = 0;
    let totalContract = 0;

    // Build date filter
    const dateFilter: Record<string, unknown> = {};
    if (dateFrom) {
      dateFilter.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      dateFilter.$lte = new Date(dateTo);
    }

    // Build sort order
    let sortOrder: Record<string, 1 | -1>;
    switch (sort) {
      case 'oldest':
        sortOrder = { createdAt: 1 };
        break;
      case 'highest':
        sortOrder = { rating: -1, createdAt: -1 };
        break;
      case 'lowest':
        sortOrder = { rating: 1, createdAt: -1 };
        break;
      default:
        sortOrder = { createdAt: -1 };
    }

    // Get booking reviews
    if (type === 'all' || type === 'booking') {
      const bookingFilter: Record<string, unknown> = {};

      if (status !== 'all') {
        bookingFilter.status = status;
      }
      if (rating) {
        bookingFilter.rating = rating;
      }
      if (serviceType) {
        bookingFilter.serviceType = serviceType;
      }
      if (hubId) {
        bookingFilter.hubId = new mongoose.Types.ObjectId(hubId);
      }
      if (Object.keys(dateFilter).length > 0) {
        bookingFilter.createdAt = dateFilter;
      }
      if (search) {
        bookingFilter.$or = [{ content: { $regex: search, $options: 'i' } }];
      }

      totalBooking = await BookingReview.countDocuments(bookingFilter);

      if (type === 'booking') {
        const skip = (page - 1) * limit;
        const bookingReviews = await BookingReview.find(bookingFilter)
          .sort(sortOrder)
          .skip(skip)
          .limit(limit)
          .lean();

        const formattedBooking = await this.formatBookingReviews(bookingReviews);
        reviews.push(...formattedBooking);
      }
    }

    // Get contract reviews
    if (type === 'all' || type === 'contract') {
      const contractFilter: Record<string, unknown> = {};

      if (status !== 'all') {
        contractFilter.status = status;
      }
      if (rating) {
        contractFilter.rating = rating;
      }
      if (hubId) {
        contractFilter.$or = [
          { reviewerHubId: new mongoose.Types.ObjectId(hubId) },
          { revieweeHubId: new mongoose.Types.ObjectId(hubId) },
        ];
      }
      if (Object.keys(dateFilter).length > 0) {
        contractFilter.createdAt = dateFilter;
      }
      if (search) {
        contractFilter.$or = [{ content: { $regex: search, $options: 'i' } }];
      }

      totalContract = await ContractReview.countDocuments(contractFilter);

      if (type === 'contract') {
        const skip = (page - 1) * limit;
        const contractReviews = await ContractReview.find(contractFilter)
          .sort(sortOrder)
          .skip(skip)
          .limit(limit)
          .lean();

        const formattedContract = await this.formatContractReviews(contractReviews);
        reviews.push(...formattedContract);
      }
    }

    // For combined type, merge and sort
    if (type === 'all') {
      const skip = (page - 1) * limit;

      // Get both types with enough items for pagination
      const bookingFilter: Record<string, unknown> = {};
      const contractFilter: Record<string, unknown> = {};

      if (status !== 'all') {
        bookingFilter.status = status;
        contractFilter.status = status;
      }
      if (rating) {
        bookingFilter.rating = rating;
        contractFilter.rating = rating;
      }

      const [bookingReviews, contractReviews] = await Promise.all([
        BookingReview.find(bookingFilter)
          .sort(sortOrder)
          .limit(skip + limit)
          .lean(),
        ContractReview.find(contractFilter)
          .sort(sortOrder)
          .limit(skip + limit)
          .lean(),
      ]);

      const [formattedBooking, formattedContract] = await Promise.all([
        this.formatBookingReviews(bookingReviews),
        this.formatContractReviews(contractReviews),
      ]);

      const allReviews = [...formattedBooking, ...formattedContract];

      // Sort combined results
      allReviews.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        if (sort === 'oldest') return dateA - dateB;
        if (sort === 'highest') return b.rating - a.rating || dateB - dateA;
        if (sort === 'lowest') return a.rating - b.rating || dateB - dateA;
        return dateB - dateA;
      });

      reviews.push(...allReviews.slice(skip, skip + limit));
    }

    const total =
      type === 'booking'
        ? totalBooking
        : type === 'contract'
          ? totalContract
          : totalBooking + totalContract;

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get review by ID
   * AC-AR-040 through AC-AR-043
   */
  async getReviewById(
    reviewId: string,
    type?: 'booking' | 'contract',
  ): Promise<AdminReviewResponse | null> {
    // Try booking review first (or if type specified)
    if (!type || type === 'booking') {
      const bookingReview = await BookingReview.findById(reviewId).lean();
      if (bookingReview) {
        const formatted = await this.formatBookingReviews([bookingReview]);
        return formatted[0] || null;
      }
    }

    // Try contract review
    if (!type || type === 'contract') {
      const contractReview = await ContractReview.findById(reviewId).lean();
      if (contractReview) {
        const formatted = await this.formatContractReviews([contractReview]);
        return formatted[0] || null;
      }
    }

    return null;
  }

  /**
   * Moderate a review (hide/unhide/delete)
   * AC-AR-050 through AC-AR-055
   */
  async moderateReview(
    reviewId: string,
    adminId: string,
    body: ModerateReviewBody,
  ): Promise<ModerationResponse | null> {
    const { action, reason } = body;

    // Determine new status based on action
    let newStatus: string;
    switch (action) {
      case 'hide':
        newStatus = 'hidden';
        break;
      case 'unhide':
        newStatus = 'active';
        break;
      case 'delete':
        newStatus = 'deleted';
        break;
      default:
        return null;
    }

    // Try booking review first
    const bookingReview = await BookingReview.findById(reviewId);
    if (bookingReview) {
      bookingReview.status = newStatus as BookingReviewStatus;
      bookingReview.moderatedBy = new mongoose.Types.ObjectId(adminId);
      bookingReview.moderatedAt = new Date();
      if (reason) {
        bookingReview.moderationReason = reason;
      }
      await bookingReview.save();

      // Trigger aggregation update (AC-AR-054)
      if (action === 'hide' || action === 'delete') {
        void reviewAggregationService.recalculateServiceStats(
          bookingReview.serviceId.toString(),
          bookingReview.serviceType,
        );
        void reviewAggregationService.recalculateHubStats(bookingReview.hubId.toString());
      }

      return {
        _id: bookingReview.id as string,
        status: bookingReview.status as 'active' | 'hidden' | 'deleted',
        moderatedBy: adminId,
        moderatedAt: bookingReview.moderatedAt?.toISOString() || new Date().toISOString(),
        moderationReason: bookingReview.moderationReason,
      };
    }

    // Try contract review
    const contractReview = await ContractReview.findById(reviewId);
    if (contractReview) {
      contractReview.status = newStatus as ContractReviewStatus;
      contractReview.moderatedBy = new mongoose.Types.ObjectId(adminId);
      contractReview.moderatedAt = new Date();
      if (reason) {
        contractReview.moderationReason = reason;
      }
      await contractReview.save();

      // Trigger aggregation update (AC-AR-054)
      if (action === 'hide' || action === 'delete') {
        void reviewAggregationService.recalculateHubStats(contractReview.revieweeHubId.toString());
      }

      return {
        _id: contractReview.id as string,
        status: contractReview.status as 'active' | 'hidden' | 'deleted',
        moderatedBy: adminId,
        moderatedAt: contractReview.moderatedAt?.toISOString() || new Date().toISOString(),
        moderationReason: contractReview.moderationReason,
      };
    }

    return null;
  }

  /**
   * Get review statistics
   * AC-AR-060 through AC-AR-066
   */
  async getStats(): Promise<AdminReviewStatsResponse> {
    // Get total counts by status
    const [bookingStats, contractStats] = await Promise.all([
      BookingReview.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            sumRating: { $sum: '$rating' },
          },
        },
      ]),
      ContractReview.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            sumRating: { $sum: '$rating' },
          },
        },
      ]),
    ]);

    // Calculate totals
    let bookingTotal = 0;
    let contractTotal = 0;
    let activeCount = 0;
    let hiddenCount = 0;
    let deletedCount = 0;
    let totalRatingSum = 0;
    let activeReviewCount = 0;

    for (const stat of bookingStats) {
      bookingTotal += stat.count;
      if (stat._id === 'active') {
        activeCount += stat.count;
        activeReviewCount += stat.count;
        totalRatingSum += stat.sumRating;
      } else if (stat._id === 'hidden') {
        hiddenCount += stat.count;
      } else if (stat._id === 'deleted') {
        deletedCount += stat.count;
      }
    }

    for (const stat of contractStats) {
      contractTotal += stat.count;
      if (stat._id === 'active') {
        activeCount += stat.count;
        activeReviewCount += stat.count;
        totalRatingSum += stat.sumRating;
      } else if (stat._id === 'hidden') {
        hiddenCount += stat.count;
      } else if (stat._id === 'deleted') {
        deletedCount += stat.count;
      }
    }

    // Get rating distribution (active reviews only)
    const [bookingRatingDist, contractRatingDist] = await Promise.all([
      BookingReview.aggregate([
        { $match: { status: BookingReviewStatus.ACTIVE } },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 },
          },
        },
      ]),
      ContractReview.aggregate([
        { $match: { status: ContractReviewStatus.ACTIVE } },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of bookingRatingDist) {
      const key = r._id as 1 | 2 | 3 | 4 | 5;
      if (key >= 1 && key <= 5) {
        ratingDistribution[key] += r.count;
      }
    }
    for (const r of contractRatingDist) {
      const key = r._id as 1 | 2 | 3 | 4 | 5;
      if (key >= 1 && key <= 5) {
        ratingDistribution[key] += r.count;
      }
    }

    // Get reviews by month (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [bookingByMonth, contractByMonth] = await Promise.all([
      BookingReview.aggregate([
        {
          $match: {
            status: BookingReviewStatus.ACTIVE,
            createdAt: { $gte: twelveMonthsAgo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
          },
        },
        { $sort: { _id: -1 } },
      ]),
      ContractReview.aggregate([
        {
          $match: {
            status: ContractReviewStatus.ACTIVE,
            createdAt: { $gte: twelveMonthsAgo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
          },
        },
        { $sort: { _id: -1 } },
      ]),
    ]);

    // Merge by month data
    const byMonthMap = new Map<string, { count: number; sumRating: number }>();
    for (const m of bookingByMonth) {
      byMonthMap.set(m._id, { count: m.count, sumRating: m.avgRating * m.count });
    }
    for (const m of contractByMonth) {
      const existing = byMonthMap.get(m._id) || { count: 0, sumRating: 0 };
      byMonthMap.set(m._id, {
        count: existing.count + m.count,
        sumRating: existing.sumRating + m.avgRating * m.count,
      });
    }

    const byMonth = Array.from(byMonthMap.entries())
      .map(([month, data]) => ({
        month,
        count: data.count,
        avgRating: Math.round((data.sumRating / data.count) * 10) / 10,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    const averageRating =
      activeReviewCount > 0 ? Math.round((totalRatingSum / activeReviewCount) * 10) / 10 : 0;

    return {
      totals: {
        bookingReviews: bookingTotal,
        contractReviews: contractTotal,
        totalReviews: bookingTotal + contractTotal,
      },
      averageRating,
      ratingDistribution,
      byStatus: {
        active: activeCount,
        hidden: hiddenCount,
        deleted: deletedCount,
      },
      byMonth,
    };
  }

  /**
   * Get review trends
   * AC-AR-070 through AC-AR-073
   */
  async getTrends(query: ReviewTrendsQuery): Promise<AdminReviewTrendsResponse> {
    const period = query.period || 'month';

    let dateFormat: string;
    let startDate: Date;
    const now = new Date();

    switch (period) {
      case 'week':
        dateFormat = '%Y-%U'; // Year-week
        startDate = new Date(now.getTime() - 52 * 7 * 24 * 60 * 60 * 1000); // 52 weeks
        break;
      case 'year':
        dateFormat = '%Y'; // Year
        startDate = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000); // 5 years
        break;
      default:
        dateFormat = '%Y-%m'; // Year-month
        startDate = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000); // 12 months
    }

    const [bookingTrends, contractTrends] = await Promise.all([
      BookingReview.aggregate([
        {
          $match: {
            status: BookingReviewStatus.ACTIVE,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
          },
        },
        { $sort: { _id: -1 } },
      ]),
      ContractReview.aggregate([
        {
          $match: {
            status: ContractReviewStatus.ACTIVE,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
          },
        },
        { $sort: { _id: -1 } },
      ]),
    ]);

    // Merge trends
    const trendsMap = new Map<
      string,
      { booking: number; contract: number; sumRating: number; totalCount: number }
    >();

    for (const t of bookingTrends) {
      trendsMap.set(t._id, {
        booking: t.count,
        contract: 0,
        sumRating: t.avgRating * t.count,
        totalCount: t.count,
      });
    }

    for (const t of contractTrends) {
      const existing = trendsMap.get(t._id) || {
        booking: 0,
        contract: 0,
        sumRating: 0,
        totalCount: 0,
      };
      trendsMap.set(t._id, {
        booking: existing.booking,
        contract: t.count,
        sumRating: existing.sumRating + t.avgRating * t.count,
        totalCount: existing.totalCount + t.count,
      });
    }

    const trends = Array.from(trendsMap.entries())
      .map(([date, data]) => ({
        date,
        bookingReviews: data.booking,
        contractReviews: data.contract,
        total: data.booking + data.contract,
        avgRating: Math.round((data.sumRating / data.totalCount) * 10) / 10,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      period,
      trends,
    };
  }

  /**
   * Format booking reviews for admin response
   */
  // biome-ignore lint/suspicious/noExplicitAny: Mongoose lean documents
  private async formatBookingReviews(reviews: any[]): Promise<AdminBookingReviewResponse[]> {
    if (reviews.length === 0) return [];

    // Collect IDs for batch loading
    const reviewerIds = reviews.map((r) => r.reviewerId);
    const hubIds = reviews.map((r) => r.hubId);
    const serviceIds = reviews.map((r) => r.serviceId);
    const bookingIds = reviews.map((r) => r.bookingId);

    // Batch load related data
    const [users, hubs, experiences, expertises, bookings] = await Promise.all([
      User.find({ _id: { $in: reviewerIds } })
        .select('name email profilePhoto')
        .lean(),
      Hub.find({ _id: { $in: hubIds } })
        .select('name logo')
        .lean(),
      Experience.find({ _id: { $in: serviceIds } })
        .select('experienceTitle slug')
        .lean(),
      Expertise.find({ _id: { $in: serviceIds } })
        .select('expertiseTitle slug')
        .lean(),
      Booking.find({ _id: { $in: bookingIds } })
        .select('bookingStartDate status totalCost currency')
        .lean(),
    ]);

    // Create lookup maps
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const hubMap = new Map(hubs.map((h) => [h._id.toString(), h]));
    const experienceMap = new Map(experiences.map((e) => [e._id.toString(), e]));
    const expertiseMap = new Map(expertises.map((e) => [e._id.toString(), e]));
    const bookingMap = new Map(bookings.map((b) => [b._id.toString(), b]));

    return reviews.map((review) => {
      const user = userMap.get(review.reviewerId?.toString());
      const hub = hubMap.get(review.hubId?.toString());
      const service =
        review.serviceType === 'experience'
          ? experienceMap.get(review.serviceId?.toString())
          : expertiseMap.get(review.serviceId?.toString());
      const booking = bookingMap.get(review.bookingId?.toString());

      // Get the service name from the right field
      const serviceName =
        review.serviceType === 'experience'
          ? (service as { experienceTitle?: string })?.experienceTitle
          : (service as { expertiseTitle?: string })?.expertiseTitle;

      return {
        _id: review._id.toString(),
        reviewType: 'booking' as const,
        rating: review.rating,
        content: review.content,
        photos: review.photos || [],
        status: review.status as 'active' | 'hidden' | 'deleted',
        serviceType: review.serviceType as 'experience' | 'expertise',
        isEdited: review.isEdited,
        createdAt: review.createdAt?.toISOString?.() || review.createdAt,
        updatedAt: review.updatedAt?.toISOString?.() || review.updatedAt,
        reviewer: {
          _id: review.reviewerId?.toString() || '',
          name: user?.name || 'Unknown User',
          email: user?.email || '',
          avatar: user?.profilePhoto,
        },
        service: {
          _id: review.serviceId?.toString() || '',
          name: serviceName || 'Unknown Service',
          type: review.serviceType as 'experience' | 'expertise',
          slug: service?.slug,
        },
        hub: {
          _id: review.hubId?.toString() || '',
          name: hub?.name || 'Unknown Hub',
          logo: hub?.logo,
        },
        booking: booking
          ? {
              _id: booking._id.toString(),
              bookingDate: booking.bookingStartDate?.toISOString?.(),
              status: booking.status,
              totalPaid: booking.totalCost,
              currency: booking.currency,
            }
          : undefined,
        moderatedBy: review.moderatedBy?.toString(),
        moderatedAt: review.moderatedAt?.toISOString?.(),
        moderationReason: review.moderationReason,
      };
    });
  }

  /**
   * Format contract reviews for admin response
   */
  // biome-ignore lint/suspicious/noExplicitAny: Mongoose lean documents
  private async formatContractReviews(reviews: any[]): Promise<AdminContractReviewResponse[]> {
    if (reviews.length === 0) return [];

    // Collect IDs for batch loading
    const hubIds: string[] = [];
    const jobIds = reviews.map((r) => r.jobId?.toString());
    const contractIds = reviews.map((r) => r.contractId?.toString());

    for (const r of reviews) {
      hubIds.push(r.reviewerHubId?.toString());
      hubIds.push(r.revieweeHubId?.toString());
    }

    // Batch load related data
    const [hubs, jobs, contracts] = await Promise.all([
      Hub.find({ _id: { $in: hubIds } })
        .select('name logo')
        .lean(),
      Job.find({ _id: { $in: jobIds } })
        .select('jobTitle')
        .lean(),
      Contract.find({ _id: { $in: contractIds } })
        .select('status')
        .lean(),
    ]);

    // Create lookup maps
    const hubMap = new Map(hubs.map((h) => [h._id.toString(), h]));
    const jobMap = new Map(jobs.map((j) => [j._id.toString(), j]));
    const contractMap = new Map(contracts.map((c) => [c._id.toString(), c]));

    return reviews.map((review) => {
      const reviewerHub = hubMap.get(review.reviewerHubId?.toString());
      const revieweeHub = hubMap.get(review.revieweeHubId?.toString());
      const job = jobMap.get(review.jobId?.toString());
      const contract = contractMap.get(review.contractId?.toString());

      return {
        _id: review._id.toString(),
        reviewType: 'contract' as const,
        rating: review.rating,
        criteriaRatings: review.criteriaRatings,
        content: review.content,
        status: review.status as 'active' | 'hidden' | 'deleted',
        isEdited: review.isEdited,
        createdAt: review.createdAt?.toISOString?.() || review.createdAt,
        updatedAt: review.updatedAt?.toISOString?.() || review.updatedAt,
        reviewerHub: {
          _id: review.reviewerHubId?.toString() || '',
          name: reviewerHub?.name || 'Unknown Hub',
          logo: reviewerHub?.logo,
        },
        revieweeHub: {
          _id: review.revieweeHubId?.toString() || '',
          name: revieweeHub?.name || 'Unknown Hub',
          logo: revieweeHub?.logo,
        },
        job: {
          _id: review.jobId?.toString() || '',
          title: job?.jobTitle || 'Unknown Job',
        },
        contract: {
          _id: review.contractId?.toString() || '',
          status: contract?.status,
        },
        moderatedBy: review.moderatedBy?.toString(),
        moderatedAt: review.moderatedAt?.toISOString?.(),
        moderationReason: review.moderationReason,
      };
    });
  }
}

export const adminReviewService = new AdminReviewService();
