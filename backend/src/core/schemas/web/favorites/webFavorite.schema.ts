/**
 * Web Favorite Schema
 * Learner favorites endpoints
 *
 * POST /favorites - Add a favorite
 * DELETE /favorites/:id - Remove a favorite
 * GET /favorites - List user's favorites
 * GET /favorites/check - Check if items are favorited
 */

// ============================================================================
// Request Schemas
// ============================================================================

export const addFavoriteSchema = {
  body: {
    type: 'object',
    required: ['favoriteableType', 'favoriteableId'],
    properties: {
      favoriteableType: {
        type: 'string',
        enum: ['expert', 'hub', 'expertise', 'experience'],
      },
      favoriteableId: {
        type: 'string',
        pattern: '^[a-fA-F0-9]{24}$',
      },
    },
    additionalProperties: false,
  },
} as const;

export const removeFavoriteParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: {
      type: 'string',
      pattern: '^[a-fA-F0-9]{24}$',
    },
  },
} as const;

export const listFavoritesQuerySchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['expert', 'hub', 'expertise', 'experience'],
    },
    page: {
      type: 'integer',
      minimum: 1,
      default: 1,
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 50,
      default: 20,
    },
  },
  additionalProperties: false,
} as const;

export const checkFavoritesQuerySchema = {
  type: 'object',
  required: ['type', 'ids'],
  properties: {
    type: {
      type: 'string',
      enum: ['expert', 'hub', 'expertise', 'experience'],
    },
    ids: {
      type: 'string',
      description: 'Comma-separated list of ObjectIds',
    },
  },
  additionalProperties: false,
} as const;

// ============================================================================
// Response Schemas
// ============================================================================

export const favoriteItemSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    favoriteableType: { type: 'string' },
    favoriteableId: { type: 'string' },
    entity: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        name: { type: 'string' },
        slug: { type: 'string' },
        image: { type: 'string', nullable: true },
        description: { type: 'string', nullable: true },
      },
      additionalProperties: true,
    },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const listFavoritesResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: favoriteItemSchema,
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
  },
} as const;

export const checkFavoritesResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      additionalProperties: { type: 'boolean' },
    },
  },
} as const;

// ============================================================================
// TypeScript Types
// ============================================================================

export interface AddFavoriteInput {
  favoriteableType: 'expert' | 'hub' | 'expertise' | 'experience';
  favoriteableId: string;
}

export interface RemoveFavoriteParams {
  id: string;
}

export interface ListFavoritesQuery {
  type?: 'expert' | 'hub' | 'expertise' | 'experience';
  page?: number;
  limit?: number;
}

export interface CheckFavoritesQuery {
  type: 'expert' | 'hub' | 'expertise' | 'experience';
  ids: string;
}

export interface FavoriteEntity {
  _id: string;
  name: string;
  slug: string;
  image?: string | null;
  description?: string | null;
  [key: string]: unknown;
}

export interface FavoriteItem {
  _id: string;
  favoriteableType: string;
  favoriteableId: string;
  entity?: FavoriteEntity;
  createdAt: Date;
}

export interface ListFavoritesResponse {
  items: FavoriteItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CheckFavoritesResponse {
  [id: string]: boolean;
}
