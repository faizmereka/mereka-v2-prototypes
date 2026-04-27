/**
 * Review Aggregation Service
 * Calculates and updates rating statistics when reviews change
 *
 * Implements:
 * - AC-AG-001 through AC-AG-006: Trigger conditions
 * - AC-AG-010 through AC-AG-017: BookingReview aggregation
 * - AC-AG-020 through AC-AG-022: ContractReview aggregation
 * - AC-AG-030 through AC-AG-033: Aggregation pipeline requirements
 * - AC-AG-040 through AC-AG-042: Performance requirements
 */

import type { IBookingReview } from '@core/models/BookingReview';
import { BookingReview, BookingReviewStatus } from '@core/models/BookingReview';
import type { IContractReview } from '@core/models/ContractReview';
import { ContractReview, ContractReviewStatus } from '@core/models/ContractReview';
import { Experience } from '@core/models/Experience';
import { Expertise } from '@core/models/Expertise';
import { Hub } from '@core/models/Hub';
import mongoose from 'mongoose';

/**
 * Review stats interface
 */
interface IReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  lastReviewAt: Date | null;
}

/**
 * Internal aggregation result
 */
interface AggregationResult {
  count: number;
  sum: number;
  r1: number;
  r2: number;
  r3: number;
  r4: number;
  r5: number;
  lastAt: Date | null;
}

/**
 * Review Aggregation Service
 */
class ReviewAggregationService {
  /**
   * Recalculate stats for a specific service (Experience/Expertise)
   * AC-AG-010, AC-AG-011, AC-AG-013 through AC-AG-017
   */
  async recalculateServiceStats(
    serviceId: string,
    serviceType: 'experience' | 'expertise',
  ): Promise<void> {
    try {
      const stats = await BookingReview.aggregate([
        {
          $match: {
            serviceId: new mongoose.Types.ObjectId(serviceId),
            serviceType,
            status: BookingReviewStatus.ACTIVE,
          },
        },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
            rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
            rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
            rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
            rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
            rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
            lastReviewAt: { $max: '$createdAt' },
          },
        },
        {
          $project: {
            _id: 0,
            averageRating: { $round: ['$averageRating', 1] },
            totalReviews: 1,
            ratingDistribution: {
              1: '$rating1',
              2: '$rating2',
              3: '$rating3',
              4: '$rating4',
              5: '$rating5',
            },
            lastReviewAt: 1,
          },
        },
      ]);

      // AC-AG-031: Handle zero reviews
      const reviewStats: IReviewStats = stats[0] || {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        lastReviewAt: null,
      };

      // AC-AG-032: Atomic update with full stats object
      if (serviceType === 'experience') {
        await Experience.findByIdAndUpdate(serviceId, { $set: { reviewStats } });
      } else {
        await Expertise.findByIdAndUpdate(serviceId, { $set: { reviewStats } });
      }
    } catch (error) {
      // AC-AG-042: Log error but don't fail
      console.error('Failed to recalculate service review stats', {
        error,
        serviceId,
        serviceType,
      });
    }
  }

  /**
   * Recalculate stats for a hub (includes both booking and contract reviews)
   * AC-AG-012, AC-AG-020 through AC-AG-022
   */
  async recalculateHubStats(hubId: string): Promise<void> {
    try {
      // Get booking review stats
      const bookingStatsResult = await BookingReview.aggregate<AggregationResult>([
        {
          $match: {
            hubId: new mongoose.Types.ObjectId(hubId),
            status: BookingReviewStatus.ACTIVE,
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            sum: { $sum: '$rating' },
            r1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
            r2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
            r3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
            r4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
            r5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
            lastAt: { $max: '$createdAt' },
          },
        },
      ]);

      // Get contract review stats (reviews received by this hub)
      const contractStatsResult = await ContractReview.aggregate<AggregationResult>([
        {
          $match: {
            revieweeHubId: new mongoose.Types.ObjectId(hubId),
            status: ContractReviewStatus.ACTIVE,
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            sum: { $sum: '$rating' },
            r1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
            r2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
            r3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
            r4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
            r5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
            lastAt: { $max: '$createdAt' },
          },
        },
      ]);

      // Combine stats (AC-AG-022)
      const b: AggregationResult = bookingStatsResult[0] || {
        count: 0,
        sum: 0,
        r1: 0,
        r2: 0,
        r3: 0,
        r4: 0,
        r5: 0,
        lastAt: null,
      };
      const c: AggregationResult = contractStatsResult[0] || {
        count: 0,
        sum: 0,
        r1: 0,
        r2: 0,
        r3: 0,
        r4: 0,
        r5: 0,
        lastAt: null,
      };

      const totalReviews = b.count + c.count;
      const totalSum = b.sum + c.sum;

      // AC-AG-014: Round to 1 decimal place
      const averageRating = totalReviews > 0 ? Math.round((totalSum / totalReviews) * 10) / 10 : 0;

      // Get the most recent review date
      const dates = [b.lastAt, c.lastAt].filter((d): d is Date => d !== null);
      let lastReviewAt: Date | null = null;
      if (dates.length > 0) {
        dates.sort((a, b) => b.getTime() - a.getTime());
        lastReviewAt = dates[0] ?? null;
      }

      const reviewStats: IReviewStats = {
        averageRating,
        totalReviews,
        ratingDistribution: {
          1: b.r1 + c.r1,
          2: b.r2 + c.r2,
          3: b.r3 + c.r3,
          4: b.r4 + c.r4,
          5: b.r5 + c.r5,
        },
        lastReviewAt,
      };

      // AC-AG-032: Atomic update
      await Hub.findByIdAndUpdate(hubId, { $set: { reviewStats } });
    } catch (error) {
      // AC-AG-042: Log error but don't fail
      console.error('Failed to recalculate hub review stats', {
        error,
        hubId,
      });
    }
  }

  /**
   * Called after BookingReview create/update/delete
   * AC-AG-001, AC-AG-002, AC-AG-003
   */
  async onBookingReviewChange(review: IBookingReview): Promise<void> {
    try {
      // AC-AG-010, AC-AG-011: Update service stats
      await this.recalculateServiceStats(review.serviceId.toString(), review.serviceType);

      // AC-AG-012: Update hub stats
      await this.recalculateHubStats(review.hubId.toString());
    } catch (error) {
      console.error('Failed to recalculate review stats', {
        error,
        reviewId: review._id,
        serviceId: review.serviceId,
        hubId: review.hubId,
      });
      // AC-AG-042: Don't throw - aggregation failure shouldn't fail the review operation
    }
  }

  /**
   * Called after ContractReview create/update/delete
   * AC-AG-004, AC-AG-005, AC-AG-006
   */
  async onContractReviewChange(review: IContractReview): Promise<void> {
    try {
      // AC-AG-020: Update reviewee hub stats
      await this.recalculateHubStats(review.revieweeHubId.toString());
    } catch (error) {
      console.error('Failed to recalculate contract review stats', {
        error,
        reviewId: review._id,
        revieweeHubId: review.revieweeHubId,
      });
      // AC-AG-042: Don't throw - aggregation failure shouldn't fail the review operation
    }
  }

  /**
   * Get current stats for a service (reads from model, doesn't recalculate)
   */
  async getServiceStats(
    serviceId: string,
    serviceType: 'experience' | 'expertise',
  ): Promise<IReviewStats | null> {
    try {
      let service: { reviewStats?: unknown } | null = null;
      if (serviceType === 'experience') {
        service = await Experience.findById(serviceId).select('reviewStats').lean();
      } else {
        service = await Expertise.findById(serviceId).select('reviewStats').lean();
      }

      if (!service || !service.reviewStats) {
        return null;
      }

      return service.reviewStats as IReviewStats;
    } catch (error) {
      console.error('Failed to get service stats', {
        error,
        serviceId,
        serviceType,
      });
      return null;
    }
  }

  /**
   * Get current stats for a hub (reads from model, doesn't recalculate)
   */
  async getHubStats(hubId: string): Promise<IReviewStats | null> {
    try {
      const hub = await Hub.findById(hubId).select('reviewStats').lean();

      if (!hub || !hub.reviewStats) {
        return null;
      }

      return hub.reviewStats as IReviewStats;
    } catch (error) {
      console.error('Failed to get hub stats', {
        error,
        hubId,
      });
      return null;
    }
  }

  /**
   * Admin endpoint: Recalculate all stats for a hub (force refresh)
   */
  async recalculateAllHubStats(hubId: string): Promise<void> {
    await this.recalculateHubStats(hubId);
  }

  /**
   * Admin endpoint: Recalculate all stats for all hubs (batch)
   */
  async recalculateAllStats(): Promise<{
    hubsProcessed: number;
    experiencesProcessed: number;
    expertisesProcessed: number;
    errors: number;
  }> {
    let hubsProcessed = 0;
    let experiencesProcessed = 0;
    let expertisesProcessed = 0;
    let errors = 0;

    try {
      // Get all hubs with reviews
      const hubsWithReviews = await BookingReview.distinct('hubId');
      const hubsWithContractReviews = await ContractReview.distinct('revieweeHubId');
      const allHubIds = [...new Set([...hubsWithReviews, ...hubsWithContractReviews])];

      for (const hubId of allHubIds) {
        try {
          await this.recalculateHubStats(hubId.toString());
          hubsProcessed++;
        } catch {
          errors++;
        }
      }

      // Get all experiences with reviews
      const experienceIds = await BookingReview.distinct('serviceId', {
        serviceType: 'experience',
      });
      for (const expId of experienceIds) {
        try {
          await this.recalculateServiceStats(expId.toString(), 'experience');
          experiencesProcessed++;
        } catch {
          errors++;
        }
      }

      // Get all expertises with reviews
      const expertiseIds = await BookingReview.distinct('serviceId', {
        serviceType: 'expertise',
      });
      for (const expertiseId of expertiseIds) {
        try {
          await this.recalculateServiceStats(expertiseId.toString(), 'expertise');
          expertisesProcessed++;
        } catch {
          errors++;
        }
      }
    } catch (error) {
      console.error('Failed to recalculate all stats', { error });
      errors++;
    }

    return {
      hubsProcessed,
      experiencesProcessed,
      expertisesProcessed,
      errors,
    };
  }
}

export const reviewAggregationService = new ReviewAggregationService();
