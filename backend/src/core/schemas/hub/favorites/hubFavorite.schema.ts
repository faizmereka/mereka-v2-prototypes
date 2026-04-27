/**
 * Hub Favorite Schema
 * Hub dashboard favorites endpoints
 *
 * GET /hub/:hubId/dashboard/favorites/stats - Get favorite stats
 * GET /hub/:hubId/dashboard/favorites - List who favorited
 */

// ============================================================================
// Request Schemas
// ============================================================================

export const hubFavoriteStatsParamsSchema = {
  type: 'object',
  required: ['hubId'],
  properties: {
    hubId: {
      type: 'string',
      pattern: '^[a-fA-F0-9]{24}$',
    },
  },
} as const;

export const hubFavoriteListQuerySchema = {
  type: 'object',
  properties: {
    contentType: {
      type: 'string',
      enum: ['hub', 'expertise', 'experience'],
    },
    contentId: {
      type: 'string',
      pattern: '^[a-fA-F0-9]{24}$',
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

// ============================================================================
// Response Schemas
// ============================================================================

export const hubFavoriteStatsResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        thisMonth: { type: 'integer' },
        thisWeek: { type: 'integer' },
        byType: {
          type: 'object',
          properties: {
            hub: { type: 'integer' },
            expertise: { type: 'integer' },
            experience: { type: 'integer' },
          },
        },
        trend: {
          type: 'object',
          properties: {
            percentage: { type: 'number' },
            direction: { type: 'string', enum: ['up', 'down', 'stable'] },
          },
        },
      },
    },
  },
} as const;

export const hubFavoriteUserSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    name: { type: 'string' },
    profilePhoto: { type: 'string', nullable: true },
    favoritedAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const hubFavoriteListResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: hubFavoriteUserSchema,
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

// ============================================================================
// TypeScript Types
// ============================================================================

export interface HubFavoriteStatsParams {
  hubId: string;
}

export interface HubFavoriteListQuery {
  contentType?: 'hub' | 'expertise' | 'experience';
  contentId?: string;
  page?: number;
  limit?: number;
}

export interface HubFavoriteStats {
  total: number;
  thisMonth: number;
  thisWeek: number;
  byType: {
    hub: number;
    expertise: number;
    experience: number;
  };
  trend: {
    percentage: number;
    direction: 'up' | 'down' | 'stable';
  };
}

export interface HubFavoriteUser {
  _id: string;
  name: string;
  profilePhoto: string | null;
  favoritedAt: Date;
}

export interface HubFavoriteListResponse {
  items: HubFavoriteUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
