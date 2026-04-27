import { Booking, BookingStatus } from '@core/models/Booking';
import { Expertise, ExpertiseStatus } from '@core/models/Expertise';
import { Hub } from '@core/models/Hub';
import { HubMember, HubMemberStatus } from '@core/models/HubMember';
import { User, UserStatus } from '@core/models/User';
import mongoose from 'mongoose';

/**
 * Build MongoDB $switch branches for primary role determination
 * Separated to avoid biome lint issues with 'then' property
 */
function _buildPrimaryRoleBranches() {
  const thenKey = 'then';
  return [
    { case: { $in: ['owner', '$allRoleKeys'] }, [thenKey]: 'owner' },
    { case: { $in: ['admin', '$allRoleKeys'] }, [thenKey]: 'admin' },
    { case: { $in: ['expert', '$allRoleKeys'] }, [thenKey]: 'expert' },
    { case: { $in: ['member', '$allRoleKeys'] }, [thenKey]: 'member' },
  ];
}

/**
 * User type based on hub membership
 */
export type PlatformUserType = 'all' | 'learner' | 'hub_owner' | 'expert' | 'admin' | 'member';

/**
 * Platform user stats
 */
export interface PlatformUserStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  byType: {
    learners: number;
    hubOwners: number;
    experts: number;
    admins: number;
    members: number;
  };
  newThisMonth: number;
  newThisWeek: number;
}

/**
 * Query options for listing platform users
 */
export interface ListPlatformUsersOptions {
  page?: number;
  limit?: number;
  status?: UserStatus;
  userType?: PlatformUserType;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Platform user with computed fields
 */
export interface PlatformUserListItem {
  _id: string;
  name: string;
  email: string;
  profilePhoto?: string;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
  // Computed fields
  userTypes: string[];
  hubCount: number;
  hubDisplay: string; // "Hub Name" or "Hub Name (+2)"
  primaryRole: string;
}

/**
 * Admin Platform User Service
 * Manages platform users (learners, experts, hub owners) - NOT admin users
 */
class AdminPlatformUserService {
  /**
   * Get platform user statistics
   * Optimized with 2 aggregation queries instead of 13+ separate queries
   */
  async getStats(): Promise<PlatformUserStats> {
    // Get date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Run both aggregations in parallel
    const [userStats, memberStats] = await Promise.all([
      // Aggregation 1: User stats (total, by status, by date)
      User.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
            newThisMonth: [{ $match: { createdAt: { $gte: startOfMonth } } }, { $count: 'count' }],
            newThisWeek: [{ $match: { createdAt: { $gte: startOfWeek } } }, { $count: 'count' }],
          },
        },
      ]),

      // Aggregation 2: HubMember stats (by role type + total users with membership)
      HubMember.aggregate([
        { $match: { status: HubMemberStatus.ACTIVE } },
        {
          $lookup: {
            from: 'roles',
            localField: 'roleIds',
            foreignField: '_id',
            as: 'roles',
          },
        },
        { $unwind: '$roles' },
        {
          $group: {
            _id: '$roles.key',
            userIds: { $addToSet: '$userId' },
          },
        },
        {
          $project: {
            roleKey: '$_id',
            count: { $size: '$userIds' },
          },
        },
      ]),
    ]);

    // Parse user stats
    const userResult = userStats[0];
    const total = userResult.total[0]?.count || 0;
    const newThisMonth = userResult.newThisMonth[0]?.count || 0;
    const newThisWeek = userResult.newThisWeek[0]?.count || 0;

    // Parse status counts
    const statusMap = new Map<string, number>();
    for (const item of userResult.byStatus) {
      statusMap.set(item._id, item.count);
    }

    // Parse role counts
    const roleCountMap = new Map<string, number>();
    for (const item of memberStats) {
      roleCountMap.set(item.roleKey, item.count);
    }

    // Get count of users with any hub membership for learners calculation
    const usersWithMembershipCount = await HubMember.distinct('userId', {
      status: HubMemberStatus.ACTIVE,
    }).then((ids) => ids.length);

    const learners = Math.max(0, total - usersWithMembershipCount);

    return {
      total,
      active: statusMap.get(UserStatus.ACTIVE) || 0,
      inactive: statusMap.get(UserStatus.INACTIVE) || 0,
      suspended: statusMap.get(UserStatus.SUSPENDED) || 0,
      byType: {
        learners,
        hubOwners: roleCountMap.get('owner') || 0,
        experts: roleCountMap.get('expert') || 0,
        admins: roleCountMap.get('admin') || 0,
        members: roleCountMap.get('member') || 0,
      },
      newThisMonth,
      newThisWeek,
    };
  }

  /**
   * List platform users with pagination and filters
   * Optimized: Simplified query - sort and paginate first, then enrich with hub data
   */
  async listUsers(options: ListPlatformUsersOptions): Promise<{
    users: PlatformUserListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Build sort
    const sortField = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;

    // Build match stage for initial user filtering
    const matchStage: Record<string, unknown> = {};

    if (options.status) {
      matchStage.status = options.status;
    }

    if (options.search) {
      matchStage.$or = [
        { name: { $regex: options.search, $options: 'i' } },
        { email: { $regex: options.search, $options: 'i' } },
      ];
    }

    // For userType filtering, we need different approaches
    if (options.userType && options.userType !== 'all') {
      if (options.userType === 'learner') {
        // Learners: users with NO hub memberships - needs pre-filter
        const usersWithMemberships = await HubMember.distinct('userId', {
          status: HubMemberStatus.ACTIVE,
        });
        matchStage._id = { $nin: usersWithMemberships };
      } else {
        // Hub users: filter by role type - get user IDs first
        const roleKey = options.userType === 'hub_owner' ? 'owner' : options.userType;
        const membersByRole = await HubMember.aggregate([
          { $match: { status: HubMemberStatus.ACTIVE } },
          {
            $lookup: {
              from: 'roles',
              localField: 'roleIds',
              foreignField: '_id',
              as: 'roles',
            },
          },
          { $match: { 'roles.key': roleKey } },
          { $group: { _id: null, userIds: { $addToSet: '$userId' } } },
        ]);
        const userIds = membersByRole[0]?.userIds || [];
        matchStage._id = { $in: userIds };
      }
    }

    // Get total count and paginated users in parallel
    const [total, users] = await Promise.all([
      User.countDocuments(matchStage),
      User.find(matchStage)
        .select('_id name email profilePhoto status emailVerified createdAt lastLoginAt')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Enrich users with hub data (only for the paginated results - max 100 users)
    const userIds = users.map((u) => u._id);

    // Get hub memberships for these users only
    const memberships = await HubMember.aggregate([
      {
        $match: {
          userId: { $in: userIds },
          status: HubMemberStatus.ACTIVE,
        },
      },
      {
        $lookup: {
          from: 'roles',
          localField: 'roleIds',
          foreignField: '_id',
          as: 'roles',
        },
      },
      {
        $lookup: {
          from: 'hubs',
          localField: 'hubId',
          foreignField: '_id',
          as: 'hub',
        },
      },
      {
        $project: {
          userId: 1,
          hubName: { $arrayElemAt: ['$hub.name', 0] },
          roleKeys: { $map: { input: '$roles', as: 'r', in: '$$r.key' } },
        },
      },
    ]);

    // Group memberships by user
    const userMembershipMap = new Map<string, Array<{ hubName: string; roleKeys: string[] }>>();
    for (const m of memberships) {
      const key = m.userId.toString();
      if (!userMembershipMap.has(key)) {
        userMembershipMap.set(key, []);
      }
      userMembershipMap.get(key)?.push({ hubName: m.hubName, roleKeys: m.roleKeys });
    }

    // Build final user list with computed fields
    const enrichedUsers: PlatformUserListItem[] = users.map((user) => {
      const userMemberships = userMembershipMap.get(user._id.toString()) || [];
      const hubCount = userMemberships.length;
      const hubNames = userMemberships.map((m) => m.hubName).filter(Boolean);
      const allRoleKeys = [...new Set(userMemberships.flatMap((m) => m.roleKeys))];

      // Compute user types and primary role
      const userTypes = allRoleKeys.length > 0 ? allRoleKeys : ['learner'];
      let primaryRole = 'learner';
      if (allRoleKeys.includes('owner')) primaryRole = 'owner';
      else if (allRoleKeys.includes('admin')) primaryRole = 'admin';
      else if (allRoleKeys.includes('expert')) primaryRole = 'expert';
      else if (allRoleKeys.includes('member')) primaryRole = 'member';

      // Format hub display
      let hubDisplay = '-';
      if (hubCount === 1 && hubNames[0]) {
        hubDisplay = hubNames[0];
      } else if (hubCount > 1 && hubNames[0]) {
        hubDisplay = `${hubNames[0]} (+${hubCount - 1})`;
      }

      return {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        profilePhoto: user.profilePhoto,
        status: user.status,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        userTypes,
        hubCount,
        hubDisplay,
        primaryRole,
      };
    });

    return {
      users: enrichedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single platform user by ID with full details and role-specific data
   */
  async getUserById(userId: string): Promise<{
    user: unknown;
    hubMemberships: unknown[];
    roleData: {
      isLearner: boolean;
      isExpert: boolean;
      isHubOwner: boolean;
      expertData?: {
        expertises: unknown[];
        totalExpertises: number;
        publishedExpertises: number;
        totalBookings: number;
        totalEarnings: number;
      };
      hubOwnerData?: {
        ownedHubs: unknown[];
        totalHubs: number;
        totalMembers: number;
        totalServices: number;
      };
      learnerData?: {
        recentBookings: unknown[];
        totalBookings: number;
        totalSpent: number;
      };
    };
    stats: {
      totalBookings: number;
      totalSpent: number;
      totalEarnings: number;
    };
  } | null> {
    const user = await User.findById(userId)
      .select('-password -refreshTokens -passwordResetToken -passwordResetExpires')
      .populate('skills', 'name')
      .populate('focusAreaId', 'name')
      .populate('languages.languageId', 'name')
      .lean();

    if (!user) {
      return null;
    }

    // Get hub memberships with role info
    const memberships = await HubMember.find({
      userId: user._id,
      status: { $in: [HubMemberStatus.ACTIVE, HubMemberStatus.INVITED] },
    })
      .populate('hubId', 'name slug logo status')
      .populate('roleIds', 'key name')
      .lean();

    // Determine user roles from memberships
    const roleKeys = new Set<string>();
    for (const membership of memberships) {
      const roles = membership.roleIds as unknown as Array<{ key: string; name: string }>;
      for (const role of roles) {
        if (role && typeof role === 'object' && 'key' in role) {
          roleKeys.add(role.key);
        }
      }
    }

    const isExpert = roleKeys.has('expert');
    const isHubOwner = roleKeys.has('owner');
    const isLearner = memberships.length === 0; // No hub memberships = learner

    // Prepare role-specific data in parallel
    const [expertData, hubOwnerData, learnerData, bookingStats] = await Promise.all([
      // Expert data
      isExpert ? this.getExpertData(userId) : Promise.resolve(undefined),

      // Hub owner data
      isHubOwner ? this.getHubOwnerData(userId) : Promise.resolve(undefined),

      // Learner data (all users can have bookings as learners)
      this.getLearnerData(userId),

      // Overall booking stats
      this.getUserBookingStats(userId),
    ]);

    return {
      user,
      hubMemberships: memberships,
      roleData: {
        isLearner,
        isExpert,
        isHubOwner,
        expertData,
        hubOwnerData,
        learnerData,
      },
      stats: bookingStats,
    };
  }

  /**
   * Get expert-specific data (expertises they created, bookings received)
   * OPTIMIZED: First fetch expertise IDs, then query bookings by serviceId (indexed)
   */
  private async getExpertData(userId: string): Promise<{
    expertises: unknown[];
    totalExpertises: number;
    publishedExpertises: number;
    totalBookings: number;
    totalEarnings: number;
  }> {
    const userObjId = new mongoose.Types.ObjectId(userId);

    // Step 1: Get expertises created by this user (this is fast with createdBy index)
    const [expertises, expertiseStats, expertiseIds] = await Promise.all([
      // Recent expertises for display
      Expertise.find({ createdBy: userId })
        .select('expertiseTitle slug status coverPhoto hubId createdAt ticket currency')
        .populate('hubId', 'name slug')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // Count expertises
      Expertise.aggregate([
        { $match: { createdBy: userObjId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            published: {
              $sum: { $cond: [{ $eq: ['$status', ExpertiseStatus.PUBLISHED] }, 1, 0] },
            },
          },
        },
      ]),

      // Get all expertise IDs for this user (to query bookings)
      Expertise.find({ createdBy: userId }).distinct('_id'),
    ]);

    // Step 2: Query bookings by serviceId (using existing index) instead of $lookup
    let earningsStats = { totalBookings: 0, totalEarnings: 0 };
    if (expertiseIds.length > 0) {
      const bookingStats = await Booking.aggregate([
        {
          $match: {
            serviceId: { $in: expertiseIds },
            status: { $in: [BookingStatus.COMPLETED, BookingStatus.ACTIVE] },
          },
        },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            totalEarnings: { $sum: '$totalCost' },
          },
        },
      ]);
      earningsStats = bookingStats[0] || { totalBookings: 0, totalEarnings: 0 };
    }

    const expStats = expertiseStats[0] || { total: 0, published: 0 };

    return {
      expertises,
      totalExpertises: expStats.total,
      publishedExpertises: expStats.published,
      totalBookings: earningsStats.totalBookings,
      totalEarnings: earningsStats.totalEarnings,
    };
  }

  /**
   * Get hub owner-specific data (hubs they own, member counts)
   */
  private async getHubOwnerData(userId: string): Promise<{
    ownedHubs: unknown[];
    totalHubs: number;
    totalMembers: number;
    totalServices: number;
  }> {
    // Get hubs owned by this user
    const ownedHubs = await Hub.find({ ownerId: userId })
      .select('name slug logo status location createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const hubIds = ownedHubs.map((h) => h._id);

    const [memberStats, serviceStats] = await Promise.all([
      // Count members across all owned hubs
      HubMember.countDocuments({
        hubId: { $in: hubIds },
        status: HubMemberStatus.ACTIVE,
      }),

      // Count services (expertises) across all owned hubs
      Expertise.countDocuments({
        hubId: { $in: hubIds },
        status: ExpertiseStatus.PUBLISHED,
      }),
    ]);

    return {
      ownedHubs,
      totalHubs: ownedHubs.length,
      totalMembers: memberStats,
      totalServices: serviceStats,
    };
  }

  /**
   * Get learner-specific data (bookings made as a learner)
   */
  private async getLearnerData(userId: string): Promise<{
    recentBookings: unknown[];
    totalBookings: number;
    totalSpent: number;
  }> {
    const [recentBookings, bookingStats] = await Promise.all([
      // Get recent bookings
      Booking.find({ bookedBy: userId })
        .select('serviceType status totalCost currency bookingStartDate bookingEndDate createdAt')
        .populate('hubId', 'name slug')
        .populate('serviceId', 'expertiseTitle name slug')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      // Get booking stats
      Booking.aggregate([
        { $match: { bookedBy: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            totalSpent: {
              $sum: {
                $cond: [
                  { $in: ['$status', [BookingStatus.COMPLETED, BookingStatus.ACTIVE]] },
                  '$totalCost',
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const stats = bookingStats[0] || { totalBookings: 0, totalSpent: 0 };

    return {
      recentBookings,
      totalBookings: stats.totalBookings,
      totalSpent: stats.totalSpent,
    };
  }

  /**
   * Get overall booking statistics for a user
   * OPTIMIZED: Use serviceId index instead of $lookup for earnings
   */
  private async getUserBookingStats(userId: string): Promise<{
    totalBookings: number;
    totalSpent: number;
    totalEarnings: number;
  }> {
    const userObjId = new mongoose.Types.ObjectId(userId);

    // Get expertise IDs for this user (to calculate earnings)
    const expertiseIds = await Expertise.find({ createdBy: userId }).distinct('_id');

    const [spentStats, earningsStats] = await Promise.all([
      // Bookings made (spent) - uses bookedBy index
      Booking.aggregate([
        { $match: { bookedBy: userObjId } },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            totalSpent: {
              $sum: {
                $cond: [
                  { $in: ['$status', [BookingStatus.COMPLETED, BookingStatus.ACTIVE]] },
                  '$totalCost',
                  0,
                ],
              },
            },
          },
        },
      ]),

      // Bookings received (earnings) - now uses serviceId index instead of $lookup
      expertiseIds.length > 0
        ? Booking.aggregate([
            {
              $match: {
                serviceId: { $in: expertiseIds },
                status: { $in: [BookingStatus.COMPLETED, BookingStatus.ACTIVE] },
              },
            },
            {
              $group: {
                _id: null,
                totalEarnings: { $sum: '$totalCost' },
              },
            },
          ])
        : Promise.resolve([{ totalEarnings: 0 }]),
    ]);

    const spent = spentStats[0] || { totalBookings: 0, totalSpent: 0 };
    const earnings = earningsStats[0] || { totalEarnings: 0 };

    return {
      totalBookings: spent.totalBookings,
      totalSpent: spent.totalSpent,
      totalEarnings: earnings.totalEarnings,
    };
  }
}

export const adminPlatformUserService = new AdminPlatformUserService();
