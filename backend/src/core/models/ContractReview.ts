import mongoose, { type Document, type Model } from 'mongoose';

const { Schema } = mongoose;

/**
 * Contract review type enum
 */
export enum ContractReviewType {
  CLIENT_TO_EXPERT = 'client_to_expert',
  EXPERT_TO_CLIENT = 'expert_to_client',
}

/**
 * Contract review status enum
 */
export enum ContractReviewStatus {
  ACTIVE = 'active',
  HIDDEN = 'hidden',
  DELETED = 'deleted',
}

/**
 * Criteria ratings subdocument interface
 */
export interface ICriteriaRatings {
  quality: number;
  communication: number;
  professionalism: number;
  timeliness: number;
}

/**
 * Contract review document interface
 */
export interface IContractReview extends Document {
  // Core References
  contractId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;

  // Reviewer & Reviewee (Hub-to-Hub)
  reviewerHubId: mongoose.Types.ObjectId;
  revieweeHubId: mongoose.Types.ObjectId;
  reviewType: ContractReviewType;

  // Content
  rating: number;
  criteriaRatings: ICriteriaRatings;
  content: string;

  // Status
  status: ContractReviewStatus;

  // Metadata
  isEdited: boolean;
  editedAt?: Date;

  // Moderation
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  moderationReason?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Criteria ratings schema
 */
const criteriaRatingsSchema = new Schema<ICriteriaRatings>(
  {
    quality: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    communication: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    professionalism: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    timeliness: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  { _id: false },
);

/**
 * Contract review schema definition
 */
const contractReviewSchema = new Schema<IContractReview>(
  {
    // Core References
    contractId: {
      type: Schema.Types.ObjectId,
      ref: 'Contract',
      required: true,
      index: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },

    // Reviewer & Reviewee
    reviewerHubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
      index: true,
    },
    revieweeHubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
      index: true,
    },
    reviewType: {
      type: String,
      enum: Object.values(ContractReviewType),
      required: true,
    },

    // Content
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    criteriaRatings: {
      type: criteriaRatingsSchema,
      required: true,
    },
    content: {
      type: String,
      required: true,
      minlength: 25,
      maxlength: 1000,
      trim: true,
    },

    // Status
    status: {
      type: String,
      enum: Object.values(ContractReviewStatus),
      default: ContractReviewStatus.ACTIVE,
      index: true,
    },

    // Metadata
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },

    // Moderation
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
    },
    moderatedAt: {
      type: Date,
    },
    moderationReason: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    collection: 'contract_reviews',
    toJSON: {
      transform: (_doc, ret) => {
        const { __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// AC-IX-006: Unique compound index on (contractId, reviewType)
contractReviewSchema.index({ contractId: 1, reviewType: 1 }, { unique: true });

// AC-IX-007: Index on (revieweeHubId, status, createdAt)
contractReviewSchema.index({ revieweeHubId: 1, status: 1, createdAt: -1 });

// AC-IX-008: Index on (reviewerHubId, createdAt)
contractReviewSchema.index({ reviewerHubId: 1, createdAt: -1 });

// Additional indexes
contractReviewSchema.index({ rating: 1 });

// Text index for search
contractReviewSchema.index({ content: 'text' });

/**
 * Instance methods
 */

/**
 * Check if review can be edited (within 30 days)
 */
contractReviewSchema.methods.canBeEdited = function (): boolean {
  if (this.status !== ContractReviewStatus.ACTIVE) return false;
  const daysSinceCreated = Math.floor(
    (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  return daysSinceCreated <= 30;
};

/**
 * Check if review is active
 */
contractReviewSchema.methods.isActive = function (): boolean {
  return this.status === ContractReviewStatus.ACTIVE;
};

/**
 * Get average of criteria ratings
 */
contractReviewSchema.methods.getCriteriaAverage = function (): number {
  const cr = this.criteriaRatings;
  const sum = cr.quality + cr.communication + cr.professionalism + cr.timeliness;
  return Math.round((sum / 4) * 10) / 10;
};

/**
 * Static methods
 */

/**
 * Find reviews for a contract
 */
contractReviewSchema.statics.findByContractId = function (
  contractId: mongoose.Types.ObjectId | string,
) {
  return this.find({ contractId }).sort({ createdAt: -1 });
};

/**
 * Find review by contract and type
 */
contractReviewSchema.statics.findByContractAndType = function (
  contractId: mongoose.Types.ObjectId | string,
  reviewType: ContractReviewType,
) {
  return this.findOne({ contractId, reviewType });
};

/**
 * Find reviews received by hub
 */
contractReviewSchema.statics.findByRevieweeHubId = function (
  hubId: mongoose.Types.ObjectId | string,
  options?: { status?: ContractReviewStatus; limit?: number; skip?: number },
) {
  const query = this.find({
    revieweeHubId: hubId,
    status: options?.status || ContractReviewStatus.ACTIVE,
  });
  if (options?.skip) query.skip(options.skip);
  if (options?.limit) query.limit(options.limit);
  return query.sort({ createdAt: -1 });
};

/**
 * Find reviews written by hub
 */
contractReviewSchema.statics.findByReviewerHubId = function (
  hubId: mongoose.Types.ObjectId | string,
  options?: { limit?: number; skip?: number },
) {
  const query = this.find({ reviewerHubId: hubId });
  if (options?.skip) query.skip(options.skip);
  if (options?.limit) query.limit(options.limit);
  return query.sort({ createdAt: -1 });
};

/**
 * Get aggregate stats for hub (reviews received)
 */
contractReviewSchema.statics.getHubStats = async function (
  hubId: mongoose.Types.ObjectId | string,
) {
  const stats = await this.aggregate([
    {
      $match: {
        revieweeHubId: new mongoose.Types.ObjectId(hubId.toString()),
        status: ContractReviewStatus.ACTIVE,
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
        avgQuality: { $avg: '$criteriaRatings.quality' },
        avgCommunication: { $avg: '$criteriaRatings.communication' },
        avgProfessionalism: { $avg: '$criteriaRatings.professionalism' },
        avgTimeliness: { $avg: '$criteriaRatings.timeliness' },
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
        criteriaAverages: {
          quality: { $round: ['$avgQuality', 1] },
          communication: { $round: ['$avgCommunication', 1] },
          professionalism: { $round: ['$avgProfessionalism', 1] },
          timeliness: { $round: ['$avgTimeliness', 1] },
        },
        lastReviewAt: 1,
      },
    },
  ]);

  return (
    stats[0] || {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      criteriaAverages: {
        quality: 0,
        communication: 0,
        professionalism: 0,
        timeliness: 0,
      },
      lastReviewAt: null,
    }
  );
};

/**
 * Hub stats response interface
 */
export interface IHubStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  criteriaAverages: {
    quality: number;
    communication: number;
    professionalism: number;
    timeliness: number;
  };
  lastReviewAt: Date | null;
}

/**
 * Static methods interface for ContractReview model
 */
export interface IContractReviewModel extends Model<IContractReview> {
  findByContractId(
    contractId: mongoose.Types.ObjectId | string,
  ): ReturnType<Model<IContractReview>['find']>;

  findByContractAndType(
    contractId: mongoose.Types.ObjectId | string,
    reviewType: ContractReviewType,
  ): ReturnType<Model<IContractReview>['findOne']>;

  findByRevieweeHubId(
    hubId: mongoose.Types.ObjectId | string,
    options?: { status?: ContractReviewStatus; limit?: number; skip?: number },
  ): ReturnType<Model<IContractReview>['find']>;

  findByReviewerHubId(
    hubId: mongoose.Types.ObjectId | string,
    options?: { limit?: number; skip?: number },
  ): ReturnType<Model<IContractReview>['find']>;

  getHubStats(hubId: mongoose.Types.ObjectId | string): Promise<IHubStats>;
}

/**
 * Contract review model
 */
export const ContractReview = mongoose.model<IContractReview, IContractReviewModel>(
  'ContractReview',
  contractReviewSchema,
);
