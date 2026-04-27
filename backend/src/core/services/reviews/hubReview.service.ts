/**
 * Hub Review Service
 * Business logic for viewing reviews in hub dashboard
 */

import {
  BookingReview,
  BookingReviewServiceType,
  BookingReviewStatus,
} from '@core/models/BookingReview';
import { Experience } from '@core/models/Experience';
import { Expertise } from '@core/models/Expertise';
import { User } from '@core/models/User';
import type {
  HubDashboardReviewResponse,
  HubReviewListResponse,
  HubReviewStatsResponse,
  HubReviewsQuery,
} from '@core/schemas/hub/reviews/hubReview.schema';
import mongoose from 'mongoose';

/**
 * Get first name initial and last name (e.g., "John D.")
 */
function formatReviewerName(fullName: string): string {
  if (!fullName) return 'Anonymous';
  const parts = fullName
    .trim()
    .split(' ')
    .filter((p): p is string => Boolean(p));
  if (parts.length === 0) {
    return 'Anonymous';
  }
  if (parts.length === 1) {
    return parts[0] ?? 'Anonymous';
  }
  const firstName = parts[0] ?? '';
  const lastName = parts[parts.length - 1] ?? '';
  if (!firstName || !lastName) return 'Anonymous';
  return `${firstName} ${lastName.charAt(0)}.`;
}

/**
 * Hub Review Service class
 */
class HubReviewService {
  /**
   * List reviews for a hub (dashboard view)
   * AC-BR-080 through AC-BR-084
   */
  async listHubReviews(hubId: string, query: HubReviewsQuery): Promise<HubReviewListResponse> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 50);
    const skip = (page - 1) * limit;

    // Build filter (AC-BR-082)
    const filter: Record<string, unknown> = {
      hubId: new mongoose.Types.ObjectId(hubId),
      status: BookingReviewStatus.ACTIVE,
    };

    if (query.serviceType) {
      filter.serviceType =
        query.serviceType === 'experience'
          ? BookingReviewServiceType.EXPERIENCE
          : BookingReviewServiceType.EXPERTISE;
    }

    if (query.serviceId) {
      filter.serviceId = new mongoose.Types.ObjectId(query.serviceId);
    }

    if (query.rating) {
      filter.rating = query.rating;
    }

    // Get total count
    const total = await BookingReview.countDocuments(filter);

    // Get reviews with pagination
    const reviews = await BookingReview.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Collect service IDs by type
    const experienceIds: string[] = [];
    const expertiseIds: string[] = [];
    const reviewerIds: string[] = [];

    for (const review of reviews) {
      const reviewerIdStr = review.reviewerId?.toString?.();
      if (reviewerIdStr) reviewerIds.push(reviewerIdStr);

      const serviceIdStr = review.serviceId?.toString?.();
      if (serviceIdStr) {
        if (review.serviceType === BookingReviewServiceType.EXPERIENCE) {
          experienceIds.push(serviceIdStr);
        } else {
          expertiseIds.push(serviceIdStr);
        }
      }
    }

    // Batch load experiences, expertises, and reviewers
    const [experiences, expertises, reviewers] = await Promise.all([
      experienceIds.length > 0
        ? Experience.find({ _id: { $in: experienceIds } })
            .select('experienceTitle')
            .lean()
        : [],
      expertiseIds.length > 0
        ? Expertise.find({ _id: { $in: expertiseIds } })
            .select('expertiseTitle')
            .lean()
        : [],
      reviewerIds.length > 0
        ? User.find({ _id: { $in: reviewerIds } })
            .select('name profilePhoto')
            .lean()
        : [],
    ]);

    // Create lookup maps
    const experienceMap = new Map(experiences.map((e) => [e._id.toString(), e]));
    const expertiseMap = new Map(expertises.map((e) => [e._id.toString(), e]));
    const reviewerMap = new Map(reviewers.map((r) => [r._id.toString(), r]));

    // Format reviews (AC-BR-083)
    const formattedReviews: HubDashboardReviewResponse[] = reviews.map((review) => {
      const serviceId = review.serviceId?.toString?.() || '';
      const reviewerIdStr = review.reviewerId?.toString?.() || '';
      const reviewer = reviewerIdStr ? reviewerMap.get(reviewerIdStr) : undefined;

      let serviceName = 'Unknown Service';
      if (review.serviceType === BookingReviewServiceType.EXPERIENCE) {
        const experience = experienceMap.get(serviceId);
        if (experience) {
          serviceName = experience.experienceTitle;
        }
      } else {
        const expertise = expertiseMap.get(serviceId);
        if (expertise) {
          serviceName = expertise.expertiseTitle;
        }
      }

      return {
        _id: review._id?.toString?.() || '',
        bookingId: review.bookingId?.toString?.() || '',
        serviceName,
        serviceType: review.serviceType as 'experience' | 'expertise',
        serviceId,
        rating: review.rating,
        content: review.content,
        photos: review.photos || [],
        reviewer: {
          name: reviewer ? formatReviewerName(reviewer.name) : 'Anonymous',
          avatar: reviewer?.profilePhoto,
        },
        hubReply: review.hubReply
          ? {
              content: review.hubReply.content,
              createdAt: review.hubReply.createdAt?.toISOString?.() || new Date().toISOString(),
              updatedAt: review.hubReply.updatedAt?.toISOString?.(),
            }
          : undefined,
        isEdited: review.isEdited || false,
        createdAt: review.createdAt?.toISOString?.() || new Date().toISOString(),
      };
    });

    return {
      reviews: formattedReviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Add hub reply to a booking review
   */
  async addHubReply(
    hubId: string,
    bookingId: string,
    content: string,
  ): Promise<{ hubReply: { content: string; createdAt: Date } }> {
    // Find the review by bookingId and verify it belongs to this hub
    const review = await BookingReview.findOne({
      bookingId: new mongoose.Types.ObjectId(bookingId),
      hubId: new mongoose.Types.ObjectId(hubId),
      status: BookingReviewStatus.ACTIVE,
    });

    if (!review) {
      throw new Error('Review not found for this booking');
    }

    if (review.hubReply) {
      throw new Error('Hub reply already exists. Use update instead.');
    }

    const now = new Date();
    review.hubReply = {
      content,
      createdAt: now,
    };
    await review.save();

    return {
      hubReply: {
        content,
        createdAt: now,
      },
    };
  }

  /**
   * Update hub reply
   */
  async updateHubReply(
    hubId: string,
    bookingId: string,
    content: string,
  ): Promise<{ hubReply: { content: string; createdAt: Date; updatedAt: Date } }> {
    const review = await BookingReview.findOne({
      bookingId: new mongoose.Types.ObjectId(bookingId),
      hubId: new mongoose.Types.ObjectId(hubId),
      status: BookingReviewStatus.ACTIVE,
    });

    if (!review) {
      throw new Error('Review not found for this booking');
    }

    if (!review.hubReply) {
      throw new Error('No hub reply exists to update');
    }

    const now = new Date();
    review.hubReply = {
      content,
      createdAt: review.hubReply.createdAt,
      updatedAt: now,
    };
    await review.save();

    return {
      hubReply: {
        content,
        createdAt: review.hubReply.createdAt,
        updatedAt: now,
      },
    };
  }

  /**
   * Delete hub reply
   */
  async deleteHubReply(hubId: string, bookingId: string): Promise<boolean> {
    const review = await BookingReview.findOne({
      bookingId: new mongoose.Types.ObjectId(bookingId),
      hubId: new mongoose.Types.ObjectId(hubId),
      status: BookingReviewStatus.ACTIVE,
    });

    if (!review) {
      throw new Error('Review not found for this booking');
    }

    if (!review.hubReply) {
      throw new Error('No hub reply exists to delete');
    }

    review.hubReply = undefined;
    await review.save();

    return true;
  }

  /**
   * Get hub review statistics
   */
  async getHubReviewStats(hubId: string): Promise<HubReviewStatsResponse> {
    const stats = await BookingReview.aggregate([
      {
        $match: {
          hubId: new mongoose.Types.ObjectId(hubId),
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
          totalWithReplies: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ['$hubReply', null] }, { $ne: ['$hubReply.content', null] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          averageRating: { $round: [{ $ifNull: ['$averageRating', 0] }, 1] },
          totalReviews: 1,
          ratingDistribution: {
            1: '$rating1',
            2: '$rating2',
            3: '$rating3',
            4: '$rating4',
            5: '$rating5',
          },
          totalWithReplies: 1,
          responseRate: {
            $cond: [
              { $eq: ['$totalReviews', 0] },
              0,
              {
                $round: [
                  { $multiply: [{ $divide: ['$totalWithReplies', '$totalReviews'] }, 100] },
                  0,
                ],
              },
            ],
          },
        },
      },
    ]);

    return (
      stats[0] || {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        responseRate: 0,
        totalWithReplies: 0,
      }
    );
  }
}

export const hubReviewService = new HubReviewService();
