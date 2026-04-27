import { Coupon, CouponStatus, CouponType, DiscountType, type ICoupon } from '@core/models/Coupon';
import { CouponUsage, type ICouponUsage } from '@core/models/CouponUsage';
import mongoose, { type Document } from 'mongoose';

const { ObjectId } = mongoose.Types;

/**
 * Coupon validation result
 */
export interface CouponValidationResult {
  valid: boolean;
  message: string;
  couponId?: string;
  couponCode?: string;
  couponType?: CouponType;
  discountType?: DiscountType;
  discountValue?: number;
  discount?: number; // Calculated discount amount
  maxDiscount?: number;
}

/**
 * Apply coupon input
 */
export interface ApplyCouponInput {
  couponId: string;
  userId: string;
  bookingId: string;
  discountAmount: number;
  currency: string;
  serviceType: 'experience' | 'expertise';
  serviceId: string;
  hubId: string;
}

/**
 * Coupon error codes
 */
export enum CouponErrorCode {
  NOT_FOUND = 'COUPON_NOT_FOUND',
  EXPIRED = 'COUPON_EXPIRED',
  INACTIVE = 'COUPON_INACTIVE',
  NOT_STARTED = 'COUPON_NOT_STARTED',
  USAGE_LIMIT_REACHED = 'COUPON_USAGE_LIMIT_REACHED',
  PER_USER_LIMIT_REACHED = 'COUPON_PER_USER_LIMIT_REACHED',
  MIN_PURCHASE_NOT_MET = 'COUPON_MIN_PURCHASE_NOT_MET',
  NOT_APPLICABLE = 'COUPON_NOT_APPLICABLE',
  INVALID_HUB = 'COUPON_INVALID_HUB',
}

/**
 * Coupon Service
 *
 * Handles coupon validation, discount calculation, and usage tracking.
 */
class CouponService {
  /**
   * Validate a coupon code
   *
   * @param code - Coupon code to validate
   * @param serviceType - Type of service (experience/expertise)
   * @param serviceId - ID of the service
   * @param userId - User attempting to use the coupon
   * @param amount - Subtotal amount for discount calculation
   * @param hubId - Optional hub ID (for hub coupon validation)
   * @returns Validation result with discount amount
   */
  async validateCoupon(
    code: string,
    serviceType: 'experience' | 'expertise',
    serviceId: string,
    userId: string,
    amount: number,
    hubId?: string,
  ): Promise<CouponValidationResult> {
    // Find coupon by code
    const coupon = await Coupon.findOne({
      code: code.toUpperCase().trim(),
    });

    if (!coupon) {
      return {
        valid: false,
        message: 'Invalid coupon code',
      };
    }

    // Check status
    if (coupon.status !== CouponStatus.ACTIVE) {
      return {
        valid: false,
        message:
          coupon.status === CouponStatus.EXPIRED
            ? 'This coupon has expired'
            : 'This coupon is not active',
      };
    }

    // Check date validity
    const now = new Date();
    if (now < coupon.startDate) {
      return {
        valid: false,
        message: 'This coupon is not yet valid',
      };
    }
    if (now > coupon.endDate) {
      return {
        valid: false,
        message: 'This coupon has expired',
      };
    }

    // Check hub coupon - must match hub
    if (coupon.couponType === CouponType.HUB) {
      if (!hubId || coupon.hubId?.toString() !== hubId) {
        return {
          valid: false,
          message: 'This coupon is not valid for this service',
        };
      }
    }

    // Check usage limit
    if (coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) {
      return {
        valid: false,
        message: 'This coupon has reached its usage limit',
      };
    }

    // Check per-user limit
    if (coupon.perUserLimit !== undefined) {
      const userUsageCount = await CouponUsage.countDocuments({
        couponId: coupon._id,
        userId: new ObjectId(userId),
      });
      if (userUsageCount >= coupon.perUserLimit) {
        return {
          valid: false,
          message: 'You have already used this coupon the maximum number of times',
        };
      }
    }

    // Check minimum purchase
    if (coupon.minPurchase && amount < coupon.minPurchase) {
      return {
        valid: false,
        message: `Minimum purchase of ${coupon.minPurchase} required to use this coupon`,
      };
    }

    // Check scope
    const isInScope = this.checkScope(coupon, serviceType, serviceId);
    if (!isInScope) {
      return {
        valid: false,
        message: 'This coupon is not valid for this service',
      };
    }

    // Calculate discount
    const discount = this.calculateDiscount(coupon, amount);

    return {
      valid: true,
      message: `${coupon.name} applied! You save ${discount.toFixed(2)}`,
      couponId: String(coupon._id),
      couponCode: coupon.code,
      couponType: coupon.couponType,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discount,
      maxDiscount: coupon.maxDiscount,
    };
  }

  /**
   * Check if coupon applies to a service
   */
  private checkScope(
    coupon: ICoupon,
    serviceType: 'experience' | 'expertise',
    serviceId: string,
  ): boolean {
    if (serviceType === 'experience') {
      if (coupon.scope.allExperiences) return true;
      return (coupon.scope.experienceIds || []).some((id) => id.toString() === serviceId);
    }
    if (coupon.scope.allExpertise) return true;
    return (coupon.scope.expertiseIds || []).some((id) => id.toString() === serviceId);
  }

  /**
   * Calculate discount amount
   */
  private calculateDiscount(coupon: ICoupon, amount: number): number {
    if (amount <= 0) return 0;

    let discount: number;

    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discount = (amount * coupon.discountValue) / 100;
      // Apply max discount cap for percentage discounts
      if (coupon.maxDiscount !== undefined) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else {
      // Fixed discount - cannot exceed amount
      discount = Math.min(coupon.discountValue, amount);
    }

    return Math.round(discount * 100) / 100;
  }

  /**
   * Apply a coupon (record usage and increment count)
   *
   * Call this after successful payment to track usage.
   */
  async applyCoupon(input: ApplyCouponInput): Promise<ICouponUsage> {
    const { couponId, userId, bookingId, discountAmount, currency, serviceType, serviceId, hubId } =
      input;

    // Create usage record
    const usage = await CouponUsage.create({
      couponId: new ObjectId(couponId),
      userId: new ObjectId(userId),
      bookingId: new ObjectId(bookingId),
      discountAmount,
      currency,
      serviceType,
      serviceId: new ObjectId(serviceId),
      hubId: new ObjectId(hubId),
      usedAt: new Date(),
    });

    // Increment coupon usage count
    await Coupon.updateOne({ _id: new ObjectId(couponId) }, { $inc: { usageCount: 1 } });

    return usage;
  }

  /**
   * Get coupon by ID
   */
  async getCouponById(couponId: string): Promise<ICoupon | null> {
    return Coupon.findById(couponId);
  }

  /**
   * Get coupon by code
   */
  async getCouponByCode(code: string): Promise<ICoupon | null> {
    return Coupon.findOne({ code: code.toUpperCase().trim() });
  }

  /**
   * Get active coupons for a hub
   */
  async getHubCoupons(
    hubId: string,
    options?: { limit?: number },
  ): Promise<Array<Omit<ICoupon, keyof Document>>> {
    const now = new Date();
    const query = Coupon.find({
      hubId: new ObjectId(hubId),
      couponType: CouponType.HUB,
      status: CouponStatus.ACTIVE,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    if (options?.limit) {
      query.limit(options.limit);
    }

    return query.sort({ createdAt: -1 }).lean();
  }

  /**
   * Get active Mereka platform coupons
   */
  async getMerekaCoupons(options?: {
    limit?: number;
  }): Promise<Array<Omit<ICoupon, keyof Document>>> {
    const now = new Date();
    const query = Coupon.find({
      couponType: CouponType.MEREKA,
      status: CouponStatus.ACTIVE,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    if (options?.limit) {
      query.limit(options.limit);
    }

    return query.sort({ createdAt: -1 }).lean();
  }

  /**
   * Get coupons applicable to a service
   */
  async getApplicableCoupons(
    serviceType: 'experience' | 'expertise',
    serviceId: string,
    hubId: string,
  ): Promise<Array<Omit<ICoupon, keyof Document>>> {
    const now = new Date();

    // Build scope query based on service type
    const scopeQuery =
      serviceType === 'experience'
        ? {
            $or: [
              { 'scope.allExperiences': true },
              { 'scope.experienceIds': new ObjectId(serviceId) },
            ],
          }
        : {
            $or: [
              { 'scope.allExpertise': true },
              { 'scope.expertiseIds': new ObjectId(serviceId) },
            ],
          };

    // Find both Mereka coupons and Hub coupons for this hub
    const coupons = await Coupon.find({
      $and: [
        {
          $or: [
            { couponType: CouponType.MEREKA },
            { couponType: CouponType.HUB, hubId: new ObjectId(hubId) },
          ],
        },
        scopeQuery,
        {
          status: CouponStatus.ACTIVE,
          startDate: { $lte: now },
          endDate: { $gte: now },
        },
      ],
    })
      .sort({ discountValue: -1 })
      .lean();

    // Filter out coupons that have reached usage limit
    return coupons.filter((c) => {
      if (c.usageLimit === undefined) return true;
      return c.usageCount < c.usageLimit;
    });
  }

  /**
   * Get user's coupon usage history
   */
  async getUserCouponUsage(
    userId: string,
    options?: { limit?: number },
  ): Promise<Array<Omit<ICouponUsage, keyof Document>>> {
    const query = CouponUsage.find({ userId: new ObjectId(userId) })
      .populate('couponId', 'code name discountType discountValue')
      .sort({ usedAt: -1 });

    if (options?.limit) {
      query.limit(options.limit);
    }

    return query.lean();
  }

  /**
   * Check if user can use a specific coupon (quick check)
   */
  async canUserUseCoupon(
    couponId: string,
    userId: string,
  ): Promise<{ canUse: boolean; reason?: string }> {
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return { canUse: false, reason: 'Coupon not found' };
    }

    if (coupon.status !== CouponStatus.ACTIVE) {
      return { canUse: false, reason: 'Coupon is not active' };
    }

    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      return { canUse: false, reason: 'Coupon is not valid at this time' };
    }

    if (coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) {
      return { canUse: false, reason: 'Coupon usage limit reached' };
    }

    if (coupon.perUserLimit !== undefined) {
      const userUsage = await CouponUsage.countDocuments({
        couponId: new ObjectId(couponId),
        userId: new ObjectId(userId),
      });
      if (userUsage >= coupon.perUserLimit) {
        return { canUse: false, reason: 'You have already used this coupon' };
      }
    }

    return { canUse: true };
  }
}

// Export singleton instance
export const couponService = new CouponService();
