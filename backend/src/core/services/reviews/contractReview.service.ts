/**
 * Contract Review Service
 * Business logic for contract reviews (hub ↔ hub)
 */

import { Contract, ContractStatus } from '@core/models/Contract';
import {
  ContractReview,
  ContractReviewStatus,
  ContractReviewType,
} from '@core/models/ContractReview';
import { Hub } from '@core/models/Hub';
import { Job } from '@core/models/Job';
import type {
  ContractReviewResponse,
  ContractReviewsResponse,
  CreateContractReviewInput,
  HubContractReviewsListResponse,
  HubContractReviewsQuery,
  PublicContractReviewResponse,
  ReviewStatusResponse,
  UpdateContractReviewInput,
} from '@core/schemas/hub/contracts/contractReview.schema';
import { conversationTriggerService } from '@core/services/shared/chat/conversationTrigger.service';
import { communicationTriggerService } from '@services/communications';
import mongoose from 'mongoose';

/**
 * Error codes for contract review operations
 */
export enum ContractReviewErrorCode {
  CONTRACT_NOT_FOUND = 'CONTRACT_NOT_FOUND',
  NOT_CONTRACT_PARTY = 'NOT_CONTRACT_PARTY',
  CONTRACT_NOT_COMPLETED = 'CONTRACT_NOT_COMPLETED',
  REVIEW_EXISTS = 'REVIEW_EXISTS',
  REVIEW_NOT_FOUND = 'REVIEW_NOT_FOUND',
  REVIEW_NOT_OWNED = 'REVIEW_NOT_OWNED',
  REVIEW_EDIT_EXPIRED = 'REVIEW_EDIT_EXPIRED',
  INVALID_RATING = 'INVALID_RATING',
  INVALID_CRITERIA = 'INVALID_CRITERIA',
}

/**
 * Contract review error
 */
class ContractReviewError extends Error {
  code: ContractReviewErrorCode;

  constructor(code: ContractReviewErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'ContractReviewError';
  }
}

/**
 * Contract Review Service class
 */
class ContractReviewService {
  /**
   * Create a contract review
   * AC-CR-001 through AC-CR-012
   */
  async createReview(
    hubId: string,
    contractId: string,
    input: CreateContractReviewInput,
  ): Promise<ContractReviewResponse> {
    const { rating, criteriaRatings, content } = input;

    // Validate rating (AC-CR-004)
    if (rating < 1 || rating > 5) {
      throw new ContractReviewError(
        ContractReviewErrorCode.INVALID_RATING,
        'Rating must be between 1 and 5',
      );
    }

    // Validate criteria ratings (AC-CR-003, AC-CR-004)
    const criteriaFields = ['quality', 'communication', 'professionalism', 'timeliness'] as const;
    for (const field of criteriaFields) {
      if (
        criteriaRatings[field] === undefined ||
        criteriaRatings[field] < 1 ||
        criteriaRatings[field] > 5
      ) {
        throw new ContractReviewError(
          ContractReviewErrorCode.INVALID_CRITERIA,
          `Criteria rating '${field}' must be between 1 and 5`,
        );
      }
    }

    // Find contract (AC-CR-005)
    const contract = await Contract.findById(contractId).lean();
    if (!contract) {
      throw new ContractReviewError(
        ContractReviewErrorCode.CONTRACT_NOT_FOUND,
        'Contract not found',
      );
    }

    // Verify hub is party to contract (AC-CR-006)
    const clientHubId = contract.clientHubId?.toString();
    const expertHubId = contract.expertHubId?.toString();

    if (hubId !== clientHubId && hubId !== expertHubId) {
      throw new ContractReviewError(
        ContractReviewErrorCode.NOT_CONTRACT_PARTY,
        'You are not a party to this contract',
      );
    }

    // Check contract status (AC-CR-007)
    if (contract.status !== ContractStatus.COMPLETED) {
      throw new ContractReviewError(
        ContractReviewErrorCode.CONTRACT_NOT_COMPLETED,
        'Only completed contracts can be reviewed',
      );
    }

    // Determine review type and reviewee (AC-CR-009, AC-CR-010)
    const isClient = hubId === clientHubId;
    const reviewType = isClient
      ? ContractReviewType.CLIENT_TO_EXPERT
      : ContractReviewType.EXPERT_TO_CLIENT;
    const revieweeHubId = isClient ? expertHubId : clientHubId;

    // Check if review already exists from this party (AC-CR-008)
    const existingReview = await ContractReview.findOne({
      contractId,
      reviewType,
    }).lean();
    if (existingReview) {
      throw new ContractReviewError(
        ContractReviewErrorCode.REVIEW_EXISTS,
        'You have already reviewed this contract',
      );
    }

    // Create review (AC-CR-012)
    const review = await ContractReview.create({
      contractId: new mongoose.Types.ObjectId(contractId),
      jobId: contract.jobId,
      reviewerHubId: new mongoose.Types.ObjectId(hubId),
      revieweeHubId: new mongoose.Types.ObjectId(revieweeHubId),
      reviewType,
      rating,
      criteriaRatings,
      content,
      status: ContractReviewStatus.ACTIVE,
      isEdited: false,
    });

    // Trigger aggregation update (AC-CR-011) - non-blocking
    void this.triggerAggregationUpdate(revieweeHubId as string);

    // Send review event to chat room (non-blocking)
    // Get reviewer hub name for chat message
    const reviewerHub = await Hub.findById(hubId).select('name').lean();
    const reviewerHubName = reviewerHub?.name || 'Hub';
    void conversationTriggerService.addContractReviewEvent(
      contractId,
      reviewerHubName,
      rating,
      reviewType as 'client_to_expert' | 'expert_to_client',
      review._id as mongoose.Types.ObjectId,
    );

    // Send NEW_CONTRACT_REVIEW_RECEIVED notification to reviewee hub (non-blocking)
    void this.sendNewContractReviewNotification(
      contractId,
      revieweeHubId as string,
      reviewerHubName,
      rating,
      content,
      review._id as mongoose.Types.ObjectId,
    );

    return this.formatContractReviewResponse(review);
  }

  /**
   * Get contract reviews (both parties)
   * AC-CR-020 through AC-CR-023
   */
  async getContractReviews(hubId: string, contractId: string): Promise<ContractReviewsResponse> {
    // Find contract
    const contract = await Contract.findById(contractId).lean();
    if (!contract) {
      throw new ContractReviewError(
        ContractReviewErrorCode.CONTRACT_NOT_FOUND,
        'Contract not found',
      );
    }

    // Verify hub is party to contract (AC-CR-022)
    const clientHubId = contract.clientHubId?.toString();
    const expertHubId = contract.expertHubId?.toString();

    if (hubId !== clientHubId && hubId !== expertHubId) {
      throw new ContractReviewError(
        ContractReviewErrorCode.NOT_CONTRACT_PARTY,
        'You are not a party to this contract',
      );
    }

    // Determine my review type
    const isClient = hubId === clientHubId;
    const myReviewType = isClient
      ? ContractReviewType.CLIENT_TO_EXPERT
      : ContractReviewType.EXPERT_TO_CLIENT;
    const otherReviewType = isClient
      ? ContractReviewType.EXPERT_TO_CLIENT
      : ContractReviewType.CLIENT_TO_EXPERT;

    // Get both reviews
    const [myReview, otherReview] = await Promise.all([
      ContractReview.findOne({ contractId, reviewType: myReviewType }).lean(),
      ContractReview.findOne({ contractId, reviewType: otherReviewType }).lean(),
    ]);

    // Get reviewer hub info for received review
    let receivedReview = null;
    if (otherReview) {
      const reviewerHub = await Hub.findById(otherReview.reviewerHubId).select('name logo').lean();
      receivedReview = {
        _id: otherReview._id.toString(),
        reviewType: otherReview.reviewType as 'client_to_expert' | 'expert_to_client',
        rating: otherReview.rating,
        criteriaRatings: otherReview.criteriaRatings,
        content: otherReview.content,
        reviewerHub: {
          _id: reviewerHub?._id?.toString() || otherReview.reviewerHubId.toString(),
          name: reviewerHub?.name || 'Unknown Hub',
          logo: reviewerHub?.logo,
        },
        isEdited: otherReview.isEdited,
        createdAt: otherReview.createdAt.toISOString(),
      };
    }

    return {
      myReview: myReview ? this.formatContractReviewResponse(myReview) : null,
      receivedReview,
    };
  }

  /**
   * Update a contract review
   * AC-CR-030 through AC-CR-036
   */
  async updateReview(
    hubId: string,
    contractId: string,
    reviewId: string,
    input: UpdateContractReviewInput,
  ): Promise<ContractReviewResponse> {
    // Find review (AC-CR-031)
    const review = await ContractReview.findById(reviewId);
    if (!review) {
      throw new ContractReviewError(ContractReviewErrorCode.REVIEW_NOT_FOUND, 'Review not found');
    }

    // Verify contract matches
    if (review.contractId.toString() !== contractId) {
      throw new ContractReviewError(
        ContractReviewErrorCode.REVIEW_NOT_FOUND,
        'Review not found for this contract',
      );
    }

    // Verify ownership (AC-CR-032)
    if (review.reviewerHubId.toString() !== hubId) {
      throw new ContractReviewError(
        ContractReviewErrorCode.REVIEW_NOT_OWNED,
        'You do not own this review',
      );
    }

    // Check if review can be edited (within 30 days) (AC-CR-033)
    const daysSinceCreated = Math.floor(
      (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceCreated > 30) {
      throw new ContractReviewError(
        ContractReviewErrorCode.REVIEW_EDIT_EXPIRED,
        'Review can only be edited within 30 days of creation',
      );
    }

    // Check if review is still active
    if (review.status !== ContractReviewStatus.ACTIVE) {
      throw new ContractReviewError(
        ContractReviewErrorCode.REVIEW_NOT_FOUND,
        'Review is no longer active',
      );
    }

    // Validate input
    if (input.rating !== undefined && (input.rating < 1 || input.rating > 5)) {
      throw new ContractReviewError(
        ContractReviewErrorCode.INVALID_RATING,
        'Rating must be between 1 and 5',
      );
    }

    if (input.criteriaRatings) {
      const criteriaFields = ['quality', 'communication', 'professionalism', 'timeliness'] as const;
      for (const field of criteriaFields) {
        if (
          input.criteriaRatings[field] !== undefined &&
          (input.criteriaRatings[field] < 1 || input.criteriaRatings[field] > 5)
        ) {
          throw new ContractReviewError(
            ContractReviewErrorCode.INVALID_CRITERIA,
            `Criteria rating '${field}' must be between 1 and 5`,
          );
        }
      }
    }

    const oldRating = review.rating;

    // Update fields
    if (input.rating !== undefined) {
      review.rating = input.rating;
    }
    if (input.criteriaRatings) {
      review.criteriaRatings = {
        ...review.criteriaRatings,
        ...input.criteriaRatings,
      };
    }
    if (input.content !== undefined) {
      review.content = input.content;
    }

    // Mark as edited (AC-CR-034)
    review.isEdited = true;
    review.editedAt = new Date();

    await review.save();

    // Trigger aggregation update if rating changed (AC-CR-035)
    if (input.rating !== undefined && input.rating !== oldRating) {
      void this.triggerAggregationUpdate(review.revieweeHubId.toString());
    }

    return this.formatContractReviewResponse(review);
  }

  /**
   * Get review status for a contract
   * AC-CR-040, AC-CR-041
   */
  async getReviewStatus(hubId: string, contractId: string): Promise<ReviewStatusResponse> {
    // Find contract
    const contract = await Contract.findById(contractId).lean();
    if (!contract) {
      throw new ContractReviewError(
        ContractReviewErrorCode.CONTRACT_NOT_FOUND,
        'Contract not found',
      );
    }

    // Verify hub is party to contract
    const clientHubId = contract.clientHubId?.toString();
    const expertHubId = contract.expertHubId?.toString();

    if (hubId !== clientHubId && hubId !== expertHubId) {
      throw new ContractReviewError(
        ContractReviewErrorCode.NOT_CONTRACT_PARTY,
        'You are not a party to this contract',
      );
    }

    // Determine review types
    const isClient = hubId === clientHubId;
    const myReviewType = isClient
      ? ContractReviewType.CLIENT_TO_EXPERT
      : ContractReviewType.EXPERT_TO_CLIENT;
    const otherReviewType = isClient
      ? ContractReviewType.EXPERT_TO_CLIENT
      : ContractReviewType.CLIENT_TO_EXPERT;

    // Get reviews
    const [myReview, otherReview] = await Promise.all([
      ContractReview.findOne({ contractId, reviewType: myReviewType }).select('_id').lean(),
      ContractReview.findOne({ contractId, reviewType: otherReviewType }).select('_id').lean(),
    ]);

    const isCompleted = contract.status === ContractStatus.COMPLETED;
    const hasReviewed = !!myReview;
    const hasReceivedReview = !!otherReview;

    return {
      contractStatus: contract.status,
      canReview: isCompleted && !hasReviewed,
      hasReviewed,
      hasReceivedReview,
      myReviewId: myReview?._id?.toString() || null,
      receivedReviewId: otherReview?._id?.toString() || null,
    };
  }

  /**
   * List contract reviews received by a hub (public)
   * AC-CR-050 through AC-CR-053
   */
  async listHubContractReviews(
    hubId: string,
    query: HubContractReviewsQuery,
  ): Promise<HubContractReviewsListResponse> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 50);
    const skip = (page - 1) * limit;

    // Build filter (AC-CR-051)
    const filter = {
      revieweeHubId: new mongoose.Types.ObjectId(hubId),
      status: ContractReviewStatus.ACTIVE,
    };

    // Build sort (AC-CR-052)
    let sortOrder: Record<string, 1 | -1>;
    switch (query.sort) {
      case 'highest':
        sortOrder = { rating: -1, createdAt: -1 };
        break;
      case 'lowest':
        sortOrder = { rating: 1, createdAt: -1 };
        break;
      default:
        sortOrder = { createdAt: -1 };
    }

    // Get total count
    const total = await ContractReview.countDocuments(filter);

    // Get reviews with pagination
    const reviews = await ContractReview.find(filter)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .lean();

    // Collect hub IDs and job IDs
    const reviewerHubIds: string[] = [];
    const jobIds: string[] = [];
    for (const review of reviews) {
      reviewerHubIds.push(review.reviewerHubId.toString());
      jobIds.push(review.jobId.toString());
    }

    // Batch load reviewer hubs and jobs (AC-CR-053)
    const [reviewerHubs, jobs] = await Promise.all([
      reviewerHubIds.length > 0
        ? Hub.find({ _id: { $in: reviewerHubIds } })
            .select('name logo')
            .lean()
        : [],
      jobIds.length > 0
        ? Job.find({ _id: { $in: jobIds } })
            .select('title')
            .lean()
        : [],
    ]);

    // Create lookup maps
    const hubMap = new Map(reviewerHubs.map((h) => [h._id.toString(), h]));
    const jobMap = new Map(jobs.map((j) => [j._id.toString(), j]));

    // Format reviews
    const formattedReviews: PublicContractReviewResponse[] = reviews.map((review) => {
      const reviewerHub = hubMap.get(review.reviewerHubId.toString());
      const job = jobMap.get(review.jobId.toString());

      return {
        _id: review._id.toString(),
        rating: review.rating,
        criteriaRatings: review.criteriaRatings,
        content: review.content,
        reviewerHub: {
          _id: review.reviewerHubId.toString(),
          name: reviewerHub?.name || 'Unknown Hub',
          logo: reviewerHub?.logo,
        },
        job: {
          _id: review.jobId.toString(),
          title: job?.jobTitle || 'Unknown Job',
        },
        isEdited: review.isEdited,
        createdAt: review.createdAt.toISOString(),
      };
    });

    // Get stats using existing model method
    const stats = await ContractReview.getHubStats(hubId);

    return {
      reviews: formattedReviews,
      stats: {
        averageRating: stats.averageRating,
        totalReviews: stats.totalReviews,
        criteriaAverages: stats.criteriaAverages,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Format review for response
   */
  // biome-ignore lint/suspicious/noExplicitAny: Mongoose document types don't match strict ObjectId conversion
  private formatContractReviewResponse(review: any): ContractReviewResponse {
    return {
      _id: review._id?.toString() || review._id,
      contractId: review.contractId?.toString() || review.contractId,
      jobId: review.jobId?.toString() || review.jobId,
      reviewerHubId: review.reviewerHubId?.toString() || review.reviewerHubId,
      revieweeHubId: review.revieweeHubId?.toString() || review.revieweeHubId,
      reviewType: review.reviewType as 'client_to_expert' | 'expert_to_client',
      rating: review.rating,
      criteriaRatings: review.criteriaRatings,
      content: review.content,
      status: review.status as 'active' | 'hidden' | 'deleted',
      isEdited: review.isEdited,
      editedAt: review.editedAt?.toISOString?.() || review.editedAt,
      createdAt: review.createdAt?.toISOString?.() || review.createdAt,
      updatedAt: review.updatedAt?.toISOString?.() || review.updatedAt,
    };
  }

  /**
   * Trigger aggregation update for hub
   * Uses the ReviewAggregationService for proper calculation (includes both booking and contract reviews)
   */
  private async triggerAggregationUpdate(hubId: string): Promise<void> {
    try {
      // Import aggregation service dynamically to avoid circular dependencies
      const { reviewAggregationService } = await import('./reviewAggregation.service');

      // Update hub stats (includes both booking and contract reviews)
      await reviewAggregationService.recalculateHubStats(hubId);
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Failed to update contract review aggregation:', error);
    }
  }

  /**
   * Send NEW_CONTRACT_REVIEW_RECEIVED notification to reviewee hub owner
   */
  private async sendNewContractReviewNotification(
    contractId: string,
    revieweeHubId: string,
    reviewerHubName: string,
    rating: number,
    content: string,
    reviewId: mongoose.Types.ObjectId,
  ): Promise<void> {
    try {
      // Get reviewee hub with owner info
      const revieweeHub = await Hub.findById(revieweeHubId).select('ownerId name').lean();
      if (!revieweeHub?.ownerId) return;

      // Get hub owner's user data
      const { User } = await import('@core/models/User');
      const owner = await User.findById(revieweeHub.ownerId)
        .select('name email phoneNumber')
        .lean();
      if (!owner?.email) return;

      // Get contract title
      const contract = await Contract.findById(contractId).select('contractTitle').lean();
      const contractTitle = contract?.contractTitle || 'Contract';

      // Get review preview (first 100 chars)
      const reviewPreview = content.length > 100 ? `${content.substring(0, 100)}...` : content;

      await communicationTriggerService.triggerCommunicationWithUser({
        templateId: 'NEW_CONTRACT_REVIEW_RECEIVED',
        user: {
          _id: revieweeHub.ownerId.toString(),
          name: owner.name,
          email: owner.email,
          phone: owner.phoneNumber,
        },
        hubId: revieweeHubId,
        data: {
          userName: owner.name,
          userEmail: owner.email,
          reviewerHubName,
          rating,
          contractTitle,
          contractId,
          hubName: revieweeHub.name,
          reviewPreview,
          reviewId: reviewId.toString(),
        },
      });
    } catch (error) {
      // Log but don't fail the main operation
      console.error('Failed to send NEW_CONTRACT_REVIEW_RECEIVED notification:', error);
    }
  }
}

export const contractReviewService = new ContractReviewService();
export { ContractReviewError };
