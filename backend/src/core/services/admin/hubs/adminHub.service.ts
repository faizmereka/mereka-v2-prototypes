import { Hub, HubStatus } from '@core/models/Hub';
import { User } from '@core/models/User';
import type { PipelineStage } from 'mongoose';

export interface AdminListHubsQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  isFeatured?: boolean;
  plan?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface HubStatsResponse {
  total: number;
  byStatus: Record<string, number>;
  featured: number;
  toReview: number;
  active: number;
  recentHubs: unknown[];
}

export class AdminHubService {
  /**
   * Get hub statistics for admin dashboard
   */
  async getHubStats(): Promise<HubStatsResponse> {
    const [total, statusCounts, featuredCount, recentHubs] = await Promise.all([
      Hub.countDocuments(),
      Hub.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Hub.countDocuments({ isFeatured: true, isActive: true }),
      Hub.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name logo createdAt status')
        .lean(),
    ]);

    // Convert aggregation results to object
    const byStatus: Record<string, number> = {
      draft: 0,
      pending_review: 0,
      approved: 0,
      active: 0,
      rejected: 0,
      inactive: 0,
    };

    for (const item of statusCounts) {
      if (item._id in byStatus) {
        byStatus[item._id] = item.count;
      }
    }

    return {
      total,
      byStatus,
      featured: featuredCount,
      toReview: byStatus.pending_review ?? 0,
      active: byStatus.active ?? 0,
      recentHubs,
    };
  }

  /**
   * List all hubs with filtering and pagination
   */
  async listHubs(query: AdminListHubsQuery) {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      isFeatured,
      plan,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build match filter
    const matchFilter: Record<string, unknown> = {};
    if (status) matchFilter.status = status;
    if (isFeatured !== undefined) matchFilter.isFeatured = isFeatured;
    if (search) {
      matchFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      matchFilter.createdAt = {};
      if (dateFrom) {
        (matchFilter.createdAt as Record<string, Date>).$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        (matchFilter.createdAt as Record<string, Date>).$lt = endDate;
      }
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Build aggregation pipeline
    const pipeline: PipelineStage[] = [
      { $match: matchFilter },
      // Lookup subscription first for plan filtering
      // Use $convert with onError to safely handle invalid ObjectIds (e.g., Stripe subscription IDs)
      {
        $lookup: {
          from: 'subscriptions',
          let: { subId: '$subscriptionId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $ne: ['$$subId', null] },
                    { $ne: ['$$subId', ''] },
                    // Only match if subscriptionId is exactly 24 chars (valid ObjectId length)
                    { $eq: [{ $strLenCP: { $ifNull: ['$$subId', ''] } }, 24] },
                    {
                      $eq: [
                        '$_id',
                        {
                          $convert: {
                            input: '$$subId',
                            to: 'objectId',
                            onError: null,
                            onNull: null,
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
            { $project: { planCode: 1, status: 1 } },
          ],
          as: 'subscriptionData',
        },
      },
      // Unwind subscription
      {
        $unwind: {
          path: '$subscriptionData',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Add plan field for filtering
      {
        $addFields: {
          planCode: { $ifNull: ['$subscriptionData.planCode', 'free'] },
        },
      },
    ];

    // Add plan filter if specified
    if (plan) {
      if (plan.toLowerCase() === 'free') {
        pipeline.push({ $match: { planCode: 'free' } });
      } else {
        pipeline.push({ $match: { planCode: plan.toLowerCase() } });
      }
    }

    // Add facet for count and pagination
    pipeline.push({
      $facet: {
        totalCount: [{ $count: 'count' }],
        data: [
          { $sort: sort },
          { $skip: skip },
          { $limit: limit },
          // Lookup owner from users collection
          {
            $lookup: {
              from: 'users',
              let: { ownerId: '$ownerId' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $ne: ['$$ownerId', null] },
                        { $ne: ['$$ownerId', ''] },
                        { $eq: ['$_id', { $toObjectId: '$$ownerId' }] },
                      ],
                    },
                  },
                },
                { $project: { _id: 1, name: 1, email: 1 } },
              ],
              as: 'ownerData',
            },
          },
          // Lookup plan based on planCode from subscription
          {
            $lookup: {
              from: 'subscriptionproducts',
              let: { planCode: '$subscriptionData.planCode' },
              pipeline: [
                { $match: { $expr: { $eq: ['$planCode', '$$planCode'] } } },
                { $project: { name: 1, planCode: 1 } },
              ],
              as: 'planData',
            },
          },
          // Project final shape
          {
            $project: {
              _id: 1,
              name: 1,
              slug: 1,
              logo: 1,
              phoneNumber: 1,
              status: 1,
              isActive: 1,
              isFeatured: 1,
              displayOrder: { $ifNull: ['$displayOrder', 1000] },
              ownerId: 1,
              createdBy: 1,
              createdAt: 1,
              updatedAt: 1,
              'location.city': 1,
              'location.country': 1,
              owner: { $arrayElemAt: ['$ownerData', 0] },
              plan: {
                $ifNull: [
                  { $arrayElemAt: ['$planData.name', 0] },
                  { $ifNull: ['$subscriptionData.planCode', 'Free'] },
                ],
              },
              planCode: 1,
              subscriptionStatus: '$subscriptionData.status',
            },
          },
        ],
      },
    });

    // Execute aggregation
    const [result] = await Hub.aggregate(pipeline);

    const total = result.totalCount[0]?.count || 0;
    const hubs = result.data || [];

    return {
      items: hubs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get hub by ID with full details
   */
  async getHubById(id: string) {
    const hub = await Hub.findById(id)
      .populate('companyType', 'name')
      .populate('amenities', 'name')
      .populate('facilities', 'name')
      .populate('focusAreas', 'name')
      .populate('spaceTypes', 'name')
      .populate('experienceTypes', 'name')
      .lean();

    if (!hub) {
      throw new Error('Hub not found');
    }

    // Get owner details
    const owner = await User.findById(hub.ownerId).select('name email profilePhoto').lean();

    // Get subscription and plan info
    let plan = 'Free';
    let subscriptionStatus = null;

    if (hub.subscriptionId) {
      const Subscription = (await import('@core/models/Subscription')).Subscription;
      const Plan = (await import('@core/models/Plan')).Plan;

      const subscription = await Subscription.findById(hub.subscriptionId)
        .select('planCode status')
        .lean();

      if (subscription) {
        subscriptionStatus = subscription.status;
        const planDoc = await Plan.findOne({ planCode: subscription.planCode })
          .select('name')
          .lean();
        plan = planDoc?.name || subscription.planCode;
      }
    }

    // Transform populated fields to string arrays
    return {
      ...hub,
      companyType: (hub.companyType as { name?: string } | null)?.name || null,
      amenities: (hub.amenities as Array<{ name?: string }>)?.map((a) => a.name) || [],
      facilities: (hub.facilities as Array<{ name?: string }>)?.map((f) => f.name) || [],
      focusAreas: (hub.focusAreas as Array<{ name?: string }>)?.map((f) => f.name) || [],
      spaceTypes: (hub.spaceTypes as Array<{ name?: string }>)?.map((s) => s.name) || [],
      experienceTypes: (hub.experienceTypes as Array<{ name?: string }>)?.map((e) => e.name) || [],
      owner,
      plan,
      subscriptionStatus,
    };
  }

  /**
   * Update hub status (approve, reject, etc.)
   */
  async updateHubStatus(id: string, status: HubStatus, _reason?: string) {
    const hub = await Hub.findById(id);
    if (!hub) {
      throw new Error('Hub not found');
    }

    hub.status = status;

    // If approving, also set to active
    if (status === HubStatus.APPROVED || status === HubStatus.ACTIVE) {
      hub.isActive = true;
    }

    // If rejecting or setting inactive
    if (status === HubStatus.REJECTED || status === HubStatus.INACTIVE) {
      hub.isActive = false;
      hub.isFeatured = false;
    }

    await hub.save();

    return hub;
  }

  /**
   * Toggle hub featured status
   */
  async toggleHubFeatured(id: string) {
    const hub = await Hub.findById(id);
    if (!hub) {
      throw new Error('Hub not found');
    }

    // Only active hubs can be featured
    if (!hub.isActive && !hub.isFeatured) {
      throw new Error('Only active hubs can be featured');
    }

    hub.isFeatured = !hub.isFeatured;
    await hub.save();

    return hub;
  }

  /**
   * Delete hub (soft delete - set to inactive)
   */
  async deleteHub(id: string) {
    const hub = await Hub.findById(id);
    if (!hub) {
      throw new Error('Hub not found');
    }

    hub.status = HubStatus.INACTIVE;
    hub.isActive = false;
    hub.isFeatured = false;
    await hub.save();

    return hub;
  }

  /**
   * Bulk update hub status
   */
  async bulkUpdateHubStatus(hubIds: string[], status: HubStatus) {
    const updateData: Record<string, unknown> = { status };

    if (status === HubStatus.APPROVED || status === HubStatus.ACTIVE) {
      updateData.isActive = true;
    }
    if (status === HubStatus.REJECTED || status === HubStatus.INACTIVE) {
      updateData.isActive = false;
      updateData.isFeatured = false;
    }

    const result = await Hub.updateMany({ _id: { $in: hubIds } }, { $set: updateData });

    return {
      modifiedCount: result.modifiedCount,
    };
  }

  /**
   * Update hub display order
   */
  async updateHubOrder(id: string, displayOrder: number) {
    const hub = await Hub.findById(id);
    if (!hub) {
      throw new Error('Hub not found');
    }

    hub.displayOrder = displayOrder;
    await hub.save();

    return hub;
  }
}

export const adminHubService = new AdminHubService();
