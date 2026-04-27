/**
 * Admin Favorite Schema
 * Admin dashboard favorites analytics endpoints
 *
 * GET /admin/analytics/favorites/overview - Get overview stats
 * GET /admin/analytics/favorites/top-content - Get top favorited content
 * GET /admin/analytics/favorites/user-engagement - Get user engagement stats
 * GET /admin/analytics/favorites/export - Export to CSV
 */

// ============================================================================
// Request Schemas
// ============================================================================

export const adminFavoriteOverviewQuerySchema = {
  type: 'object',
  properties: {
    period: {
      type: 'string',
      enum: ['7d', '30d', '90d', '12m'],
      default: '30d',
    },
  },
  additionalProperties: false,
} as const;

export const adminFavoriteTopContentQuerySchema = {
  type: 'object',
  properties: {
    period: {
      type: 'string',
      enum: ['7d', '30d', '90d', '12m'],
      default: '30d',
    },
    type: {
      type: 'string',
      enum: ['expert', 'hub', 'expertise', 'experience'],
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      default: 20,
    },
  },
  additionalProperties: false,
} as const;

export const adminFavoriteUserEngagementQuerySchema = {
  type: 'object',
  properties: {
    period: {
      type: 'string',
      enum: ['7d', '30d', '90d', '12m'],
      default: '30d',
    },
    page: {
      type: 'integer',
      minimum: 1,
      default: 1,
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      default: 20,
    },
  },
  additionalProperties: false,
} as const;

export const adminFavoriteExportQuerySchema = {
  type: 'object',
  properties: {
    period: {
      type: 'string',
      enum: ['7d', '30d', '90d', '12m'],
      default: '30d',
    },
    type: {
      type: 'string',
      enum: ['overview', 'top-content', 'user-engagement'],
      default: 'overview',
    },
  },
  additionalProperties: false,
} as const;

// ============================================================================
// Response Schemas
// ============================================================================

export const adminFavoriteOverviewResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        activeUsers: { type: 'integer' },
        thisPeriod: { type: 'integer' },
        avgPerUser: { type: 'number' },
        byType: {
          type: 'object',
          properties: {
            expert: { type: 'integer' },
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
        periodComparison: {
          type: 'object',
          properties: {
            current: { type: 'integer' },
            previous: { type: 'integer' },
            change: { type: 'number' },
          },
        },
      },
    },
  },
} as const;

export const adminFavoriteTopContentItemSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    type: { type: 'string' },
    name: { type: 'string' },
    slug: { type: 'string' },
    image: { type: 'string', nullable: true },
    favoriteCount: { type: 'integer' },
    hubName: { type: 'string', nullable: true },
  },
} as const;

export const adminFavoriteTopContentResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: adminFavoriteTopContentItemSchema,
        },
      },
    },
  },
} as const;

export const adminFavoriteUserEngagementItemSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' },
    profilePhoto: { type: 'string', nullable: true },
    favoriteCount: { type: 'integer' },
    lastFavoritedAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const adminFavoriteUserEngagementResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: adminFavoriteUserEngagementItemSchema,
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

export interface AdminFavoriteOverviewQuery {
  period?: '7d' | '30d' | '90d' | '12m';
}

export interface AdminFavoriteTopContentQuery {
  period?: '7d' | '30d' | '90d' | '12m';
  type?: 'expert' | 'hub' | 'expertise' | 'experience';
  limit?: number;
}

export interface AdminFavoriteUserEngagementQuery {
  period?: '7d' | '30d' | '90d' | '12m';
  page?: number;
  limit?: number;
}

export interface AdminFavoriteExportQuery {
  period?: '7d' | '30d' | '90d' | '12m';
  type?: 'overview' | 'top-content' | 'user-engagement';
}

export interface AdminFavoriteOverview {
  total: number;
  activeUsers: number;
  thisPeriod: number;
  avgPerUser: number;
  byType: {
    expert: number;
    hub: number;
    expertise: number;
    experience: number;
  };
  trend: {
    percentage: number;
    direction: 'up' | 'down' | 'stable';
  };
  periodComparison: {
    current: number;
    previous: number;
    change: number;
  };
}

export interface AdminFavoriteTopContentItem {
  _id: string;
  type: string;
  name: string;
  slug: string;
  image: string | null;
  favoriteCount: number;
  hubName: string | null;
}

export interface AdminFavoriteUserEngagementItem {
  _id: string;
  name: string;
  email: string;
  profilePhoto: string | null;
  favoriteCount: number;
  lastFavoritedAt: Date;
}

export interface AdminFavoriteUserEngagementResponse {
  items: AdminFavoriteUserEngagementItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
