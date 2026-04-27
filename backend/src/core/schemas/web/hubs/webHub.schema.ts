import type { FastifySchema } from 'fastify';

// ============================================================================
// Types - Response Interfaces for Web Hub Detail
// ============================================================================

export interface WebHubFocusArea {
  _id: string;
  name: string;
}

export interface WebHubCompanyType {
  _id: string;
  name: string;
}

export interface WebHubLocation {
  address?: string;
  city: string;
  state?: string;
  country: string;
  postcode?: string;
  lat?: number;
  lng?: number;
}

export interface WebHubOperatingHours {
  monday?: { open?: string; close?: string; isClosed?: boolean };
  tuesday?: { open?: string; close?: string; isClosed?: boolean };
  wednesday?: { open?: string; close?: string; isClosed?: boolean };
  thursday?: { open?: string; close?: string; isClosed?: boolean };
  friday?: { open?: string; close?: string; isClosed?: boolean };
  saturday?: { open?: string; close?: string; isClosed?: boolean };
  sunday?: { open?: string; close?: string; isClosed?: boolean };
}

export interface WebHubSocialLinks {
  website?: string;
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  email?: string;
}

export interface WebHubPortfolioItem {
  title: string;
  description?: string;
  images?: string[];
  year?: string;
}

// List item for hub listings
export interface WebHubListItem {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  description?: string;
  companyType?: WebHubCompanyType;
  location: {
    city: string;
    country: string;
  };
  focusAreas?: WebHubFocusArea[];
  rating?: number;
  totalReviews?: number;
  expertsCount?: number;
}

// Full hub detail response
export interface WebHubDetailResponse {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  coverImage?: string;
  description?: string;
  phoneNumber?: string;

  // Company Type
  companyType?: WebHubCompanyType;

  // Location
  location: WebHubLocation;
  displayFullAddress?: boolean;

  // Media
  introVideo?: string;
  gallery: string[];
  portfolio?: WebHubPortfolioItem[];

  // Operating Hours
  operatingHours?: WebHubOperatingHours;

  // Social Links
  socialLinks?: WebHubSocialLinks;

  // Focus Areas & Categories
  focusAreas?: WebHubFocusArea[];
  amenities?: Array<{ _id: string; name: string }>;
  facilities?: Array<{ _id: string; name: string }>;

  // Services & Tags
  services: string[];
  tags: string[];

  // Metadata
  rating?: number;
  totalReviews?: number;
  views?: number;
  isFeatured: boolean;
  status?: string; // Hub status (active, draft, etc.)

  // Counts
  expertsCount?: number;
  expertisesCount?: number;
  experiencesCount?: number;

  // Ownership flags (for frontend to show banner/complete profile)
  isOwner?: boolean; // True if current user is a member of this hub
  isDraft?: boolean; // True if hub is not active (status !== 'active')
}

// Hub expert list item
export interface WebHubExpertItem {
  _id: string;
  name: string;
  username: string;
  professionalTitle?: string;
  profilePhoto?: string;
  focusArea?: WebHubFocusArea;
}

// Hub service item (expertise or experience)
export interface WebHubServiceItem {
  _id: string;
  title: string;
  slug: string;
  coverPhoto?: string;
  type: 'expertise' | 'experience';
  price?: number;
  currency?: string;
  rating?: number;
}

export interface WebHubListResult {
  hubs: WebHubListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// JSON Schema Definitions for Validation
// ============================================================================

export const webHubDetailParamsSchema = {
  type: 'object',
  required: ['slug'],
  properties: {
    slug: { type: 'string', minLength: 1, description: 'Hub slug' },
  },
} as const;

export const webHubListQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'number', default: 1, minimum: 1 },
    limit: { type: 'number', default: 20, minimum: 1, maximum: 100 },
    focusArea: { type: 'string', description: 'Filter by focus area ID' },
    companyType: { type: 'string', description: 'Filter by company type ID' },
    city: { type: 'string', description: 'Filter by city (partial match)' },
    country: { type: 'string', description: 'Filter by country (partial match)' },
    search: { type: 'string', description: 'Search by name or description' },
    featured: { type: 'boolean', description: 'Filter by featured status' },
  },
} as const;

export const webHubExpertsQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'number', default: 10, minimum: 1, maximum: 50 },
  },
} as const;

export const webHubServicesQuerySchema = {
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

// ============================================================================
// Fastify Route Schemas
// ============================================================================

export const getHubBySlugSchema: FastifySchema = {
  params: webHubDetailParamsSchema,
  tags: ['Web - Hubs'],
  summary: 'Get hub detail by slug',
  description: 'Retrieves full hub details for public viewing',
};

export const listHubsSchema: FastifySchema = {
  querystring: webHubListQuerySchema,
  tags: ['Web - Hubs'],
  summary: 'List public hubs',
  description:
    'Lists all active hubs with optional filtering by focus area, company type, location',
};

export const getHubExpertsSchema: FastifySchema = {
  params: webHubDetailParamsSchema,
  querystring: webHubExpertsQuerySchema,
  tags: ['Web - Hubs'],
  summary: 'Get hub experts',
  description: 'Retrieves experts associated with the hub',
};

export const getHubServicesSchema: FastifySchema = {
  params: webHubDetailParamsSchema,
  querystring: webHubServicesQuerySchema,
  tags: ['Web - Hubs'],
  summary: 'Get hub services (expertises & experiences)',
  description: 'Retrieves expertises and experiences offered by the hub',
};
