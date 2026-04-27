import { Subscription, SubscriptionStatus } from '@core/models/Subscription';
import mongoose from 'mongoose';

/**
 * Subscription stats interface
 */
export interface SubscriptionStats {
  total: number;
  byPlan: {
    scale: number;
    soar: number;
  };
  byStatus: {
    active: number;
    trialing: number;
    past_due: number;
    cancelled: number;
    expired: number;
  };
  revenue: {
    mrr: number;
    totalRevenue: number;
    currency: string;
  };
}

/**
 * List subscriptions params
 */
export interface ListSubscriptionsParams {
  page?: number;
  limit?: number;
  planCode?: 'scale' | 'soar';
  status?: SubscriptionStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Subscription list item for admin view
 */
export interface AdminSubscriptionListItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  hubId?: string;
  hubName?: string;
  planCode: string;
  status: string;
  price: number;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  nextBillingDate: Date;
  stripeSubscriptionId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subscription detail with plan information
 */
export interface AdminSubscriptionDetail extends AdminSubscriptionListItem {
  stripeCustomerId?: string;
  billingCycle?: string;
  trialEndDate?: Date;
  plan?: {
    name: string;
    tagline: string;
    description: string;
    features: string[];
    stripeProductId: string;
    stripePriceId: string;
  };
}

/**
 * Admin Subscription Service
 * Handles admin-level subscription operations with stats
 */
export class AdminSubscriptionService {
  /**
   * Get subscription statistics
   */
  async getStats(): Promise<SubscriptionStats> {
    const [totalCount, byPlanResult, byStatusResult, revenueResult] = await Promise.all([
      // Total count
      Subscription.countDocuments(),

      // By plan
      Subscription.aggregate([
        {
          $group: {
            _id: '$planCode',
            count: { $sum: 1 },
          },
        },
      ]),

      // By status
      Subscription.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // MRR calculation (sum of active subscription prices)
      Subscription.aggregate([
        {
          $match: {
            status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
          },
        },
        {
          $group: {
            _id: null,
            mrr: { $sum: '$price' },
            totalCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Convert plan results to object
    const byPlan = { scale: 0, soar: 0 };
    for (const item of byPlanResult) {
      if (item._id === 'scale') byPlan.scale = item.count;
      if (item._id === 'soar') byPlan.soar = item.count;
    }

    // Convert status results to object
    const byStatus = {
      active: 0,
      trialing: 0,
      past_due: 0,
      cancelled: 0,
      expired: 0,
    };
    for (const item of byStatusResult) {
      const status = item._id as keyof typeof byStatus;
      if (status in byStatus) {
        byStatus[status] = item.count;
      }
    }

    // Get MRR
    const mrrData = revenueResult[0] || { mrr: 0 };

    return {
      total: totalCount,
      byPlan,
      byStatus,
      revenue: {
        mrr: mrrData.mrr / 100, // Convert cents to dollars
        totalRevenue: mrrData.mrr / 100, // For now, same as MRR
        currency: 'USD',
      },
    };
  }

  /**
   * List subscriptions with pagination and filters
   */
  async list(params: ListSubscriptionsParams): Promise<{
    subscriptions: AdminSubscriptionListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      planCode,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    // Build match stage
    const matchStage: Record<string, unknown> = {};

    if (planCode) {
      matchStage.planCode = planCode;
    }

    if (status) {
      matchStage.status = status;
    }

    // Build aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },
      // Lookup user
      {
        $lookup: {
          from: 'users',
          let: { userId: { $toObjectId: '$userId' } },
          pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$userId'] } } }],
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      // Lookup hub
      {
        $lookup: {
          from: 'hubs',
          let: { hubId: '$hubId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $ne: ['$$hubId', null] },
                    { $ne: ['$$hubId', ''] },
                    { $eq: ['$_id', { $toObjectId: '$$hubId' }] },
                  ],
                },
              },
            },
          ],
          as: 'hub',
        },
      },
      { $unwind: { path: '$hub', preserveNullAndEmptyArrays: true } },
    ];

    // Add search filter if provided
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'user.name': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } },
            { 'hub.name': { $regex: search, $options: 'i' } },
          ],
        },
      });
    }

    // Add projection
    pipeline.push({
      $project: {
        id: { $toString: '$_id' },
        userId: '$userId',
        userName: { $ifNull: ['$user.name', 'Unknown'] },
        userEmail: { $ifNull: ['$user.email', 'Unknown'] },
        hubId: '$hubId',
        hubName: { $ifNull: ['$hub.name', null] },
        planCode: '$planCode',
        status: '$status',
        price: '$price',
        currency: '$currency',
        currentPeriodStart: '$currentPeriodStart',
        currentPeriodEnd: '$currentPeriodEnd',
        nextBillingDate: '$nextBillingDate',
        stripeSubscriptionId: '$stripeSubscriptionId',
        createdAt: '$createdAt',
        updatedAt: '$updatedAt',
      },
    });

    // Get total count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Subscription.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add sort
    const sortStage: Record<string, 1 | -1> = {};
    sortStage[sortBy] = sortOrder === 'asc' ? 1 : -1;
    pipeline.push({ $sort: sortStage });

    // Add pagination
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: limit });

    const subscriptions = await Subscription.aggregate(pipeline);

    return {
      subscriptions: subscriptions as AdminSubscriptionListItem[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get subscription by ID with related data including plan details
   */
  async getById(id: string): Promise<AdminSubscriptionDetail | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const pipeline: mongoose.PipelineStage[] = [
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      // Lookup user
      {
        $lookup: {
          from: 'users',
          let: { userId: { $toObjectId: '$userId' } },
          pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$userId'] } } }],
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      // Lookup hub
      {
        $lookup: {
          from: 'hubs',
          let: { hubId: '$hubId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $ne: ['$$hubId', null] },
                    { $ne: ['$$hubId', ''] },
                    { $eq: ['$_id', { $toObjectId: '$$hubId' }] },
                  ],
                },
              },
            },
          ],
          as: 'hub',
        },
      },
      { $unwind: { path: '$hub', preserveNullAndEmptyArrays: true } },
      // Lookup plan
      {
        $lookup: {
          from: 'subscriptionproducts',
          let: { planCode: '$planCode' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$planCode', '$$planCode'] },
              },
            },
            {
              $project: {
                name: 1,
                tagline: 1,
                description: 1,
                features: 1,
                stripeProductId: 1,
                stripePriceId: 1,
              },
            },
          ],
          as: 'planData',
        },
      },
      { $unwind: { path: '$planData', preserveNullAndEmptyArrays: true } },
      // Project
      {
        $project: {
          id: { $toString: '$_id' },
          userId: '$userId',
          userName: { $ifNull: ['$user.name', 'Unknown'] },
          userEmail: { $ifNull: ['$user.email', 'Unknown'] },
          hubId: '$hubId',
          hubName: { $ifNull: ['$hub.name', null] },
          planCode: '$planCode',
          status: '$status',
          price: '$price',
          currency: '$currency',
          currentPeriodStart: '$currentPeriodStart',
          currentPeriodEnd: '$currentPeriodEnd',
          nextBillingDate: '$nextBillingDate',
          stripeSubscriptionId: '$stripeSubscriptionId',
          stripeCustomerId: '$stripeCustomerId',
          billingCycle: '$billingCycle',
          trialEndDate: '$trialEndDate',
          planName: '$planData.name',
          planTagline: '$planData.tagline',
          planDescription: '$planData.description',
          planFeatures: '$planData.features',
          planStripeProductId: '$planData.stripeProductId',
          planStripePriceId: '$planData.stripePriceId',
          createdAt: '$createdAt',
          updatedAt: '$updatedAt',
        },
      },
    ];

    const result = await Subscription.aggregate(pipeline);
    if (!result[0]) {
      return null;
    }

    const subscription = result[0] as (typeof result)[0] & {
      planName?: string;
      planTagline?: string;
      planDescription?: string;
      planFeatures?: string[];
      planStripeProductId?: string;
      planStripePriceId?: string;
    };

    // Transform to match interface
    const detail: AdminSubscriptionDetail = {
      id: subscription.id,
      userId: subscription.userId,
      userName: subscription.userName,
      userEmail: subscription.userEmail,
      hubId: subscription.hubId,
      hubName: subscription.hubName,
      planCode: subscription.planCode,
      status: subscription.status,
      price: subscription.price,
      currency: subscription.currency,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      nextBillingDate: subscription.nextBillingDate,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      stripeCustomerId: subscription.stripeCustomerId,
      billingCycle: subscription.billingCycle,
      trialEndDate: subscription.trialEndDate,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      plan:
        subscription.planName && subscription.planStripeProductId
          ? {
              name: subscription.planName,
              tagline: subscription.planTagline || '',
              description: subscription.planDescription || '',
              features: subscription.planFeatures || [],
              stripeProductId: subscription.planStripeProductId,
              stripePriceId: subscription.planStripePriceId || '',
            }
          : undefined,
    };

    return detail;
  }
}

// Export singleton instance
export const adminSubscriptionService = new AdminSubscriptionService();
