import type { FastifySchema } from 'fastify';

// ============================================================================
// Types - Response Interfaces for Web Expert Detail
// ============================================================================

export interface WebExpertSkill {
  _id: string;
  name: string;
}

export interface WebExpertFocusArea {
  _id: string;
  name: string;
}

export interface WebExpertLanguage {
  language: {
    _id: string;
    name: string;
  };
  proficiency: string;
}

export interface WebExpertLocation {
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface WebExpertHub {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
  location?: {
    city?: string;
    country?: string;
  };
}

export interface WebExpertPortfolioItem {
  title: string;
  description?: string;
  images?: string[];
  skills?: WebExpertSkill[];
  year?: string;
}

export interface WebExpertEducation {
  degree: string;
  institution: string;
  year: string;
}

export interface WebExpertEmployment {
  title: string;
  company: string;
  duration?: string;
  description?: string;
}

export interface WebExpertSocialLinks {
  website?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
}

// List item for expert listings
export interface WebExpertListItem {
  _id: string;
  name: string;
  username: string;
  professionalTitle?: string;
  profilePhoto?: string;
  bio?: string;
  skills?: WebExpertSkill[];
  focusArea?: WebExpertFocusArea;
  location?: WebExpertLocation;
  hub?: {
    _id: string;
    name: string;
    slug: string;
    logo?: string;
  };
  rating?: number;
  totalReviews?: number;
}

// Full expert detail response
export interface WebExpertDetailResponse {
  _id: string;
  name: string;
  username: string;
  email?: string;
  profilePhoto?: string;
  coverPhoto?: string;
  bio?: string;
  professionalTitle?: string;
  introVideo?: string;

  // Skills & Focus Area
  skills?: WebExpertSkill[];
  focusArea?: WebExpertFocusArea;

  // Languages
  languages?: WebExpertLanguage[];

  // Location
  location?: WebExpertLocation;

  // Social Links
  socialLinks?: WebExpertSocialLinks;

  // Portfolio
  portfolio?: WebExpertPortfolioItem[];

  // Education & Employment
  education?: WebExpertEducation[];
  employment?: WebExpertEmployment[];

  // Hub Association
  hub?: WebExpertHub;

  // Hourly Rate
  hourlyRate?: number;
  currency?: string;

  // Metadata
  rating?: number;
  totalReviews?: number;
  views?: number;

  // Services (lazy loaded separately)
  expertisesCount?: number;
  experiencesCount?: number;

  // Ownership flags (for frontend to show banner/complete profile)
  isOwner?: boolean; // True if current user is the profile owner
  isIncomplete?: boolean; // True if profile is missing required fields (e.g., professionalTitle)
}

// Featured expertises/experiences for the expert
export interface WebExpertServiceItem {
  _id: string;
  title: string;
  slug: string;
  coverPhoto?: string;
  type: 'expertise' | 'experience';
  price?: number;
  currency?: string;
  rating?: number;
}

export interface WebExpertListResult {
  experts: WebExpertListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Review item for expert reviews
export interface WebExpertReviewItem {
  _id: string;
  rating: number;
  content: string;
  createdAt: string;
  reviewer: {
    name: string;
    profilePhoto?: string;
  };
  service: {
    _id: string;
    title: string;
    slug: string;
    type: 'expertise' | 'experience';
  };
  photos?: string[];
}

export interface WebExpertReviewsResult {
  reviews: WebExpertReviewItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    averageRating: number;
    totalReviews: number;
    distribution: { [key: number]: number };
  };
}

// ============================================================================
// JSON Schema Definitions for Validation
// ============================================================================

export const webExpertDetailParamsSchema = {
  type: 'object',
  required: ['slug'],
  properties: {
    slug: { type: 'string', minLength: 1, description: 'Expert username/slug' },
  },
} as const;

export const webExpertListQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'number', default: 1, minimum: 1 },
    limit: { type: 'number', default: 20, minimum: 1, maximum: 100 },
    focusArea: { type: 'string', description: 'Filter by focus area ID' },
    skill: { type: 'string', description: 'Filter by skill ID' },
    city: { type: 'string', description: 'Filter by city (partial match)' },
    country: { type: 'string', description: 'Filter by country (partial match)' },
    search: { type: 'string', description: 'Search by name or title' },
    hubId: { type: 'string', description: 'Filter by hub ID' },
  },
} as const;

export const webExpertServicesQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'number', default: 10, minimum: 1, maximum: 50 },
    type: {
      type: 'string',
      enum: ['expertise', 'experience', 'all'],
      default: 'all',
    },
  },
} as const;

export const webExpertReviewsQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'number', default: 1, minimum: 1 },
    limit: { type: 'number', default: 10, minimum: 1, maximum: 50 },
    rating: { type: 'number', minimum: 1, maximum: 5, description: 'Filter by rating' },
  },
} as const;

// ============================================================================
// Fastify Route Schemas
// ============================================================================

export const getExpertBySlugSchema: FastifySchema = {
  params: webExpertDetailParamsSchema,
  tags: ['Web - Experts'],
  summary: 'Get expert detail by username/slug',
  description: 'Retrieves full expert profile details for public viewing',
};

export const listExpertsSchema: FastifySchema = {
  querystring: webExpertListQuerySchema,
  tags: ['Web - Experts'],
  summary: 'List public experts',
  description: 'Lists all active experts with optional filtering by focus area, skills, location',
};

export const getExpertServicesSchema: FastifySchema = {
  params: webExpertDetailParamsSchema,
  querystring: webExpertServicesQuerySchema,
  tags: ['Web - Experts'],
  summary: 'Get expert services (expertises & experiences)',
  description: 'Retrieves expertises and experiences offered by the expert',
};

export const getExpertReviewsSchema: FastifySchema = {
  params: webExpertDetailParamsSchema,
  querystring: webExpertReviewsQuerySchema,
  tags: ['Web - Experts'],
  summary: 'Get expert reviews',
  description: 'Retrieves reviews for all services offered by the expert',
};
