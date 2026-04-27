import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * CouponUsage document interface
 *
 * Tracks individual coupon usage per user and booking.
 * Used to enforce per-user limits and provide usage analytics.
 */
export interface ICouponUsage extends Document {
  // References
  couponId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;

  // Discount applied
  discountAmount: number;
  currency: string;

  // Service details (denormalized for reporting)
  serviceType: 'experience' | 'expertise';
  serviceId: mongoose.Types.ObjectId;
  hubId: mongoose.Types.ObjectId;

  // Usage timestamp
  usedAt: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * CouponUsage schema definition
 */
const couponUsageSchema = new Schema<ICouponUsage>(
  {
    // References
    couponId: {
      type: Schema.Types.ObjectId,
      ref: 'Coupon',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },

    // Discount applied
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: 'MYR',
    },

    // Service details (denormalized for reporting)
    serviceType: {
      type: String,
      enum: ['experience', 'expertise'],
      required: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    hubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
      index: true,
    },

    // Usage timestamp
    usedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'couponUsages',
    toJSON: {
      transform: (_doc, ret) => {
        const { __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Compound indexes for lookups
couponUsageSchema.index({ couponId: 1, userId: 1 });
couponUsageSchema.index({ hubId: 1, usedAt: -1 });
couponUsageSchema.index({ serviceType: 1, serviceId: 1 });

/**
 * Static methods
 */

/**
 * Count how many times a user has used a specific coupon
 */
couponUsageSchema.statics.countUserUsage = function (
  couponId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
): Promise<number> {
  return this.countDocuments({ couponId, userId });
};

/**
 * Check if user has already used a coupon
 */
couponUsageSchema.statics.hasUserUsedCoupon = async function (
  couponId: mongoose.Types.ObjectId | string,
  userId: mongoose.Types.ObjectId | string,
): Promise<boolean> {
  const count = await this.countDocuments({ couponId, userId });
  return count > 0;
};

/**
 * Get total discount amount for a coupon
 */
couponUsageSchema.statics.getTotalDiscountByCoupon = function (
  couponId: mongoose.Types.ObjectId | string,
) {
  return this.aggregate([
    { $match: { couponId: new mongoose.Types.ObjectId(String(couponId)) } },
    { $group: { _id: null, totalDiscount: { $sum: '$discountAmount' }, usageCount: { $sum: 1 } } },
  ]);
};

/**
 * Get usage stats for a hub
 */
couponUsageSchema.statics.getHubUsageStats = function (
  hubId: mongoose.Types.ObjectId | string,
  startDate?: Date,
  endDate?: Date,
) {
  const match: Record<string, unknown> = { hubId: new mongoose.Types.ObjectId(String(hubId)) };
  if (startDate || endDate) {
    match.usedAt = {};
    if (startDate) (match.usedAt as Record<string, Date>).$gte = startDate;
    if (endDate) (match.usedAt as Record<string, Date>).$lte = endDate;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$couponId',
        totalDiscount: { $sum: '$discountAmount' },
        usageCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'coupons',
        localField: '_id',
        foreignField: '_id',
        as: 'coupon',
      },
    },
    { $unwind: '$coupon' },
    {
      $project: {
        couponCode: '$coupon.code',
        couponName: '$coupon.name',
        totalDiscount: 1,
        usageCount: 1,
      },
    },
    { $sort: { usageCount: -1 } },
  ]);
};

/**
 * CouponUsage model
 */
export const CouponUsage = mongoose.model<ICouponUsage>('CouponUsage', couponUsageSchema);
