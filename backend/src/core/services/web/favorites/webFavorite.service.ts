import { Experience } from '@core/models/Experience';
import { Expertise } from '@core/models/Expertise';
import { Favorite, FavoriteableType, FavoriteStatus } from '@core/models/Favorite';
import { Hub } from '@core/models/Hub';
import { User } from '@core/models/User';
import type {
  AddFavoriteInput,
  CheckFavoritesResponse,
  FavoriteItem,
  ListFavoritesQuery,
  ListFavoritesResponse,
} from '@schemas/web';
import mongoose from 'mongoose';

/**
 * Web Favorite Service
 * Handles favoriting functionality for learners
 */
class WebFavoriteService {
  /**
   * Add a favorite (create or reactivate)
   */
  async addFavorite(userId: string, data: AddFavoriteInput): Promise<FavoriteItem> {
    const favoriteableType = data.favoriteableType as FavoriteableType;
    const favoriteableId = new mongoose.Types.ObjectId(data.favoriteableId);

    // Validate that the entity exists and get hubId if applicable
    const hubId = await this.validateAndGetHubId(favoriteableType, favoriteableId);

    // Try to find existing favorite (including removed ones)
    const existingFavorite = await Favorite.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      favoriteableType,
      favoriteableId,
    });

    if (existingFavorite) {
      // Reactivate if removed
      if (existingFavorite.status === FavoriteStatus.REMOVED) {
        existingFavorite.status = FavoriteStatus.ACTIVE;
        await existingFavorite.save();
      }
      return this.formatFavoriteItem(existingFavorite);
    }

    // Create new favorite
    const favorite = await Favorite.create({
      userId: new mongoose.Types.ObjectId(userId),
      favoriteableType,
      favoriteableId,
      hubId,
      status: FavoriteStatus.ACTIVE,
    });

    return this.formatFavoriteItem(favorite);
  }

  /**
   * Remove a favorite (soft delete)
   */
  async removeFavorite(userId: string, favoriteId: string): Promise<void> {
    const result = await Favorite.updateOne(
      {
        _id: new mongoose.Types.ObjectId(favoriteId),
        userId: new mongoose.Types.ObjectId(userId),
        status: FavoriteStatus.ACTIVE,
      },
      {
        $set: { status: FavoriteStatus.REMOVED },
      },
    );

    if (result.matchedCount === 0) {
      throw new Error('Favorite not found');
    }
  }

  /**
   * List user's favorites with pagination and entity details
   */
  async listFavorites(userId: string, query: ListFavoritesQuery): Promise<ListFavoritesResponse> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 50);
    const skip = (page - 1) * limit;

    // Build filter
    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId),
      status: FavoriteStatus.ACTIVE,
    };

    if (query.type) {
      filter.favoriteableType = query.type;
    }

    // Get favorites with count
    const [favorites, total] = await Promise.all([
      Favorite.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Favorite.countDocuments(filter),
    ]);

    // Populate entity details
    const items = await this.populateEntityDetails(favorites);

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
   * Check if items are favorited by user (batch check)
   */
  async checkFavorites(
    userId: string,
    type: string,
    ids: string[],
  ): Promise<CheckFavoritesResponse> {
    // Initialize result with all false
    const result: CheckFavoritesResponse = {};
    for (const id of ids) {
      result[id] = false;
    }

    // Find favorites
    const favorites = await Favorite.find({
      userId: new mongoose.Types.ObjectId(userId),
      favoriteableType: type as FavoriteableType,
      favoriteableId: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
      status: FavoriteStatus.ACTIVE,
    })
      .select('favoriteableId')
      .lean();

    // Set favorited items to true
    for (const fav of favorites) {
      result[fav.favoriteableId.toString()] = true;
    }

    return result;
  }

  /**
   * Check if a single item is favorited by user
   */
  async isFavorited(
    userId: string,
    favoriteableType: FavoriteableType,
    favoriteableId: string,
  ): Promise<boolean> {
    const favorite = await Favorite.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      favoriteableType,
      favoriteableId: new mongoose.Types.ObjectId(favoriteableId),
      status: FavoriteStatus.ACTIVE,
    }).lean();

    return !!favorite;
  }

  /**
   * Validate entity exists and get hubId for attribution
   */
  private async validateAndGetHubId(
    type: FavoriteableType,
    entityId: mongoose.Types.ObjectId,
  ): Promise<mongoose.Types.ObjectId | undefined> {
    switch (type) {
      case FavoriteableType.EXPERT: {
        const user = await User.findById(entityId).select('_id').lean();
        if (!user) throw new Error('Expert not found');
        return undefined;
      }
      case FavoriteableType.HUB: {
        const hub = await Hub.findById(entityId).select('_id').lean();
        if (!hub) throw new Error('Hub not found');
        return entityId; // Hub itself is the hubId
      }
      case FavoriteableType.EXPERTISE: {
        const expertise = await Expertise.findById(entityId).select('hubId').lean();
        if (!expertise) throw new Error('Expertise not found');
        return expertise.hubId as mongoose.Types.ObjectId;
      }
      case FavoriteableType.EXPERIENCE: {
        const experience = await Experience.findById(entityId).select('hubId').lean();
        if (!experience) throw new Error('Experience not found');
        return new mongoose.Types.ObjectId(experience.hubId as string);
      }
      default:
        throw new Error('Invalid favoriteable type');
    }
  }

  /**
   * Populate entity details for favorites list
   */
  private async populateEntityDetails(
    favorites: Array<{
      _id: unknown;
      favoriteableType: string;
      favoriteableId: unknown;
      createdAt: Date;
    }>,
  ): Promise<FavoriteItem[]> {
    // Group favorites by type
    const grouped = favorites.reduce(
      (acc, fav) => {
        const type = fav.favoriteableType;
        if (!acc[type]) acc[type] = [];
        acc[type].push(fav.favoriteableId as mongoose.Types.ObjectId);
        return acc;
      },
      {} as Record<string, mongoose.Types.ObjectId[]>,
    );

    // Fetch entities in parallel
    const [experts, hubs, expertises, experiences] = await Promise.all([
      grouped.expert
        ? User.find({ _id: { $in: grouped.expert } })
            .select('_id name username profilePhoto professionalTitle')
            .lean()
        : Promise.resolve([]),
      grouped.hub
        ? Hub.find({ _id: { $in: grouped.hub } })
            .select('_id name slug logo description')
            .lean()
        : Promise.resolve([]),
      grouped.expertise
        ? Expertise.find({ _id: { $in: grouped.expertise } })
            .select('_id title slug coverPhoto description')
            .lean()
        : Promise.resolve([]),
      grouped.experience
        ? Experience.find({ _id: { $in: grouped.experience } })
            .select('_id experienceTitle slug coverPhoto experienceDescription')
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

    // Map favorites with entity details
    return favorites.map((fav) => {
      const type = fav.favoriteableType as keyof typeof entityMaps;
      const entityMap = entityMaps[type];
      const rawEntity = entityMap?.get(String(fav.favoriteableId));

      const entity = rawEntity ? this.formatEntityForType(type, rawEntity) : undefined;

      return {
        _id: String(fav._id),
        favoriteableType: fav.favoriteableType,
        favoriteableId: String(fav.favoriteableId),
        entity,
        createdAt: fav.createdAt,
      };
    });
  }

  /**
   * Format entity data based on type
   */
  private formatEntityForType(
    type: string,
    entity: Record<string, unknown>,
  ): {
    _id: string;
    name: string;
    slug: string;
    image: string | null;
    description: string | null;
  } {
    switch (type) {
      case 'expert':
        return {
          _id: (entity._id as mongoose.Types.ObjectId).toString(),
          name: (entity.name as string) || '',
          slug: (entity.username as string) || '',
          image: (entity.profilePhoto as string) || null,
          description: (entity.professionalTitle as string) || null,
        };
      case 'hub':
        return {
          _id: (entity._id as mongoose.Types.ObjectId).toString(),
          name: (entity.name as string) || '',
          slug: (entity.slug as string) || '',
          image: (entity.logo as string) || null,
          description: (entity.description as string) || null,
        };
      case 'expertise':
        return {
          _id: (entity._id as mongoose.Types.ObjectId).toString(),
          name: (entity.title as string) || '',
          slug: (entity.slug as string) || '',
          image: (entity.coverPhoto as string) || null,
          description: (entity.description as string) || null,
        };
      case 'experience':
        return {
          _id: (entity._id as mongoose.Types.ObjectId).toString(),
          name: (entity.experienceTitle as string) || '',
          slug: (entity.slug as string) || '',
          image: (entity.coverPhoto as string) || null,
          description: (entity.experienceDescription as string) || null,
        };
      default:
        return {
          _id: (entity._id as mongoose.Types.ObjectId).toString(),
          name: '',
          slug: '',
          image: null,
          description: null,
        };
    }
  }

  /**
   * Format favorite item
   */
  private formatFavoriteItem(favorite: {
    _id: unknown;
    favoriteableType: string;
    favoriteableId: unknown;
    createdAt: Date;
  }): FavoriteItem {
    return {
      _id: String(favorite._id),
      favoriteableType: favorite.favoriteableType,
      favoriteableId: String(favorite.favoriteableId),
      createdAt: favorite.createdAt,
    };
  }
}

export const webFavoriteService = new WebFavoriteService();
