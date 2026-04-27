import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Booking review service type enum
 */
export enum BookingReviewServiceType {
  EXPERIENCE = 'experience',
  EXPERTISE = 'expertise',
}

/**
 * Booking review status enum
 */
export enum BookingReviewStatus {
  ACTIVE = 'active',
  HIDDEN = 'hidden',
  DELETED = 'deleted',
}

/**
 * Booking review document interface
 */
export interface IBookingReview extends Document {
  // Core References
  bookingId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  serviceType: BookingReviewServiceType;
  hubId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;

  // Content
  rating: number;
  content: string;
  photos: string[];

  // Status
  status: BookingReviewStatus;

  // Metadata
  isEdited: boolean;
  editedAt?: Date;

  // Hub Reply
  hubReply?: {
    content: string;
    createdAt: Date;
    updatedAt?: Date;
  };

  // Moderation
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  moderationReason?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Booking review schema definition
 */
const bookingReviewSchema = new Schema<IBookingReview>(
  {
    // Core References
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    serviceType: {
      type: String,
      enum: Object.values(BookingReviewServiceType),
      required: true,
    },
    hubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
      index: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Content
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    content: {
      type: String,
      required: true,
      minlength: 25,
      maxlength: 2000,
      trim: true,
    },
    photos: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) => v.length <= 5,
        message: 'Maximum 5 photos allowed',
      },
    },

    // Status
    status: {
      type: String,
      enum: Object.values(BookingReviewStatus),
      default: BookingReviewStatus.ACTIVE,
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

    // Hub Reply
    hubReply: {
      type: {
        content: { type: String, required: true, maxlength: 500 },
        createdAt: { type: Date, required: true },
        updatedAt: { type: Date },
      },
      required: false,
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
    collection: 'booking_reviews',
    toJSON: {
      transform: (_doc, ret) => {
        const { __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Compound indexes for performance
// AC-IX-002: Index on (serviceId, serviceType, status)
bookingReviewSchema.index({ serviceId: 1, serviceType: 1, status: 1, createdAt: -1 });

// AC-IX-003: Index on (hubId, status, createdAt)
bookingReviewSchema.index({ hubId: 1, status: 1, createdAt: -1 });

// AC-IX-004: Index on (reviewerId, createdAt)
bookingReviewSchema.index({ reviewerId: 1, createdAt: -1 });

// AC-IX-005: Index on rating
bookingReviewSchema.index({ rating: 1 });

// Text index for search
bookingReviewSchema.index({ content: 'text' });

/**
 * Instance methods
 */

/**
 * Check if review can be edited (within 30 days)
 */
bookingReviewSchema.methods.canBeEdited = function (): boolean {
  if (this.status !== BookingReviewStatus.ACTIVE) return false;
  const daysSinceCreated = Math.floor(
    (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  return daysSinceCreated <= 30;
};

/**
 * Check if review is active
 */
bookingReviewSchema.methods.isActive = function (): boolean {
  return this.status === BookingReviewStatus.ACTIVE;
};

/**
 * Static methods
 */

/**
 * Find reviews by service
 */
bookingReviewSchema.statics.findByService = function (
  serviceId: mongoose.Types.ObjectId | string,
  serviceType: BookingReviewServiceType,
  options?: { status?: BookingReviewStatus; limit?: number; skip?: number },
) {
  const query = this.find({
    serviceId,
    serviceType,
    status: options?.status || BookingReviewStatus.ACTIVE,
  });
  if (options?.skip) query.skip(options.skip);
  if (options?.limit) query.limit(options.limit);
  return query.sort({ createdAt: -1 });
};

/**
 * Find reviews by hub
 */
bookingReviewSchema.statics.findByHubId = function (
  hubId: mongoose.Types.ObjectId | string,
  options?: { status?: BookingReviewStatus; limit?: number; skip?: number },
) {
  const query = this.find({
    hubId,
    status: options?.status || BookingReviewStatus.ACTIVE,
  });
  if (options?.skip) query.skip(options.skip);
  if (options?.limit) query.limit(options.limit);
  return query.sort({ createdAt: -1 });
};

/**
 * Find review by booking (unique)
 */
bookingReviewSchema.statics.findByBookingId = function (
  bookingId: mongoose.Types.ObjectId | string,
) {
  return this.findOne({ bookingId });
};

/**
 * Get aggregate stats for service
 */
bookingReviewSchema.statics.getServiceStats = async function (
  serviceId: mongoose.Types.ObjectId | string,
  serviceType: BookingReviewServiceType,
) {
  const stats = await this.aggregate([
    {
      $match: {
        serviceId: new mongoose.Types.ObjectId(serviceId.toString()),
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

  return (
    stats[0] || {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      lastReviewAt: null,
    }
  );
};

/**
 * Booking review model
 */
export const BookingReview = mongoose.model<IBookingReview>('BookingReview', bookingReviewSchema);
