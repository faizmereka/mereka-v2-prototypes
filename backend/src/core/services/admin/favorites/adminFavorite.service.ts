import { Experience } from '@core/models/Experience';
import { Expertise } from '@core/models/Expertise';
import { Favorite, FavoriteStatus } from '@core/models/Favorite';
import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import type {
  AdminFavoriteOverview,
  AdminFavoriteOverviewQuery,
  AdminFavoriteTopContentItem,
  AdminFavoriteTopContentQuery,
  AdminFavoriteUserEngagementItem,
  AdminFavoriteUserEngagementQuery,
  AdminFavoriteUserEngagementResponse,
} from '@core/schemas/admin';
import type mongoose from 'mongoose';

/**
 * Admin Favorite Service
 * Handles favorite analytics for admin dashboard
 */
class AdminFavoriteService {
  /**
   * Get overview statistics
   */
  async getOverview(query: AdminFavoriteOverviewQuery): Promise<AdminFavoriteOverview> {
    const period = query.period || '30d';
    const { startDate, previousStartDate, previousEndDate } = this.calculateDateRanges(period);
    const _now = new Date();

    // Run all queries in parallel
    const [total, thisPeriod, previousPeriod, activeUsers, byTypeResult] = await Promise.all([
      Favorite.countDocuments({ status: FavoriteStatus.ACTIVE }),
      Favorite.countDocuments({
        status: FavoriteStatus.ACTIVE,
        createdAt: { $gte: startDate },
      }),
      Favorite.countDocuments({
        status: FavoriteStatus.ACTIVE,
        createdAt: { $gte: previousStartDate, $lt: previousEndDate },
      }),
      Favorite.distinct('userId', { status: FavoriteStatus.ACTIVE }).then((ids) => ids.length),
      Favorite.aggregate([
        { $match: { status: FavoriteStatus.ACTIVE } },
        { $group: { _id: '$favoriteableType', count: { $sum: 1 } } },
      ]),
    ]);

    // Process by type
    const byType = {
      expert: 0,
      hub: 0,
      expertise: 0,
      experience: 0,
    };

    for (const item of byTypeResult) {
      const typeKey = item._id as keyof typeof byType;
      if (typeKey in byType) {
        byType[typeKey] = item.count;
      }
    }

    // Calculate trend
    const change =
      previousPeriod > 0
        ? ((thisPeriod - previousPeriod) / previousPeriod) * 100
        : thisPeriod > 0
          ? 100
          : 0;

    const trend = {
      percentage: Math.abs(Math.round(change * 10) / 10),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    } as const;

    // Calculate average per user
    const avgPerUser = activeUsers > 0 ? Math.round((total / activeUsers) * 10) / 10 : 0;

    return {
      total,
      activeUsers,
      thisPeriod,
      avgPerUser,
      byType,
      trend,
      periodComparison: {
        current: thisPeriod,
        previous: previousPeriod,
        change: Math.round(change * 10) / 10,
      },
    };
  }

  /**
   * Get top favorited content
   */
  async getTopContent(query: AdminFavoriteTopContentQuery): Promise<AdminFavoriteTopContentItem[]> {
    const period = query.period || '30d';
    const limit = query.limit || 20;
    const { startDate } = this.calculateDateRanges(period);

    // Build match stage
    const matchStage: Record<string, unknown> = {
      status: FavoriteStatus.ACTIVE,
      createdAt: { $gte: startDate },
    };

    if (query.type) {
      matchStage.favoriteableType = query.type;
    }

    // Aggregate favorites by entity
    const topFavorites = await Favorite.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            type: '$favoriteableType',
            entityId: '$favoriteableId',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    // Group by type for efficient lookup
    const grouped = topFavorites.reduce(
      (acc, item) => {
        const type = item._id.type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(item._id.entityId);
        return acc;
      },
      {} as Record<string, mongoose.Types.ObjectId[]>,
    );

    // Fetch entity details in parallel
    const [experts, hubs, expertises, experiences] = await Promise.all([
      grouped.expert
        ? User.find({ _id: { $in: grouped.expert } })
            .select('_id name username profilePhoto')
            .lean()
        : Promise.resolve([]),
      grouped.hub
        ? Hub.find({ _id: { $in: grouped.hub } })
            .select('_id name slug logo')
            .lean()
        : Promise.resolve([]),
      grouped.expertise
        ? Expertise.find({ _id: { $in: grouped.expertise } })
            .select('_id title slug coverPhoto hubId')
            .populate('hubId', 'name')
            .lean()
        : Promise.resolve([]),
      grouped.experience
        ? Experience.find({ _id: { $in: grouped.experience } })
            .select('_id experienceTitle slug coverPhoto hubId')
            .populate('hubId', 'name')
            .lean()
        : Promise.resolve([]),
    ]);

    // Create lookup maps
    const entityMaps = {
      expert: new Map(experts.map((e) => [e._id.toString(), e])),
      hub: new Map(hubs.map((h) => [h._id.toString(), h])),
      expertise: new Map(expertises.map((e) => [e._id.toString(), e])),
      experience: new Map(experiences.map((e) => [e._id.toString(), e])),
    };

    // Map results with entity details
    return topFavorites.map((item) => {
      const type = item._id.type as keyof typeof entityMaps;
      const entityId = item._id.entityId.toString();
      const entity = entityMaps[type]?.get(entityId);

      return {
        _id: entityId,
        type,
        name: this.getEntityName(type, entity),
        slug: this.getEntitySlug(type, entity),
        image: this.getEntityImage(type, entity),
        favoriteCount: item.count,
        hubName: this.getHubName(type, entity),
      };
    });
  }

  /**
   * Get user engagement statistics
   */
  async getUserEngagement(
    query: AdminFavoriteUserEngagementQuery,
  ): Promise<AdminFavoriteUserEngagementResponse> {
    const period = query.period || '30d';
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;
    const { startDate } = this.calculateDateRanges(period);

    // Aggregate users by favorite count
    const [userStats, totalUsers] = await Promise.all([
      Favorite.aggregate([
        {
          $match: {
            status: FavoriteStatus.ACTIVE,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: '$userId',
            favoriteCount: { $sum: 1 },
            lastFavoritedAt: { $max: '$createdAt' },
          },
        },
        { $sort: { favoriteCount: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]),
      Favorite.aggregate([
        {
          $match: {
            status: FavoriteStatus.ACTIVE,
            createdAt: { $gte: startDate },
          },
        },
        { $group: { _id: '$userId' } },
        { $count: 'total' },
      ]).then((result) => result[0]?.total || 0),
    ]);

    // Get user details
    const userIds = userStats.map((u) => u._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id name email profilePhoto')
      .lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    // Map results
    const items: AdminFavoriteUserEngagementItem[] = userStats.map((stat) => {
      const user = userMap.get(stat._id.toString());
      return {
        _id: stat._id.toString(),
        name: user?.name || 'Unknown User',
        email: user?.email || '',
        profilePhoto: user?.profilePhoto || null,
        favoriteCount: stat.favoriteCount,
        lastFavoritedAt: stat.lastFavoritedAt,
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
    };
  }

  /**
   * Export data as CSV string
   */
  async exportData(
    exportType: string,
    period: string,
  ): Promise<{ filename: string; content: string }> {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    if (exportType === 'top-content') {
      const data = await this.getTopContent({
        period: period as '7d' | '30d' | '90d' | '12m',
        limit: 100,
      });
      const csv = this.generateTopContentCsv(data);
      return { filename: `favorites-top-content-${dateStr}.csv`, content: csv };
    }

    if (exportType === 'user-engagement') {
      const data = await this.getUserEngagement({
        period: period as '7d' | '30d' | '90d' | '12m',
        limit: 1000,
      });
      const csv = this.generateUserEngagementCsv(data.items);
      return { filename: `favorites-user-engagement-${dateStr}.csv`, content: csv };
    }

    // Default: overview
    const data = await this.getOverview({ period: period as '7d' | '30d' | '90d' | '12m' });
    const csv = this.generateOverviewCsv(data);
    return { filename: `favorites-overview-${dateStr}.csv`, content: csv };
  }

  /**
   * Calculate date ranges based on period
   */
  private calculateDateRanges(period: string): {
    startDate: Date;
    previousStartDate: Date;
    previousEndDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(startDate);
        previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(startDate);
        previousStartDate = new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '12m':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        previousEndDate = new Date(startDate);
        previousStartDate = new Date(
          startDate.getFullYear() - 1,
          startDate.getMonth(),
          startDate.getDate(),
        );
        break;
      default: // 30d
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousEndDate = new Date(startDate);
        previousStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, previousStartDate, previousEndDate };
  }

  // Helper methods for entity data extraction
  private getEntityName(type: string, entity: Record<string, unknown> | undefined): string {
    if (!entity) return 'Unknown';
    switch (type) {
      case 'expert':
        return (entity.name as string) || '';
      case 'hub':
        return (entity.name as string) || '';
      case 'expertise':
        return (entity.title as string) || '';
      case 'experience':
        return (entity.experienceTitle as string) || '';
      default:
        return '';
    }
  }

  private getEntitySlug(type: string, entity: Record<string, unknown> | undefined): string {
    if (!entity) return '';
    switch (type) {
      case 'expert':
        return (entity.username as string) || '';
      default:
        return (entity.slug as string) || '';
    }
  }

  private getEntityImage(type: string, entity: Record<string, unknown> | undefined): string | null {
    if (!entity) return null;
    switch (type) {
      case 'expert':
        return (entity.profilePhoto as string) || null;
      case 'hub':
        return (entity.logo as string) || null;
      default:
        return (entity.coverPhoto as string) || null;
    }
  }

  private getHubName(type: string, entity: Record<string, unknown> | undefined): string | null {
    if (!entity) return null;
    if (type === 'expertise' || type === 'experience') {
      const hub = entity.hubId as { name?: string } | undefined;
      return hub?.name || null;
    }
    return null;
  }

  // CSV generation methods
  private generateOverviewCsv(data: AdminFavoriteOverview): string {
    const lines = [
      'Metric,Value',
      `Total Favorites,${data.total}`,
      `Active Users,${data.activeUsers}`,
      `This Period,${data.thisPeriod}`,
      `Avg Per User,${data.avgPerUser}`,
      `Expert Favorites,${data.byType.expert}`,
      `Hub Favorites,${data.byType.hub}`,
      `Expertise Favorites,${data.byType.expertise}`,
      `Experience Favorites,${data.byType.experience}`,
      `Trend Direction,${data.trend.direction}`,
      `Trend Percentage,${data.trend.percentage}%`,
      `Current Period,${data.periodComparison.current}`,
      `Previous Period,${data.periodComparison.previous}`,
      `Change,${data.periodComparison.change}%`,
    ];
    return lines.join('\n');
  }

  private generateTopContentCsv(data: AdminFavoriteTopContentItem[]): string {
    const lines = ['ID,Type,Name,Slug,Favorite Count,Hub Name'];
    for (const item of data) {
      lines.push(
        `${item._id},${item.type},"${item.name}","${item.slug}",${item.favoriteCount},"${item.hubName || ''}"`,
      );
    }
    return lines.join('\n');
  }

  private generateUserEngagementCsv(data: AdminFavoriteUserEngagementItem[]): string {
    const lines = ['User ID,Name,Email,Favorite Count,Last Favorited At'];
    for (const item of data) {
      const dateStr = item.lastFavoritedAt.toISOString();
      lines.push(`${item._id},"${item.name}","${item.email}",${item.favoriteCount},${dateStr}`);
    }
    return lines.join('\n');
  }
}

export const adminFavoriteService = new AdminFavoriteService();
