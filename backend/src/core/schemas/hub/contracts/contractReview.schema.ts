/**
 * Contract Review Schemas
 * Validation schemas for contract review endpoints
 */

/**
 * Criteria ratings schema
 */
export const criteriaRatingsSchema = {
  type: 'object',
  required: ['quality', 'communication', 'professionalism', 'timeliness'],
  properties: {
    quality: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
      description: 'Quality rating (1-5)',
    },
    communication: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
      description: 'Communication rating (1-5)',
    },
    professionalism: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
      description: 'Professionalism rating (1-5)',
    },
    timeliness: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
      description: 'Timeliness rating (1-5)',
    },
  },
} as const;

/**
 * Body schema for creating a contract review
 */
export const createContractReviewBodySchema = {
  type: 'object',
  required: ['rating', 'criteriaRatings', 'content'],
  properties: {
    rating: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
      description: 'Overall rating (1-5)',
    },
    criteriaRatings: criteriaRatingsSchema,
    content: {
      type: 'string',
      minLength: 25,
      maxLength: 1000,
      description: 'Review content (25-1000 characters)',
    },
  },
} as const;

/**
 * Body schema for updating a contract review
 */
export const updateContractReviewBodySchema = {
  type: 'object',
  properties: {
    rating: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
      description: 'Overall rating (1-5)',
    },
    criteriaRatings: criteriaRatingsSchema,
    content: {
      type: 'string',
      minLength: 25,
      maxLength: 1000,
      description: 'Review content (25-1000 characters)',
    },
  },
} as const;

/**
 * Parameters for contract review routes
 */
export const contractReviewParamsSchema = {
  type: 'object',
  required: ['hubId', 'contractId'],
  properties: {
    hubId: {
      type: 'string',
      minLength: 24,
      maxLength: 24,
      description: 'Hub ID',
    },
    contractId: {
      type: 'string',
      minLength: 24,
      maxLength: 24,
      description: 'Contract ID',
    },
  },
} as const;

/**
 * Parameters for contract review update route (includes reviewId)
 */
export const contractReviewUpdateParamsSchema = {
  type: 'object',
  required: ['hubId', 'contractId', 'reviewId'],
  properties: {
    hubId: {
      type: 'string',
      minLength: 24,
      maxLength: 24,
      description: 'Hub ID',
    },
    contractId: {
      type: 'string',
      minLength: 24,
      maxLength: 24,
      description: 'Contract ID',
    },
    reviewId: {
      type: 'string',
      minLength: 24,
      maxLength: 24,
      description: 'Review ID',
    },
  },
} as const;

/**
 * Query parameters for hub contract reviews list (public)
 */
export const hubContractReviewsQuerySchema = {
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
    sort: {
      type: 'string',
      enum: ['newest', 'highest', 'lowest'],
      default: 'newest',
      description: 'Sort order',
    },
  },
} as const;

/**
 * Parameters for public hub contract reviews
 */
export const hubContractReviewsParamsSchema = {
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
export interface CriteriaRatingsInput {
  quality: number;
  communication: number;
  professionalism: number;
  timeliness: number;
}

export interface CreateContractReviewInput {
  rating: number;
  criteriaRatings: CriteriaRatingsInput;
  content: string;
}

export interface UpdateContractReviewInput {
  rating?: number;
  criteriaRatings?: CriteriaRatingsInput;
  content?: string;
}

export interface ContractReviewParams {
  hubId: string;
  contractId: string;
}

export interface ContractReviewUpdateParams extends ContractReviewParams {
  reviewId: string;
}

export interface HubContractReviewsParams {
  hubId: string;
}

export interface HubContractReviewsQuery {
  page?: number;
  limit?: number;
  sort?: 'newest' | 'highest' | 'lowest';
}

/**
 * Response types
 */
export interface CriteriaRatingsResponse {
  quality: number;
  communication: number;
  professionalism: number;
  timeliness: number;
}

export interface ContractReviewResponse {
  _id: string;
  contractId: string;
  jobId: string;
  reviewerHubId: string;
  revieweeHubId: string;
  reviewType: 'client_to_expert' | 'expert_to_client';
  rating: number;
  criteriaRatings: CriteriaRatingsResponse;
  content: string;
  status: 'active' | 'hidden' | 'deleted';
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewerHubInfo {
  _id: string;
  name: string;
  logo?: string;
}

export interface ReceivedReviewResponse {
  _id: string;
  reviewType: 'client_to_expert' | 'expert_to_client';
  rating: number;
  criteriaRatings: CriteriaRatingsResponse;
  content: string;
  reviewerHub: ReviewerHubInfo;
  isEdited: boolean;
  createdAt: string;
}

export interface ContractReviewsResponse {
  myReview: ContractReviewResponse | null;
  receivedReview: ReceivedReviewResponse | null;
}

export interface ReviewStatusResponse {
  contractStatus: string;
  canReview: boolean;
  hasReviewed: boolean;
  hasReceivedReview: boolean;
  myReviewId: string | null;
  receivedReviewId: string | null;
}

export interface JobInfo {
  _id: string;
  title: string;
}

export interface PublicContractReviewResponse {
  _id: string;
  rating: number;
  criteriaRatings: CriteriaRatingsResponse;
  content: string;
  reviewerHub: ReviewerHubInfo;
  job: JobInfo;
  isEdited: boolean;
  createdAt: string;
}

export interface CriteriaAveragesResponse {
  quality: number;
  communication: number;
  professionalism: number;
  timeliness: number;
}

export interface ContractReviewStatsResponse {
  averageRating: number;
  totalReviews: number;
  criteriaAverages: CriteriaAveragesResponse;
}

export interface HubContractReviewsListResponse {
  reviews: PublicContractReviewResponse[];
  stats: ContractReviewStatsResponse;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
