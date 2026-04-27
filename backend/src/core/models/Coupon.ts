import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Coupon type enum
 *
 * MEREKA: Platform coupon - Mereka pays the discount (hub receives full amount)
 * HUB: Hub coupon - Hub absorbs the discount
 * SUBSCRIPTION: Subscription coupon - For hub subscription plan discounts
 */
export enum CouponType {
  MEREKA = 'mereka',
  HUB = 'hub',
  SUBSCRIPTION = 'subscription',
}

/**
 * Discount type enum
 */
export enum DiscountType {
  PERCENTAGE = 'percentage', // e.g., 20% off
  FIXED = 'fixed', // e.g., RM 50 off
}

/**
 * Coupon status enum
 */
export enum CouponStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

/**
 * Applicable service types for coupons
 */
export enum CouponServiceType {
  EXPERIENCE = 'experience',
  EXPERTISE = 'expertise',
  SUBSCRIPTION = 'subscription',
}

/**
 * Coupon scope subdocument interface
 */
export interface ICouponScope {
  // Service type applicability
  allExperiences: boolean;
  allExpertise: boolean;
  allSubscriptions: boolean; // For hub subscription plans

  // Specific IDs
  experienceIds?: mongoose.Types.ObjectId[];
  expertiseIds?: mongoose.Types.ObjectId[];
  planIds?: mongoose.Types.ObjectId[]; // Specific subscription plan IDs
}

/**
 * Coupon document interface
 */
export interface ICoupon extends Document {
  // Identification
  code: string; // Unique coupon code (e.g., "MEREKA20")
  name: string; // Display name (e.g., "20% Off First Booking")
  description?: string;

  // Type & Ownership
  couponType: CouponType;
  hubId?: mongoose.Types.ObjectId; // Required for HUB coupons, null for MEREKA
  createdBy: mongoose.Types.ObjectId; // Admin user or Hub user

  // Discount Configuration
  discountType: DiscountType;
  discountValue: number; // e.g., 20 (for 20%) or 50 (for RM 50)
  maxDiscount?: number; // Cap for percentage discounts (e.g., max RM 100)
  minPurchase: number; // Minimum order amount to use coupon

  // For subscription discounts (number of months the discount applies)
  subscriptionMonths?: number; // e.g., 3 = discount applies for first 3 months

  // Scope (which services can use this coupon)
  scope: ICouponScope;

  // Usage Limits
  usageLimit?: number; // Total uses allowed (null = unlimited)
  usageCount: number; // Current usage count
  perUserLimit?: number; // Uses per user (null = unlimited)

  // Validity Period
  startDate: Date;
  endDate: Date;
  status: CouponStatus;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Coupon scope schema
 */
const couponScopeSchema = new Schema<ICouponScope>(
  {
    allExperiences: { type: Boolean, default: false },
    allExpertise: { type: Boolean, default: false },
    allSubscriptions: { type: Boolean, default: false },
    experienceIds: [{ type: Schema.Types.ObjectId, ref: 'Experience' }],
    expertiseIds: [{ type: Schema.Types.ObjectId, ref: 'Expertise' }],
    planIds: [{ type: Schema.Types.ObjectId, ref: 'Plan' }],
  },
  { _id: false },
);

/**
 * Coupon schema definition
 */
const couponSchema = new Schema<ICoupon>(
  {
    // Identification
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      maxlength: 50,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    // Type & Ownership
    couponType: {
      type: String,
      enum: Object.values(CouponType),
      required: true,
      index: true,
    },
    hubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      index: true,
      // Required when couponType = 'hub'
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Discount Configuration
    discountType: {
      type: String,
      enum: Object.values(DiscountType),
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      min: 0,
    },
    minPurchase: {
      type: Number,
      min: 0,
      default: 0,
    },

    // For subscription discounts (number of months the discount applies)
    subscriptionMonths: {
      type: Number,
      min: 1,
    },

    // Scope
    scope: {
      type: couponScopeSchema,
      required: true,
      default: { allExperiences: false, allExpertise: false, allSubscriptions: false },
    },

    // Usage Limits
    usageLimit: {
      type: Number,
      min: 0,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    perUserLimit: {
      type: Number,
      min: 0,
    },

    // Validity Period
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(CouponStatus),
      default: CouponStatus.ACTIVE,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'coupons',
    toJSON: {
      transform: (_doc, ret) => {
        const { __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Compound indexes
couponSchema.index({ code: 1, status: 1 });
couponSchema.index({ hubId: 1, status: 1 });
couponSchema.index({ couponType: 1, status: 1 });
couponSchema.index({ startDate: 1, endDate: 1, status: 1 });

/**
 * Pre-save validation for hub coupons
 */
couponSchema.pre('save', function (next) {
  // Validate hubId is required for HUB coupons
  if (this.couponType === CouponType.HUB && !this.hubId) {
    next(new Error('hubId is required for hub coupons'));
    return;
  }

  // Clear hubId for MEREKA coupons
  if (this.couponType === CouponType.MEREKA) {
    this.hubId = undefined;
  }

  // Validate percentage discount is between 0-100
  if (this.discountType === DiscountType.PERCENTAGE && this.discountValue > 100) {
    next(new Error('Percentage discount cannot exceed 100'));
    return;
  }

  // Auto-expire if endDate has passed
  if (this.endDate < new Date() && this.status === CouponStatus.ACTIVE) {
    this.status = CouponStatus.EXPIRED;
  }

  next();
});

/**
 * Static methods
 */

/**
 * Find active coupon by code
 */
couponSchema.statics.findActiveByCode = function (code: string) {
  const now = new Date();
  return this.findOne({
    code: code.toUpperCase(),
    status: CouponStatus.ACTIVE,
    startDate: { $lte: now },
    endDate: { $gte: now },
  });
};

/**
 * Find coupons for a hub
 */
couponSchema.statics.findByHubId = function (
  hubId: mongoose.Types.ObjectId | string,
  options?: { status?: CouponStatus; limit?: number },
) {
  const query = this.find({ hubId });
  if (options?.status) query.where('status').equals(options.status);
  if (options?.limit) query.limit(options.limit);
  return query.sort({ createdAt: -1 });
};

/**
 * Find all Mereka platform coupons
 */
couponSchema.statics.findMerekaCoupons = function (options?: {
  status?: CouponStatus;
  limit?: number;
}) {
  const query = this.find({ couponType: CouponType.MEREKA });
  if (options?.status) query.where('status').equals(options.status);
  if (options?.limit) query.limit(options.limit);
  return query.sort({ createdAt: -1 });
};

/**
 * Instance methods
 */

/**
 * Check if coupon is currently valid
 */
couponSchema.methods.isValid = function (): boolean {
  const now = new Date();
  return (
    this.status === CouponStatus.ACTIVE &&
    this.startDate <= now &&
    this.endDate >= now &&
    this.hasUsagesRemaining()
  );
};

/**
 * Check if coupon has remaining usages
 */
couponSchema.methods.hasUsagesRemaining = function (): boolean {
  if (!this.usageLimit) return true; // No limit = unlimited
  return this.usageCount < this.usageLimit;
};

/**
 * Calculate discount amount for a given subtotal
 */
couponSchema.methods.calculateDiscount = function (subtotal: number): number {
  if (subtotal < this.minPurchase) return 0;

  let discount: number;
  if (this.discountType === DiscountType.PERCENTAGE) {
    discount = (subtotal * this.discountValue) / 100;
    if (this.maxDiscount) {
      discount = Math.min(discount, this.maxDiscount);
    }
  } else {
    discount = Math.min(this.discountValue, subtotal);
  }

  return Math.round(discount * 100) / 100;
};

/**
 * Check if coupon applies to a service
 */
couponSchema.methods.appliesToService = function (
  serviceType: 'experience' | 'expertise',
  serviceId: string,
): boolean {
  if (serviceType === 'experience') {
    if (this.scope.allExperiences) return true;
    return (this.scope.experienceIds || []).some(
      (id: mongoose.Types.ObjectId) => id.toString() === serviceId,
    );
  }
  if (this.scope.allExpertise) return true;
  return (this.scope.expertiseIds || []).some(
    (id: mongoose.Types.ObjectId) => id.toString() === serviceId,
  );
};

/**
 * Increment usage count
 */
couponSchema.methods.incrementUsage = async function (): Promise<void> {
  this.usageCount += 1;
  await this.save();
};

/**
 * Coupon model
 */
export const Coupon = mongoose.model<ICoupon>('Coupon', couponSchema);
