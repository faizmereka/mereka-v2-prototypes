/**
 * Hub Review Schemas
 * Validation schemas for hub review endpoints (hub dashboard)
 */

/**
 * Query parameters for listing hub reviews
 */
export const hubReviewsQuerySchema = {
  type: 'object',
  properties: {
    serviceType: {
      type: 'string',
      enum: ['experience', 'expertise'],
      description: 'Filter by service type',
    },
    serviceId: {
      type: 'string',
      minLength: 24,
      maxLength: 24,
      description: 'Filter by specific service ID',
    },
    rating: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
      description: 'Filter by rating',
    },
    page: {
      type: 'integer',
      minimum: 1,
      default: 1,
      description: 'Page number for pagination',
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 50,
      default: 20,
      description: 'Number of items per page',
    },
  },
} as const;

/**
 * Parameters for hub review routes
 */
export const hubReviewParamsSchema = {
  type: 'object',
  required: ['hubId'],
  properties: {
    hubId: {
      type: 'string',
      minLength: 24,
      maxLength: 24,
      description: 'Hub ID',
    },
  },
} as const;

/**
 * Input types for TypeScript
 */
export interface HubReviewsQuery {
  serviceType?: 'experience' | 'expertise';
  serviceId?: string;
  rating?: number;
  page?: number;
  limit?: number;
}

export interface HubReviewParams {
  hubId: string;
}

/**
 * Response types
 */
export interface HubDashboardReviewResponse {
  _id: string;
  bookingId: string;
  serviceName: string;
  serviceType: 'experience' | 'expertise';
  serviceId: string;
  rating: number;
  content: string;
  photos: string[];
  reviewer: {
    name: string;
    avatar?: string;
  };
  hubReply?: {
    content: string;
    createdAt: string;
    updatedAt?: string;
  };
  isEdited: boolean;
  createdAt: string;
}

export interface HubReviewListResponse {
  reviews: HubDashboardReviewResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Hub review stats response
 */
export interface HubReviewStatsResponse {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  responseRate: number;
  totalWithReplies: number;
}

/**
 * Parameters for hub reply routes
 */
export const hubReplyParamsSchema = {
  type: 'object',
  required: ['hubId', 'bookingId'],
  properties: {
    hubId: {
      type: 'string',
      minLength: 24,
      maxLength: 24,
      description: 'Hub ID',
    },
    bookingId: {
      type: 'string',
      minLength: 24,
      maxLength: 24,
      description: 'Booking ID',
    },
  },
} as const;

/**
 * Body schema for creating/updating hub reply
 */
export const hubReplyBodySchema = {
  type: 'object',
  required: ['content'],
  properties: {
    content: {
      type: 'string',
      minLength: 1,
      maxLength: 500,
      description: 'Reply content (max 500 characters)',
    },
  },
} as const;

/**
 * TypeScript types for hub reply
 */
export interface HubReplyParams {
  hubId: string;
  bookingId: string;
}

export interface HubReplyBody {
  content: string;
}

export interface HubReplyResponse {
  content: string;
  createdAt: string;
  updatedAt?: string;
}
