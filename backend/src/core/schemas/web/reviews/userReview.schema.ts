/**
 * User Review Schemas
 * Validation schemas for user review endpoints
 */

/**
 * Body schema for creating a review
 * Note: bookingId comes from URL params, not body
 */
export const createReviewBodySchema = {
  type: 'object',
  required: ['rating', 'content'],
  properties: {
    rating: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
      description: 'Rating from 1 to 5',
    },
    content: {
      type: 'string',
      minLength: 25,
      maxLength: 2000,
      description: 'Review content (25-2000 characters)',
    },
    photos: {
      type: 'array',
      items: {
        type: 'string',
        format: 'uri',
      },
      maxItems: 5,
      default: [],
      description: 'Photo URLs (max 5)',
    },
  },
} as const;

/**
 * Body schema for updating a review
 */
export const updateReviewBodySchema = {
  type: 'object',
  properties: {
    rating: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
      description: 'Rating from 1 to 5',
    },
    content: {
      type: 'string',
      minLength: 25,
      maxLength: 2000,
      description: 'Review content (25-2000 characters)',
    },
    photos: {
      type: 'array',
      items: {
        type: 'string',
        format: 'uri',
      },
      maxItems: 5,
      description: 'Photo URLs (max 5)',
    },
  },
} as const;

/**
 * Parameters for review routes with reviewId
 */
export const reviewParamsSchema = {
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
 * Parameters for booking review route
 */
export const bookingReviewParamsSchema = {
  type: 'object',
  required: ['bookingId'],
  properties: {
    bookingId: {
      type: 'string',
      minLength: 24,
      maxLength: 24,
      description: 'Booking ID',
    },
  },
} as const;

/**
 * Query parameters for listing reviews (public)
 */
export const listReviewsQuerySchema = {
  type: 'object',
  properties: {
    sort: {
      type: 'string',
      enum: ['newest', 'highest', 'lowest'],
      default: 'newest',
      description: 'Sort order',
    },
    rating: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
      description: 'Filter by rating',
    },
    cursor: {
      type: 'string',
      description: 'Cursor for pagination (review ID)',
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
 * Parameters for experience reviews route
 */
export const experienceReviewsParamsSchema = {
  type: 'object',
  required: ['experienceId'],
  properties: {
    experienceId: {
      type: 'string',
      minLength: 24,
      maxLength: 24,
      description: 'Experience ID',
    },
  },
} as const;

/**
 * Parameters for expertise reviews route
 */
export const expertiseReviewsParamsSchema = {
  type: 'object',
  required: ['expertiseId'],
  properties: {
    expertiseId: {
      type: 'string',
      minLength: 24,
      maxLength: 24,
      description: 'Expertise ID',
    },
  },
} as const;

/**
 * Parameters for hub reviews route
 */
export const hubReviewsParamsSchema = {
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
 * Query parameters for hub reviews (includes type filter)
 */
export const hubReviewsQuerySchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['booking', 'contract', 'all'],
      default: 'all',
      description: 'Filter by review type',
    },
    sort: {
      type: 'string',
      enum: ['newest', 'highest', 'lowest'],
      default: 'newest',
      description: 'Sort order',
    },
    rating: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
      description: 'Filter by rating',
    },
    cursor: {
      type: 'string',
      description: 'Cursor for pagination (review ID)',
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
 * Query parameters for listing user's own reviews
 */
export const listMyReviewsQuerySchema = {
  type: 'object',
  properties: {
    page: {
      type: 'integer',
      minimum: 1,
      default: 1,
      description: 'Page number',
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
 * Input types for TypeScript
 */
export interface CreateReviewBodyInput {
  rating: number;
  content: string;
  photos?: string[];
}

export interface CreateReviewInput {
  bookingId: string;
  rating: number;
  content: string;
  photos?: string[];
}

export interface UpdateReviewInput {
  rating?: number;
  content?: string;
  photos?: string[];
}

export interface ReviewParams {
  reviewId: string;
}

export interface BookingReviewParams {
  bookingId: string;
}

export interface ExperienceReviewsParams {
  experienceId: string;
}

export interface ExpertiseReviewsParams {
  expertiseId: string;
}

export interface HubReviewsParams {
  hubId: string;
}

export interface ListReviewsQuery {
  sort?: 'newest' | 'highest' | 'lowest';
  rating?: number;
  cursor?: string;
  limit?: number;
}

export interface HubReviewsQuery extends ListReviewsQuery {
  type?: 'booking' | 'contract' | 'all';
}

/**
 * Response types
 */
export interface ReviewerInfo {
  name: string;
  avatar?: string;
}

export interface PublicReviewResponse {
  _id: string;
  rating: number;
  content: string;
  photos: string[];
  reviewer: ReviewerInfo;
  isEdited: boolean;
  createdAt: string;
}

export interface ReviewStatsResponse {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface ReviewListResponse {
  reviews: PublicReviewResponse[];
  stats: ReviewStatsResponse;
  pagination: {
    cursor: string | null;
    hasMore: boolean;
  };
}

export interface UserReviewResponse {
  _id: string;
  bookingId: string;
  serviceId: string;
  serviceType: 'experience' | 'expertise';
  hubId: string;
  reviewerId: string;
  rating: number;
  content: string;
  photos: string[];
  status: 'active' | 'hidden' | 'deleted';
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListMyReviewsQuery {
  page?: number;
  limit?: number;
}

export interface MyReviewListItem {
  _id: string;
  rating: number;
  content: string;
  photos: string[];
  isEdited: boolean;
  createdAt: string;
  service: {
    _id: string;
    name: string;
    slug: string;
    type: 'experience' | 'expertise';
  };
  hub: {
    _id: string;
    name: string;
    logo?: string;
  };
  booking: {
    _id: string;
    date: string;
    status: string;
  };
}

export interface MyReviewListResponse {
  reviews: MyReviewListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Item for "to review" list - completed bookings without reviews
 */
export interface ToReviewItem {
  _id: string;
  bookingId: string;
  serviceId: string;
  serviceType: 'experience' | 'expertise';
  serviceName: string;
  serviceSlug: string;
  coverPhoto?: string;
  hub: {
    _id: string;
    name: string;
    logo?: string;
  };
  bookingDate: string;
  completedAt: string;
}

/**
 * Response for "to review" list
 */
export interface ToReviewListResponse {
  bookings: ToReviewItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Item for reviews with hub replies
 */
export interface ReviewWithReplyItem {
  _id: string;
  rating: number;
  content: string;
  photos: string[];
  isEdited: boolean;
  createdAt: string;
  service: {
    _id: string;
    name: string;
    slug: string;
    type: 'experience' | 'expertise';
    coverPhoto?: string;
  };
  hub: {
    _id: string;
    name: string;
    logo?: string;
  };
  hubReply: {
    content: string;
    createdAt: string;
    updatedAt?: string;
  };
}

/**
 * Response for reviews with replies
 */
export interface ReviewsWithRepliesResponse {
  reviews: ReviewWithReplyItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
