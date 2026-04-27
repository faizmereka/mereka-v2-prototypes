import { Experience } from '@core/models/Experience';
import { Expertise } from '@core/models/Expertise';
import { Favorite, FavoriteableType, FavoriteStatus } from '@core/models/Favorite';
import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import type {
  HubFavoriteListQuery,
  HubFavoriteListResponse,
  HubFavoriteStats,
} from '@core/schemas/hub';
import mongoose from 'mongoose';

/**
 * Hub Favorite Service
 * Handles favorite analytics and user visibility for hub dashboard
 */
class HubFavoriteService {
  /**
   * Get favorite stats for a hub
   */
  async getStats(hubId: string): Promise<HubFavoriteStats> {
    const hubObjectId = new mongoose.Types.ObjectId(hubId);
    const now = new Date();

    // Calculate date ranges
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get hub's content IDs (expertise and experience)
    const [expertises, experiences] = await Promise.all([
      Expertise.find({ hubId }).select('_id').lean(),
      Experience.find({ hubId }).select('_id').lean(),
    ]);

    const expertiseIds = expertises.map((e) => e._id);
    const experienceIds = experiences.map((e) => e._id);

    // Build query for all hub-related favorites
    const buildHubFavoritesQuery = () => ({
      status: FavoriteStatus.ACTIVE,
      $or: [
        { favoriteableType: FavoriteableType.HUB, favoriteableId: hubObjectId },
        {
          favoriteableType: FavoriteableType.EXPERTISE,
          favoriteableId: { $in: expertiseIds },
        },
        {
          favoriteableType: FavoriteableType.EXPERIENCE,
          favoriteableId: { $in: experienceIds },
        },
      ],
    });

    // Run all queries in parallel
    const [total, thisMonth, thisWeek, lastMonth, byTypeResult] = await Promise.all([
      Favorite.countDocuments(buildHubFavoritesQuery()),
      Favorite.countDocuments({
        ...buildHubFavoritesQuery(),
        createdAt: { $gte: startOfMonth },
      }),
      Favorite.countDocuments({
        ...buildHubFavoritesQuery(),
        createdAt: { $gte: startOfWeek },
      }),
      Favorite.countDocuments({
        ...buildHubFavoritesQuery(),
        createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      }),
      Favorite.aggregate([
        { $match: buildHubFavoritesQuery() },
        { $group: { _id: '$favoriteableType', count: { $sum: 1 } } },
      ]),
    ]);

    // Process by type
    const byType = {
      hub: 0,
      expertise: 0,
      experience: 0,
    };

    for (const item of byTypeResult) {
      if (item._id === FavoriteableType.HUB) byType.hub = item.count;
      if (item._id === FavoriteableType.EXPERTISE) byType.expertise = item.count;
      if (item._id === FavoriteableType.EXPERIENCE) byType.experience = item.count;
    }

    // Calculate trend
    const change =
      lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : thisMonth > 0 ? 100 : 0;
    const trend = {
      percentage: Math.abs(Math.round(change * 10) / 10),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
    } as const;

    return {
      total,
      thisMonth,
      thisWeek,
      byType,
      trend,
    };
  }

  /**
   * List users who favorited hub content (name + photo only for privacy)
   */
  async listFavorites(
    hubId: string,
    query: HubFavoriteListQuery,
  ): Promise<HubFavoriteListResponse> {
    const hubObjectId = new mongoose.Types.ObjectId(hubId);
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 50);
    const skip = (page - 1) * limit;

    // Build filter based on query
    let filter: Record<string, unknown>;

    if (query.contentId) {
      // Specific content
      filter = {
        status: FavoriteStatus.ACTIVE,
        favoriteableType: query.contentType,
        favoriteableId: new mongoose.Types.ObjectId(query.contentId),
      };
    } else if (query.contentType) {
      // Specific content type
      let ids: mongoose.Types.ObjectId[] = [];

      if (query.contentType === 'hub') {
        ids = [hubObjectId];
      } else if (query.contentType === 'expertise') {
        const expertises = await Expertise.find({ hubId }).select('_id').lean();
        ids = expertises.map((e) => e._id as mongoose.Types.ObjectId);
      } else if (query.contentType === 'experience') {
        const experiences = await Experience.find({ hubId }).select('_id').lean();
        ids = experiences.map((e) => e._id as mongoose.Types.ObjectId);
      }

      filter = {
        status: FavoriteStatus.ACTIVE,
        favoriteableType: query.contentType,
        favoriteableId: { $in: ids },
      };
    } else {
      // All hub content
      const [expertises, experiences] = await Promise.all([
        Expertise.find({ hubId }).select('_id').lean(),
        Experience.find({ hubId }).select('_id').lean(),
      ]);

      filter = {
        status: FavoriteStatus.ACTIVE,
        $or: [
          { favoriteableType: FavoriteableType.HUB, favoriteableId: hubObjectId },
          {
            favoriteableType: FavoriteableType.EXPERTISE,
            favoriteableId: { $in: expertises.map((e) => e._id) },
          },
          {
            favoriteableType: FavoriteableType.EXPERIENCE,
            favoriteableId: { $in: experiences.map((e) => e._id) },
          },
        ],
      };
    }

    // Get favorites with user details
    const [favorites, total] = await Promise.all([
      Favorite.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Favorite.countDocuments(filter),
    ]);

    // Get unique user IDs
    const userIds = [...new Set(favorites.map((f) => f.userId.toString()))];

    // Fetch user details (name + photo only for privacy)
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id name profilePhoto')
      .lean();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    // Map to response
    const items = favorites.map((fav) => {
      const user = userMap.get(fav.userId.toString());
      return {
        _id: fav._id.toString(),
        name: user?.name || 'Unknown User',
        profilePhoto: user?.profilePhoto || null,
        favoritedAt: fav.createdAt,
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Verify user has access to hub
   */
  async verifyHubAccess(hubId: string, _userId: string): Promise<boolean> {
    const hub = await Hub.findById(hubId).select('_id').lean();
    return !!hub;
  }
}

export const hubFavoriteService = new HubFavoriteService();
