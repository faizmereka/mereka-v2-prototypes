import mongoose, { type Document } from 'mongoose';

const { Schema } = mongoose;

/**
 * Favoriteable type enum - types of content that can be favorited
 */
export enum FavoriteableType {
  EXPERT = 'expert',
  HUB = 'hub',
  EXPERTISE = 'expertise',
  EXPERIENCE = 'experience',
}

/**
 * Favorite status enum
 */
export enum FavoriteStatus {
  ACTIVE = 'active',
  REMOVED = 'removed', // Soft delete
}

/**
 * Favorite document interface
 */
export interface IFavorite extends Document {
  userId: mongoose.Types.ObjectId; // User who favorited
  favoriteableType: FavoriteableType;
  favoriteableId: mongoose.Types.ObjectId; // ID of favorited entity
  hubId?: mongoose.Types.ObjectId; // For hub content attribution (expertise/experience)
  status: FavoriteStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Favorite schema definition
 */
const favoriteSchema = new Schema<IFavorite>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    favoriteableType: {
      type: String,
      enum: Object.values(FavoriteableType),
      required: true,
      index: true,
    },
    favoriteableId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    hubId: {
      type: Schema.Types.ObjectId,
      ref: 'Hub',
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(FavoriteStatus),
      default: FavoriteStatus.ACTIVE,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'favorites',
    toJSON: {
      transform: (_doc, ret) => {
        const { __v: _v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Unique constraint: User can only favorite an entity once
favoriteSchema.index({ userId: 1, favoriteableType: 1, favoriteableId: 1 }, { unique: true });

// Query optimization: User's favorites list
favoriteSchema.index({ userId: 1, favoriteableType: 1, status: 1, createdAt: -1 });

// Hub Dashboard: Find all favorites for hub content
favoriteSchema.index({ hubId: 1, status: 1, createdAt: -1 });

// Analytics: Time-based queries
favoriteSchema.index({ createdAt: -1, status: 1 });

// Entity lookup: Find all favorites for a specific entity
favoriteSchema.index({ favoriteableType: 1, favoriteableId: 1, status: 1 });

/**
 * Static methods
 */

/**
 * Find favorites by user
 */
favoriteSchema.statics.findByUserId = function (
  userId: mongoose.Types.ObjectId | string,
  options?: { type?: FavoriteableType; status?: FavoriteStatus; limit?: number },
) {
  const query = this.find({ userId, status: options?.status || FavoriteStatus.ACTIVE });
  if (options?.type) query.where('favoriteableType').equals(options.type);
  if (options?.limit) query.limit(options.limit);
  return query.sort({ createdAt: -1 });
};

/**
 * Find favorites for hub content
 */
favoriteSchema.statics.findByHubId = function (
  hubId: mongoose.Types.ObjectId | string,
  options?: { status?: FavoriteStatus; limit?: number },
) {
  const query = this.find({ hubId, status: options?.status || FavoriteStatus.ACTIVE });
  if (options?.limit) query.limit(options.limit);
  return query.sort({ createdAt: -1 });
};

/**
 * Count favorites for an entity
 */
favoriteSchema.statics.countByEntity = function (
  favoriteableType: FavoriteableType,
  favoriteableId: mongoose.Types.ObjectId | string,
) {
  return this.countDocuments({
    favoriteableType,
    favoriteableId,
    status: FavoriteStatus.ACTIVE,
  });
};

/**
 * Favorite model
 */
export const Favorite = mongoose.model<IFavorite>('Favorite', favoriteSchema);
