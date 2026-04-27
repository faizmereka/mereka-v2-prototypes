/**
 * Expert Models - MUST match backend WebExpert schema exactly
 * See: src/core/schemas/web/experts/webExpert.schema.ts
 */

// ============================================================================
// Backend Response Types (match exactly)
// ============================================================================

export interface ExpertSkill {
  _id: string;
  name: string;
}

export interface ExpertFocusArea {
  _id: string;
  name: string;
}

export interface ExpertLanguage {
  language: {
    _id: string;
    name: string;
  };
  proficiency: string;
}

export interface ExpertLocation {
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface ExpertHub {
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

export interface ExpertPortfolioItem {
  title: string;
  description?: string;
  images?: string[];
  skills?: ExpertSkill[];
  year?: string;
}

export interface ExpertEducation {
  degree: string;
  institution: string;
  year: string;
}

export interface ExpertEmployment {
  title: string;
  company: string;
  duration?: string;
  description?: string;
}

export interface ExpertSocialLinks {
  website?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
}

// List item for expert listings
export interface ExpertListItem {
  _id: string;
  name: string;
  username: string;
  professionalTitle?: string;
  profilePhoto?: string;
  bio?: string;
  skills?: ExpertSkill[];
  focusArea?: ExpertFocusArea;
  location?: ExpertLocation;
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
export interface ExpertDetail {
  _id: string;
  userId?: string;  // User ID for ownership check
  name: string;
  username: string;
  email?: string;
  profilePhoto?: string;
  coverPhoto?: string;
  bio?: string;
  professionalTitle?: string;
  introVideo?: string;

  // Skills & Focus Area
  skills?: ExpertSkill[];
  focusArea?: ExpertFocusArea;

  // Languages
  languages?: ExpertLanguage[];

  // Location
  location?: ExpertLocation;

  // Social Links
  socialLinks?: ExpertSocialLinks;

  // Portfolio
  portfolio?: ExpertPortfolioItem[];

  // Education & Employment
  education?: ExpertEducation[];
  employment?: ExpertEmployment[];

  // Hub Association
  hub?: ExpertHub;

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

  // Favorite status (populated when user is authenticated)
  isFavorited?: boolean;
}

// Expert service item (expertise or experience)
export interface ExpertServiceItem {
  _id: string;
  title: string;
  slug: string;
  coverPhoto?: string;
  type: 'expertise' | 'experience';
  price?: number;
  currency?: string;
  rating?: number;
}

export interface ExpertListResult {
  experts: ExpertListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Expert review item
export interface ExpertReviewItem {
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

export interface ExpertReviewsResult {
  reviews: ExpertReviewItem[];
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
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data?: {
    experts: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

// Filter options for expert listing
export interface ExpertFilters {
  page?: number;
  limit?: number;
  focusArea?: string;
  skill?: string;
  city?: string;
  country?: string;
  search?: string;
  hubId?: string;
}
