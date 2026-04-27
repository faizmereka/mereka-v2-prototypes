/**
 * Admin Review Schemas
 * Validation schemas for admin review endpoints
 */

/**
 * Query schema for listing all reviews
 */
export const listReviewsQuerySchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['booking', 'contract', 'all'],
      default: 'all',
      description: 'Review type filter',
    },
    status: {
      type: 'string',
      enum: ['active', 'hidden', 'deleted', 'all'],
      default: 'all',
      description: 'Review status filter',
    },
    rating: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
      description: 'Rating filter',
    },
    serviceType: {
      type: 'string',
      enum: ['experience', 'expertise'],
      description: 'Service type filter (for booking reviews)',
    },
    hubId: {
      type: 'string',
      minLength: 24,
      maxLength: 24,
      description: 'Hub ID filter',
    },
    dateFrom: {
      type: 'string',
      format: 'date',
      description: 'Start date filter',
    },
    dateTo: {
      type: 'string',
      format: 'date',
      description: 'End date filter',
    },
    search: {
      type: 'string',
      minLength: 3,
      maxLength: 100,
      description: 'Search query (reviewer name, content)',
    },
    page: {
      type: 'integer',
      minimum: 1,
      default: 1,
      description: 'Page number',
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      default: 20,
      description: 'Items per page',
    },
    sort: {
      type: 'string',
      enum: ['newest', 'oldest', 'highest', 'lowest'],
      default: 'newest',
      description: 'Sort order',
    },
  },
} as const;

/**
 * Params schema for review ID
 */
export const reviewIdParamsSchema = {
  type: 'object',
  required: ['reviewId'],
  properties: {
    reviewId: {
      type: 'string',
      minLength: 24,
      maxLength: 24,
      description: 'Review ID',
    },
  },
} as const;

/**
 * Query schema for getting review detail
 */
export const getReviewQuerySchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['booking', 'contract'],
      description: 'Review type (if known)',
    },
  },
} as const;

/**
 * Body schema for moderating a review
 */
export const moderateReviewBodySchema = {
  type: 'object',
  required: ['action'],
  properties: {
    action: {
      type: 'string',
      enum: ['hide', 'unhide', 'delete'],
      description: 'Moderation action',
    },
    reason: {
      type: 'string',
      maxLength: 500,
      description: 'Reason for moderation action',
    },
  },
} as const;

/**
 * Query schema for review trends
 */
export const reviewTrendsQuerySchema = {
  type: 'object',
  properties: {
    period: {
      type: 'string',
      enum: ['week', 'month', 'year'],
      default: 'month',
      description: 'Period for trends',
    },
  },
} as const;

/**
 * TypeScript interfaces
 */
export interface ListReviewsQuery {
  type?: 'booking' | 'contract' | 'all';
  status?: 'active' | 'hidden' | 'deleted' | 'all';
  rating?: number;
  serviceType?: 'experience' | 'expertise';
  hubId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest';
}

export interface ReviewIdParams {
  reviewId: string;
}

export interface GetReviewQuery {
  type?: 'booking' | 'contract';
}

export interface ModerateReviewBody {
  action: 'hide' | 'unhide' | 'delete';
  reason?: string;
}

export interface ReviewTrendsQuery {
  period?: 'week' | 'month' | 'year';
}

/**
 * Admin response types
 */
export interface AdminReviewerInfo {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AdminServiceInfo {
  _id: string;
  name: string;
  type: 'experience' | 'expertise';
  slug?: string;
}

export interface AdminHubInfo {
  _id: string;
  name: string;
  logo?: string;
}

export interface AdminJobInfo {
  _id: string;
  title: string;
}

export interface AdminContractInfo {
  _id: string;
  status?: string;
}

export interface AdminBookingInfo {
  _id: string;
  bookingDate?: string;
  status?: string;
  totalPaid?: number;
  currency?: string;
}

export interface AdminBookingReviewResponse {
  _id: string;
  reviewType: 'booking';
  rating: number;
  content: string;
  photos: string[];
  status: 'active' | 'hidden' | 'deleted';
  serviceType: 'experience' | 'expertise';
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  reviewer: AdminReviewerInfo;
  service: AdminServiceInfo;
  hub: AdminHubInfo;
  booking?: AdminBookingInfo;
  moderatedBy?: string;
  moderatedAt?: string;
  moderationReason?: string;
}

export interface AdminContractReviewResponse {
  _id: string;
  reviewType: 'contract';
  rating: number;
  criteriaRatings: {
    quality: number;
    communication: number;
    professionalism: number;
    timeliness: number;
  };
  content: string;
  status: 'active' | 'hidden' | 'deleted';
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  reviewerHub: AdminHubInfo;
  revieweeHub: AdminHubInfo;
  job: AdminJobInfo;
  contract: AdminContractInfo;
  moderatedBy?: string;
  moderatedAt?: string;
  moderationReason?: string;
}

export type AdminReviewResponse = AdminBookingReviewResponse | AdminContractReviewResponse;

export interface AdminReviewsListResponse {
  reviews: AdminReviewResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminReviewStatsResponse {
  totals: {
    bookingReviews: number;
    contractReviews: number;
    totalReviews: number;
  };
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  byStatus: {
    active: number;
    hidden: number;
    deleted: number;
  };
  byMonth: Array<{
    month: string;
    count: number;
    avgRating: number;
  }>;
}

export interface AdminReviewTrendItem {
  date: string;
  bookingReviews: number;
  contractReviews: number;
  total: number;
  avgRating: number;
}

export interface AdminReviewTrendsResponse {
  period: 'week' | 'month' | 'year';
  trends: AdminReviewTrendItem[];
}

export interface ModerationResponse {
  _id: string;
  status: 'active' | 'hidden' | 'deleted';
  moderatedBy: string;
  moderatedAt: string;
  moderationReason?: string;
}
