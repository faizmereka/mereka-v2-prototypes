/**
 * Review Service
 * Business logic for booking reviews (learner → service/hub)
 */

import { Booking, BookingStatus, BookingType } from '@core/models/Booking';
import {
  BookingReview,
  BookingReviewServiceType,
  BookingReviewStatus,
} from '@core/models/BookingReview';
import { Experience } from '@core/models/Experience';
import { Expertise } from '@core/models/Expertise';
import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import type {
  CreateReviewInput,
  HubReviewsQuery,
  ListReviewsQuery,
  PublicReviewResponse,
  ReviewListResponse,
  ReviewStatsResponse,
  ReviewWithReplyItem,
  ToReviewItem,
  UpdateReviewInput,
  UserReviewResponse,
} from '@core/schemas/web/reviews/userReview.schema';
import { conversationTriggerService } from '@core/services/shared/chat/conversationTrigger.service';
import { communicationTriggerService } from '@services/communications';
import mongoose from 'mongoose';

/**
 * Error codes for review operations
 */
export enum ReviewErrorCode {
  BOOKING_NOT_FOUND = 'BOOKING_NOT_FOUND',
  BOOKING_NOT_OWNED = 'BOOKING_NOT_OWNED',
  BOOKING_NOT_COMPLETED = 'BOOKING_NOT_COMPLETED',
  SPACE_BOOKING_NOT_REVIEWABLE = 'SPACE_BOOKING_NOT_REVIEWABLE',
  INVALID_BOOKING = 'INVALID_BOOKING',
  REVIEW_EXISTS = 'REVIEW_EXISTS',
  REVIEW_NOT_FOUND = 'REVIEW_NOT_FOUND',
  REVIEW_NOT_OWNED = 'REVIEW_NOT_OWNED',
  REVIEW_EDIT_EXPIRED = 'REVIEW_EDIT_EXPIRED',
  INVALID_RATING = 'INVALID_RATING',
  CONTENT_TOO_SHORT = 'CONTENT_TOO_SHORT',
  CONTENT_TOO_LONG = 'CONTENT_TOO_LONG',
  TOO_MANY_PHOTOS = 'TOO_MANY_PHOTOS',
}

/**
 * Create review error
 */
class ReviewError extends Error {
  code: ReviewErrorCode;

  constructor(code: ReviewErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'ReviewError';
  }
}

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
 * Review Service class
 */
class ReviewService {
  /**
   * Create a new review for a booking
   * AC-BR-001 through AC-BR-012
   */
  async createReview(userId: string, input: CreateReviewInput): Promise<UserReviewResponse> {
    const { bookingId, rating, content, photos = [] } = input;

    // Validate rating (AC-BR-008)
    if (rating < 1 || rating > 5) {
      throw new ReviewError(ReviewErrorCode.INVALID_RATING, 'Rating must be between 1 and 5');
    }

    // Validate content length (AC-BR-009)
    if (content.length < 25) {
      throw new ReviewError(
        ReviewErrorCode.CONTENT_TOO_SHORT,
        'Review content must be at least 25 characters',
      );
    }
    if (content.length > 2000) {
      throw new ReviewError(
        ReviewErrorCode.CONTENT_TOO_LONG,
        'Review content must not exceed 2000 characters',
      );
    }

    // Validate photos count (AC-BR-010)
    if (photos.length > 5) {
      throw new ReviewError(ReviewErrorCode.TOO_MANY_PHOTOS, 'Maximum 5 photos allowed');
    }

    // Find booking (AC-BR-004)
    const booking = await Booking.findById(bookingId).lean();
    if (!booking) {
      throw new ReviewError(ReviewErrorCode.BOOKING_NOT_FOUND, 'Booking not found');
    }

    // Verify ownership (AC-BR-005)
    if (booking.bookedBy?.toString() !== userId) {
      throw new ReviewError(ReviewErrorCode.BOOKING_NOT_OWNED, 'You do not own this booking');
    }

    // Check booking status (AC-BR-006)
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new ReviewError(
        ReviewErrorCode.BOOKING_NOT_COMPLETED,
        'Only completed bookings can be reviewed',
      );
    }

    // Check if booking is for a reviewable service type
    if (booking.bookingType === BookingType.SPACE) {
      throw new ReviewError(
        ReviewErrorCode.SPACE_BOOKING_NOT_REVIEWABLE,
        'Space bookings cannot be reviewed',
      );
    }

    // Check service reference exists
    if (!booking.serviceId) {
      throw new ReviewError(ReviewErrorCode.INVALID_BOOKING, 'Booking has no service reference');
    }

    // Map booking type to service type
    const serviceType =
      booking.bookingType === BookingType.EXPERIENCE
        ? BookingReviewServiceType.EXPERIENCE
        : BookingReviewServiceType.EXPERTISE;

    // Check if any review already exists (including deleted ones)
    const existingReview = await BookingReview.findOne({ bookingId });

    // If active/hidden review exists, don't allow creating a new one (AC-BR-007)
    if (existingReview && existingReview.status !== BookingReviewStatus.DELETED) {
      throw new ReviewError(
        ReviewErrorCode.REVIEW_EXISTS,
        'Review already exists for this booking',
      );
    }

    let review: import('@core/models/BookingReview').IBookingReview | null;
    if (existingReview && existingReview.status === BookingReviewStatus.DELETED) {
      // Restore deleted review with new content
      review = await BookingReview.findByIdAndUpdate(
        existingReview._id,
        {
          $set: {
            rating,
            content,
            photos,
            status: BookingReviewStatus.ACTIVE,
            isEdited: false,
            editedAt: undefined,
            moderatedBy: undefined,
            moderatedAt: undefined,
            moderationReason: undefined,
          },
        },
        { new: true },
      );
    } else {
      // Create new review (AC-BR-012)
      review = await BookingReview.create({
        bookingId: new mongoose.Types.ObjectId(bookingId),
        serviceId: booking.serviceId,
        serviceType,
        hubId: booking.hubId,
        reviewerId: new mongoose.Types.ObjectId(userId),
        rating,
        content,
        photos,
        status: BookingReviewStatus.ACTIVE,
        isEdited: false,
      });
    }

    // Trigger aggregation update (AC-BR-011) - non-blocking
    void this.triggerAggregationUpdate(
      booking.serviceId.toString(),
      serviceType,
      booking.hubId.toString(),
    );

    // Send review event to chat room (non-blocking)
    // Get reviewer name for chat message
    const reviewer = await User.findById(userId).select('name').lean();
    const reviewerName = reviewer?.name || 'User';
    void conversationTriggerService.addBookingReviewEvent(
      bookingId,
      reviewerName,
      rating,
      review?._id as mongoose.Types.ObjectId | undefined,
    );

    // Send NEW_REVIEW_RECEIVED notification to hub (non-blocking)
    void this.sendNewReviewNotificationToHub(booking, review, reviewerName, serviceType);

    return this.formatUserReviewResponse(review);
  }

  /**
   * Get review by booking ID
   * AC-BR-020 through AC-BR-022
   */
  async getReviewByBookingId(
    userId: string,
    bookingId: string,
  ): Promise<UserReviewResponse | null> {
    // Verify user owns the booking (AC-BR-022)
    const booking = await Booking.findById(bookingId).select('bookedBy').lean();
    if (!booking) {
      throw new ReviewError(ReviewErrorCode.BOOKING_NOT_FOUND, 'Booking not found');
    }
    if (booking.bookedBy?.toString() !== userId) {
      throw new ReviewError(ReviewErrorCode.BOOKING_NOT_OWNED, 'You do not own this booking');
    }

    // Find review (AC-BR-020, AC-BR-021)
    const review = await BookingReview.findOne({ bookingId }).lean();
    if (!review) {
      return null; // AC-BR-021: Return null, not error
    }

    return this.formatUserReviewResponse(review);
  }

  /**
   * Update a review
   * AC-BR-030 through AC-BR-036
   */
  async updateReview(
    userId: string,
    reviewId: string,
    input: UpdateReviewInput,
  ): Promise<UserReviewResponse> {
    // Find review (AC-BR-031)
    const review = await BookingReview.findById(reviewId);
    if (!review) {
      throw new ReviewError(ReviewErrorCode.REVIEW_NOT_FOUND, 'Review not found');
    }

    // Verify ownership (AC-BR-032)
    if (review.reviewerId.toString() !== userId) {
      throw new ReviewError(ReviewErrorCode.REVIEW_NOT_OWNED, 'You do not own this review');
    }

    // Check if review can be edited (within 30 days) (AC-BR-033)
    const daysSinceCreated = Math.floor(
      (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceCreated > 30) {
      throw new ReviewError(
        ReviewErrorCode.REVIEW_EDIT_EXPIRED,
        'Review can only be edited within 30 days of creation',
      );
    }

    // Check if review is still active
    if (review.status !== BookingReviewStatus.ACTIVE) {
      throw new ReviewError(ReviewErrorCode.REVIEW_NOT_FOUND, 'Review is no longer active');
    }

    // Validate input
    if (input.rating !== undefined && (input.rating < 1 || input.rating > 5)) {
      throw new ReviewError(ReviewErrorCode.INVALID_RATING, 'Rating must be between 1 and 5');
    }
    if (input.content !== undefined) {
      if (input.content.length < 25) {
        throw new ReviewError(
          ReviewErrorCode.CONTENT_TOO_SHORT,
          'Review content must be at least 25 characters',
        );
      }
      if (input.content.length > 2000) {
        throw new ReviewError(
          ReviewErrorCode.CONTENT_TOO_LONG,
          'Review content must not exceed 2000 characters',
        );
      }
    }
    if (input.photos !== undefined && input.photos.length > 5) {
      throw new ReviewError(ReviewErrorCode.TOO_MANY_PHOTOS, 'Maximum 5 photos allowed');
    }

    const oldRating = review.rating;

    // Update fields
    if (input.rating !== undefined) {
      review.rating = input.rating;
    }
    if (input.content !== undefined) {
      review.content = input.content;
    }
    if (input.photos !== undefined) {
      review.photos = input.photos;
    }

    // Mark as edited (AC-BR-034)
    review.isEdited = true;
    review.editedAt = new Date();

    await review.save();

    // Trigger aggregation update if rating changed (AC-BR-035)
    if (input.rating !== undefined && input.rating !== oldRating) {
      void this.triggerAggregationUpdate(
        review.serviceId.toString(),
        review.serviceType,
        review.hubId.toString(),
      );
    }

    return this.formatUserReviewResponse(review);
  }

  /**
   * Delete a review (soft delete)
   * AC-BR-040 through AC-BR-045
   */
  async deleteReview(userId: string, reviewId: string): Promise<{ message: string }> {
    // Find review (AC-BR-042)
    const review = await BookingReview.findById(reviewId);
    if (!review) {
      throw new ReviewError(ReviewErrorCode.REVIEW_NOT_FOUND, 'Review not found');
    }

    // Verify ownership (AC-BR-043)
    if (review.reviewerId.toString() !== userId) {
      throw new ReviewError(ReviewErrorCode.REVIEW_NOT_OWNED, 'You do not own this review');
    }

    // Soft delete (AC-BR-041)
    review.status = BookingReviewStatus.DELETED;
    await review.save();

    // Trigger aggregation update (AC-BR-044)
    void this.triggerAggregationUpdate(
      review.serviceId.toString(),
      review.serviceType,
      review.hubId.toString(),
    );

    return { message: 'Review deleted successfully' };
  }

  /**
   * Update a review by booking ID
   * Finds the review by bookingId and updates it
   */
  async updateReviewByBookingId(
    userId: string,
    bookingId: string,
    input: UpdateReviewInput,
  ): Promise<UserReviewResponse> {
    // Find review by booking ID
    const review = await BookingReview.findOne({
      bookingId: new mongoose.Types.ObjectId(bookingId),
      status: BookingReviewStatus.ACTIVE,
    });

    if (!review) {
      throw new ReviewError(ReviewErrorCode.REVIEW_NOT_FOUND, 'Review not found for this booking');
    }

    // Use existing updateReview method with the found review ID
    return this.updateReview(userId, (review._id as mongoose.Types.ObjectId).toString(), input);
  }

  /**
   * Delete a review by booking ID (soft delete)
   * Finds the review by bookingId and deletes it
   */
  async deleteReviewByBookingId(userId: string, bookingId: string): Promise<{ message: string }> {
    // Find review by booking ID
    const review = await BookingReview.findOne({
      bookingId: new mongoose.Types.ObjectId(bookingId),
      status: BookingReviewStatus.ACTIVE,
    });

    if (!review) {
      throw new ReviewError(ReviewErrorCode.REVIEW_NOT_FOUND, 'Review not found for this booking');
    }

    // Use existing deleteReview method with the found review ID
    return this.deleteReview(userId, (review._id as mongoose.Types.ObjectId).toString());
  }

  /**
   * List reviews written by the current user
   */
  async listMyReviews(
    userId: string,
    query: { page?: number; limit?: number },
  ): Promise<{
    reviews: import('@core/schemas/web/reviews/userReview.schema').MyReviewListItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 50);
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {
      reviewerId: new mongoose.Types.ObjectId(userId),
      status: BookingReviewStatus.ACTIVE,
    };

    // Get total count
    const total = await BookingReview.countDocuments(filter);

    // Get reviews with pagination
    const reviews = await BookingReview.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Import Experience and Expertise models
    const { Experience } = await import('@core/models/Experience');
    const { Expertise } = await import('@core/models/Expertise');
    const { Hub } = await import('@core/models/Hub');

    // Collect IDs for batch loading
    const experienceIds: string[] = [];
    const expertiseIds: string[] = [];
    const hubIds: string[] = [];
    const bookingIds: string[] = [];

    for (const review of reviews) {
      const serviceIdStr = review.serviceId?.toString?.();
      if (serviceIdStr) {
        if (review.serviceType === BookingReviewServiceType.EXPERIENCE) {
          experienceIds.push(serviceIdStr);
        } else {
          expertiseIds.push(serviceIdStr);
        }
      }
      const hubIdStr = review.hubId?.toString?.();
      if (hubIdStr) hubIds.push(hubIdStr);
      const bookingIdStr = review.bookingId?.toString?.();
      if (bookingIdStr) bookingIds.push(bookingIdStr);
    }

    // Batch load related data
    const [experiences, expertises, hubs, bookings] = await Promise.all([
      experienceIds.length > 0
        ? Experience.find({ _id: { $in: experienceIds } })
            .select('experienceTitle slug')
            .lean()
        : [],
      expertiseIds.length > 0
        ? Expertise.find({ _id: { $in: expertiseIds } })
            .select('expertiseTitle slug')
            .lean()
        : [],
      hubIds.length > 0
        ? Hub.find({ _id: { $in: hubIds } })
            .select('name logo')
            .lean()
        : [],
      bookingIds.length > 0
        ? Booking.find({ _id: { $in: bookingIds } })
            .select('bookingStartDate status')
            .lean()
        : [],
    ]);

    // Create lookup maps
    const experienceMap = new Map(experiences.map((e) => [e._id.toString(), e]));
    const expertiseMap = new Map(expertises.map((e) => [e._id.toString(), e]));
    const hubMap = new Map(hubs.map((h) => [h._id.toString(), h]));
    const bookingMap = new Map(bookings.map((b) => [b._id.toString(), b]));

    // Format reviews
    const formattedReviews = reviews.map((review) => {
      const serviceIdStr = review.serviceId?.toString?.() || '';
      const hubIdStr = review.hubId?.toString?.() || '';
      const bookingIdStr = review.bookingId?.toString?.() || '';

      let serviceName = 'Unknown Service';
      let serviceSlug = '';
      if (review.serviceType === BookingReviewServiceType.EXPERIENCE) {
        const experience = experienceMap.get(serviceIdStr);
        if (experience) {
          serviceName = experience.experienceTitle;
          serviceSlug = experience.slug || '';
        }
      } else {
        const expertise = expertiseMap.get(serviceIdStr);
        if (expertise) {
          serviceName = expertise.expertiseTitle;
          serviceSlug = expertise.slug || '';
        }
      }

      const hub = hubMap.get(hubIdStr);
      const booking = bookingMap.get(bookingIdStr);

      return {
        _id: review._id?.toString?.() || '',
        rating: review.rating,
        content: review.content,
        photos: review.photos || [],
        isEdited: review.isEdited || false,
        createdAt: review.createdAt?.toISOString?.() || new Date().toISOString(),
        service: {
          _id: serviceIdStr,
          name: serviceName,
          slug: serviceSlug,
          type: review.serviceType as 'experience' | 'expertise',
        },
        hub: {
          _id: hubIdStr,
          name: hub?.name || 'Unknown Hub',
          logo: hub?.logo,
        },
        booking: {
          _id: bookingIdStr,
          date: booking?.bookingStartDate?.toISOString?.() || new Date().toISOString(),
          status: booking?.status || 'unknown',
        },
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
   * List completed bookings that the user hasn't reviewed yet
   */
  async listBookingsToReview(
    userId: string,
    query: { page?: number; limit?: number },
  ): Promise<{
    bookings: ToReviewItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 50);
    const skip = (page - 1) * limit;

    // Get IDs of bookings that already have reviews
    const reviewedBookingIds = await BookingReview.distinct('bookingId', {
      reviewerId: new mongoose.Types.ObjectId(userId),
      status: { $ne: BookingReviewStatus.DELETED },
    });

    // Find completed bookings without reviews (excluding SPACE type)
    const filter = {
      bookedBy: new mongoose.Types.ObjectId(userId),
      status: BookingStatus.COMPLETED,
      bookingType: { $in: [BookingType.EXPERIENCE, BookingType.EXPERTISE] },
      _id: { $nin: reviewedBookingIds },
    };

    const total = await Booking.countDocuments(filter);

    const bookings = await Booking.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Collect service IDs by type
    const experienceIds: string[] = [];
    const expertiseIds: string[] = [];
    const hubIds: string[] = [];

    for (const booking of bookings) {
      const serviceIdStr = booking.serviceId?.toString?.();
      if (serviceIdStr) {
        if (booking.bookingType === BookingType.EXPERIENCE) {
          experienceIds.push(serviceIdStr);
        } else if (booking.bookingType === BookingType.EXPERTISE) {
          expertiseIds.push(serviceIdStr);
        }
      }
      const hubIdStr = booking.hubId?.toString?.();
      if (hubIdStr) hubIds.push(hubIdStr);
    }

    // Batch load related data
    const [experiences, expertises, hubs] = await Promise.all([
      experienceIds.length > 0
        ? Experience.find({ _id: { $in: experienceIds } })
            .select('experienceTitle slug coverPhoto')
            .lean()
        : [],
      expertiseIds.length > 0
        ? Expertise.find({ _id: { $in: expertiseIds } })
            .select('expertiseTitle slug coverPhoto')
            .lean()
        : [],
      hubIds.length > 0
        ? Hub.find({ _id: { $in: hubIds } })
            .select('name logo')
            .lean()
        : [],
    ]);

    // Create lookup maps
    const experienceMap = new Map(experiences.map((e) => [e._id.toString(), e]));
    const expertiseMap = new Map(expertises.map((e) => [e._id.toString(), e]));
    const hubMap = new Map(hubs.map((h) => [h._id.toString(), h]));

    // Format bookings
    const formattedBookings: ToReviewItem[] = bookings.map((booking) => {
      const serviceIdStr = booking.serviceId?.toString?.() || '';
      const hubIdStr = booking.hubId?.toString?.() || '';

      let serviceName = 'Unknown Service';
      let serviceSlug = '';
      let coverPhoto: string | undefined;
      const serviceType =
        booking.bookingType === BookingType.EXPERIENCE ? 'experience' : 'expertise';

      if (booking.bookingType === BookingType.EXPERIENCE) {
        const experience = experienceMap.get(serviceIdStr);
        if (experience) {
          serviceName = experience.experienceTitle;
          serviceSlug = experience.slug || '';
          coverPhoto = experience.coverPhoto;
        }
      } else {
        const expertise = expertiseMap.get(serviceIdStr);
        if (expertise) {
          serviceName = expertise.expertiseTitle;
          serviceSlug = expertise.slug || '';
          coverPhoto = expertise.coverPhoto;
        }
      }

      const hub = hubMap.get(hubIdStr);

      return {
        _id: booking._id?.toString?.() || '',
        bookingId: booking._id?.toString?.() || '',
        serviceId: serviceIdStr,
        serviceType,
        serviceName,
        serviceSlug,
        coverPhoto,
        hub: {
          _id: hubIdStr,
          name: hub?.name || 'Unknown Hub',
          logo: hub?.logo,
        },
        bookingDate: booking.bookingStartDate?.toISOString?.() || new Date().toISOString(),
        completedAt: booking.updatedAt?.toISOString?.() || new Date().toISOString(),
      };
    });

    return {
      bookings: formattedBookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * List user's reviews that have hub replies
   */
  async listReviewsWithReplies(
    userId: string,
    query: { page?: number; limit?: number },
  ): Promise<{
    reviews: ReviewWithReplyItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 50);
    const skip = (page - 1) * limit;

    // Build filter for reviews with hub replies
    const filter = {
      reviewerId: new mongoose.Types.ObjectId(userId),
      status: BookingReviewStatus.ACTIVE,
      'hubReply.content': { $exists: true, $ne: null },
    };

    const total = await BookingReview.countDocuments(filter);

    const reviews = await BookingReview.find(filter)
      .sort({ 'hubReply.createdAt': -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Collect IDs for batch loading
    const experienceIds: string[] = [];
    const expertiseIds: string[] = [];
    const hubIds: string[] = [];

    for (const review of reviews) {
      const serviceIdStr = review.serviceId?.toString?.();
      if (serviceIdStr) {
        if (review.serviceType === BookingReviewServiceType.EXPERIENCE) {
          experienceIds.push(serviceIdStr);
        } else {
          expertiseIds.push(serviceIdStr);
        }
      }
      const hubIdStr = review.hubId?.toString?.();
      if (hubIdStr) hubIds.push(hubIdStr);
    }

    // Batch load related data
    const [experiences, expertises, hubs] = await Promise.all([
      experienceIds.length > 0
        ? Experience.find({ _id: { $in: experienceIds } })
            .select('experienceTitle slug coverPhoto')
            .lean()
        : [],
      expertiseIds.length > 0
        ? Expertise.find({ _id: { $in: expertiseIds } })
            .select('expertiseTitle slug coverPhoto')
            .lean()
        : [],
      hubIds.length > 0
        ? Hub.find({ _id: { $in: hubIds } })
            .select('name logo')
            .lean()
        : [],
    ]);

    // Create lookup maps
    const experienceMap = new Map(experiences.map((e) => [e._id.toString(), e]));
    const expertiseMap = new Map(expertises.map((e) => [e._id.toString(), e]));
    const hubMap = new Map(hubs.map((h) => [h._id.toString(), h]));

    // Format reviews
    const formattedReviews: ReviewWithReplyItem[] = reviews.map((review) => {
      const serviceIdStr = review.serviceId?.toString?.() || '';
      const hubIdStr = review.hubId?.toString?.() || '';

      let serviceName = 'Unknown Service';
      let serviceSlug = '';
      let coverPhoto: string | undefined;

      if (review.serviceType === BookingReviewServiceType.EXPERIENCE) {
        const experience = experienceMap.get(serviceIdStr);
        if (experience) {
          serviceName = experience.experienceTitle;
          serviceSlug = experience.slug || '';
          coverPhoto = experience.coverPhoto;
        }
      } else {
        const expertise = expertiseMap.get(serviceIdStr);
        if (expertise) {
          serviceName = expertise.expertiseTitle;
          serviceSlug = expertise.slug || '';
          coverPhoto = expertise.coverPhoto;
        }
      }

      const hub = hubMap.get(hubIdStr);

      return {
        _id: review._id?.toString?.() || '',
        rating: review.rating,
        content: review.content,
        photos: review.photos || [],
        isEdited: review.isEdited || false,
        createdAt: review.createdAt?.toISOString?.() || new Date().toISOString(),
        service: {
          _id: serviceIdStr,
          name: serviceName,
          slug: serviceSlug,
          type: review.serviceType as 'experience' | 'expertise',
          coverPhoto,
        },
        hub: {
          _id: hubIdStr,
          name: hub?.name || 'Unknown Hub',
          logo: hub?.logo,
        },
        hubReply: {
          content: review.hubReply?.content || '',
          createdAt: review.hubReply?.createdAt?.toISOString?.() || new Date().toISOString(),
          updatedAt: review.hubReply?.updatedAt?.toISOString?.(),
        },
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
   * List reviews for an experience (public)
   * AC-BR-050 through AC-BR-056
   */
  async listExperienceReviews(
    experienceId: string,
    query: ListReviewsQuery,
  ): Promise<ReviewListResponse> {
    return this.listServiceReviews(experienceId, BookingReviewServiceType.EXPERIENCE, query);
  }

  /**
   * List reviews for an expertise (public)
   * AC-BR-060, AC-BR-061
   */
  async listExpertiseReviews(
    expertiseId: string,
    query: ListReviewsQuery,
  ): Promise<ReviewListResponse> {
    return this.listServiceReviews(expertiseId, BookingReviewServiceType.EXPERTISE, query);
  }

  /**
   * List all reviews for a hub (public)
   * AC-BR-070 through AC-BR-073
   */
  async listHubReviews(hubId: string, query: HubReviewsQuery): Promise<ReviewListResponse> {
    const { type = 'all', sort = 'newest', rating, cursor, limit = 20 } = query;

    // Build filter
    const filter: Record<string, unknown> = {
      hubId: new mongoose.Types.ObjectId(hubId),
      status: BookingReviewStatus.ACTIVE,
    };

    if (rating) {
      filter.rating = rating;
    }

    // Apply cursor for pagination
    if (cursor) {
      filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    // For hub reviews, we currently only support booking reviews
    // Contract reviews will be merged in when implemented
    if (type === 'contract') {
      // Return empty for contract reviews - will be implemented in contract review module
      return {
        reviews: [],
        stats: {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
        pagination: {
          cursor: null,
          hasMore: false,
        },
      };
    }

    // Build sort
    let sortOrder: Record<string, 1 | -1>;
    switch (sort) {
      case 'highest':
        sortOrder = { rating: -1, createdAt: -1 };
        break;
      case 'lowest':
        sortOrder = { rating: 1, createdAt: -1 };
        break;
      default:
        sortOrder = { createdAt: -1 };
    }

    // Fetch reviews with limit + 1 to check if there are more
    const reviews = await BookingReview.find(filter)
      .sort(sortOrder)
      .limit(limit + 1)
      .lean();

    const hasMore = reviews.length > limit;
    const reviewsToReturn = hasMore ? reviews.slice(0, limit) : reviews;

    // Get reviewer info
    const reviewerIds = reviewsToReturn.map((r) => r.reviewerId);
    const reviewers = await User.find({ _id: { $in: reviewerIds } })
      .select('name profilePhoto')
      .lean();
    const reviewerMap = new Map(reviewers.map((r) => [r._id.toString(), r]));

    // Format reviews
    const formattedReviews: PublicReviewResponse[] = reviewsToReturn.map((review) => {
      const reviewerIdStr = review.reviewerId?.toString?.() || '';
      const reviewer = reviewerIdStr ? reviewerMap.get(reviewerIdStr) : undefined;
      return {
        _id: review._id?.toString?.() || '',
        rating: review.rating,
        content: review.content,
        photos: review.photos || [],
        reviewer: {
          name: reviewer ? formatReviewerName(reviewer.name) : 'Anonymous',
          avatar: reviewer?.profilePhoto,
        },
        isEdited: review.isEdited || false,
        createdAt: review.createdAt?.toISOString?.() || new Date().toISOString(),
      };
    });

    // Get stats
    const stats = await this.getHubReviewStats(hubId);

    const lastReview = reviewsToReturn[reviewsToReturn.length - 1];
    return {
      reviews: formattedReviews,
      stats,
      pagination: {
        cursor: lastReview?._id?.toString?.() || null,
        hasMore,
      },
    };
  }

  /**
   * Internal: List reviews for a service
   */
  private async listServiceReviews(
    serviceId: string,
    serviceType: BookingReviewServiceType,
    query: ListReviewsQuery,
  ): Promise<ReviewListResponse> {
    const { sort = 'newest', rating, cursor, limit = 20 } = query;

    // Build filter (AC-BR-051)
    const filter: Record<string, unknown> = {
      serviceId: new mongoose.Types.ObjectId(serviceId),
      serviceType,
      status: BookingReviewStatus.ACTIVE,
    };

    // Apply rating filter (AC-BR-053)
    if (rating) {
      filter.rating = rating;
    }

    // Apply cursor for pagination (AC-BR-054)
    if (cursor) {
      filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    // Build sort (AC-BR-052)
    let sortOrder: Record<string, 1 | -1>;
    switch (sort) {
      case 'highest':
        sortOrder = { rating: -1, createdAt: -1 };
        break;
      case 'lowest':
        sortOrder = { rating: 1, createdAt: -1 };
        break;
      default:
        sortOrder = { createdAt: -1 };
    }

    // Fetch reviews with limit + 1 to check if there are more
    const reviews = await BookingReview.find(filter)
      .sort(sortOrder)
      .limit(limit + 1)
      .lean();

    const hasMore = reviews.length > limit;
    const reviewsToReturn = hasMore ? reviews.slice(0, limit) : reviews;

    // Get reviewer info (AC-BR-055, AC-BR-056)
    const reviewerIds = reviewsToReturn.map((r) => r.reviewerId);
    const reviewers = await User.find({ _id: { $in: reviewerIds } })
      .select('name profilePhoto') // No email (AC-BR-056)
      .lean();
    const reviewerMap = new Map(reviewers.map((r) => [r._id.toString(), r]));

    // Format reviews
    const formattedReviews: PublicReviewResponse[] = reviewsToReturn.map((review) => {
      const reviewerIdStr = review.reviewerId?.toString?.() || '';
      const reviewer = reviewerIdStr ? reviewerMap.get(reviewerIdStr) : undefined;
      return {
        _id: review._id?.toString?.() || '',
        rating: review.rating,
        content: review.content,
        photos: review.photos || [],
        reviewer: {
          name: reviewer ? formatReviewerName(reviewer.name) : 'Anonymous',
          avatar: reviewer?.profilePhoto,
        },
        isEdited: review.isEdited || false,
        createdAt: review.createdAt?.toISOString?.() || new Date().toISOString(),
      };
    });

    // Get stats
    const stats = await this.getServiceReviewStats(serviceId, serviceType);

    const lastServiceReview = reviewsToReturn[reviewsToReturn.length - 1];
    return {
      reviews: formattedReviews,
      stats,
      pagination: {
        cursor: lastServiceReview?._id?.toString?.() || null,
        hasMore,
      },
    };
  }

  /**
   * Get review stats for a service
   */
  private async getServiceReviewStats(
    serviceId: string,
    serviceType: BookingReviewServiceType,
  ): Promise<ReviewStatsResponse> {
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
        },
      },
    ]);

    return (
      stats[0] || {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      }
    );
  }

  /**
   * Get review stats for a hub (booking reviews only)
   */
  private async getHubReviewStats(hubId: string): Promise<ReviewStatsResponse> {
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
        },
      },
    ]);

    return (
      stats[0] || {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      }
    );
  }

  /**
   * Format review for user response
   * Uses flexible types to handle both Mongoose documents and lean objects
   */
  // biome-ignore lint/suspicious/noExplicitAny: Mongoose document types don't match strict ObjectId conversion
  private formatUserReviewResponse(review: any): UserReviewResponse {
    return {
      _id: review._id?.toString() || review._id,
      bookingId: review.bookingId?.toString() || review.bookingId,
      serviceId: review.serviceId?.toString() || review.serviceId,
      serviceType: review.serviceType as 'experience' | 'expertise',
      hubId: review.hubId?.toString() || review.hubId,
      reviewerId: review.reviewerId?.toString() || review.reviewerId,
      rating: review.rating,
      content: review.content,
      photos: review.photos || [],
      status: review.status as 'active' | 'hidden' | 'deleted',
      isEdited: review.isEdited,
      editedAt: review.editedAt?.toISOString?.() || review.editedAt,
      createdAt: review.createdAt?.toISOString?.() || review.createdAt,
      updatedAt: review.updatedAt?.toISOString?.() || review.updatedAt,
    };
  }

  /**
   * Trigger aggregation update for service and hub
   * Uses the ReviewAggregationService for proper calculation
   */
  private async triggerAggregationUpdate(
    serviceId: string,
    serviceType: BookingReviewServiceType,
    hubId: string,
  ): Promise<void> {
    try {
      // Import aggregation service dynamically to avoid circular dependencies
      const { reviewAggregationService } = await import('./reviewAggregation.service');

      // Update service stats (experience or expertise)
      const mappedType =
        serviceType === BookingReviewServiceType.EXPERIENCE ? 'experience' : 'expertise';
      await reviewAggregationService.recalculateServiceStats(serviceId, mappedType);

      // Update hub stats (includes both booking and contract reviews)
      await reviewAggregationService.recalculateHubStats(hubId);
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Failed to update review aggregation:', error);
    }
  }

  /**
   * Send NEW_REVIEW_RECEIVED notification to hub owner
   */
  private async sendNewReviewNotificationToHub(
    booking: {
      hubId?: mongoose.Types.ObjectId;
      serviceId?: mongoose.Types.ObjectId;
      bookingType?: string;
    },
    review: { _id?: unknown; rating: number; content: string } | null,
    reviewerName: string,
    serviceType: BookingReviewServiceType,
  ): Promise<void> {
    try {
      if (!booking.hubId || !review) return;

      const hubId = booking.hubId.toString();

      // Get hub with owner info
      const hub = await Hub.findById(hubId).select('ownerId name').lean();
      if (!hub?.ownerId) return;

      // Get hub owner's user data
      const owner = await User.findById(hub.ownerId).select('name email phoneNumber').lean();
      if (!owner?.email) return;

      // Get service name
      let serviceName = 'your service';
      if (serviceType === BookingReviewServiceType.EXPERIENCE && booking.serviceId) {
        const experience = await Experience.findById(booking.serviceId)
          .select('experienceTitle')
          .lean();
        serviceName = experience?.experienceTitle || 'your experience';
      } else if (serviceType === BookingReviewServiceType.EXPERTISE && booking.serviceId) {
        const expertise = await Expertise.findById(booking.serviceId)
          .select('expertiseTitle')
          .lean();
        serviceName = expertise?.expertiseTitle || 'your expertise';
      }

      // Get review preview (first 100 chars)
      const reviewPreview =
        review.content.length > 100 ? `${review.content.substring(0, 100)}...` : review.content;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'NEW_REVIEW_RECEIVED',
        user: {
          _id: hub.ownerId.toString(),
          name: owner.name,
          email: owner.email,
          phone: owner.phoneNumber,
        },
        hubId,
        data: {
          userName: owner.name,
          userEmail: owner.email,
          learnerName: reviewerName,
          reviewerName,
          rating: review.rating,
          experienceName: serviceName,
          serviceName,
          hubName: hub.name,
          reviewPreview,
          reviewId: review._id?.toString(),
        },
      });
    } catch (error) {
      // Log but don't fail the main operation
      console.error('Failed to send NEW_REVIEW_RECEIVED notification:', error);
    }
  }
}

export const reviewService = new ReviewService();
export { ReviewError };
