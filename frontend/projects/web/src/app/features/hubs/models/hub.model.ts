/**
 * Hub Models - MUST match backend WebHub schema exactly
 * See: src/core/schemas/web/hubs/webHub.schema.ts
 */

// ============================================================================
// Backend Response Types (match exactly)
// ============================================================================

export interface HubFocusArea {
  _id: string;
  name: string;
}

export interface HubCompanyType {
  _id: string;
  name: string;
}

export interface HubLocation {
  address?: string;
  city: string;
  state?: string;
  country: string;
  postcode?: string;
  lat?: number;
  lng?: number;
}

export interface HubOperatingHours {
  monday?: { open?: string; close?: string; isClosed?: boolean };
  tuesday?: { open?: string; close?: string; isClosed?: boolean };
  wednesday?: { open?: string; close?: string; isClosed?: boolean };
  thursday?: { open?: string; close?: string; isClosed?: boolean };
  friday?: { open?: string; close?: string; isClosed?: boolean };
  saturday?: { open?: string; close?: string; isClosed?: boolean };
  sunday?: { open?: string; close?: string; isClosed?: boolean };
}

export interface HubSocialLinks {
  website?: string;
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  email?: string;
}

export interface HubPortfolioItem {
  title: string;
  description?: string;
  images?: string[];
  year?: string;
}

// List item for hub listings
export interface HubListItem {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  description?: string;
  companyType?: HubCompanyType;
  location: {
    city: string;
    country: string;
  };
  focusAreas?: HubFocusArea[];
  rating?: number;
  totalReviews?: number;
  expertsCount?: number;
}

// Full hub detail response
export interface HubDetail {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  coverImage?: string;
  description?: string;
  phoneNumber?: string;

  // Company Type
  companyType?: HubCompanyType;

  // Location
  location: HubLocation;
  displayFullAddress?: boolean;

  // Media
  introVideo?: string;
  gallery: string[];
  portfolio?: HubPortfolioItem[];

  // Operating Hours
  operatingHours?: HubOperatingHours;

  // Social Links
  socialLinks?: HubSocialLinks;

  // Focus Areas & Categories
  focusAreas?: HubFocusArea[];
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

  // Counts
  expertsCount?: number;
  expertisesCount?: number;
  experiencesCount?: number;

  // Ownership flags (for frontend to show banner/complete profile)
  isOwner?: boolean; // True if current user is a hub member
  isDraft?: boolean; // True if hub status is not 'active'
  status?: string; // Hub status ('draft', 'active', etc.)

  // Favorite status (populated when user is authenticated)
  isFavorited?: boolean;
}

// Hub expert list item
export interface HubExpertItem {
  _id: string;
  name: string;
  username: string;
  professionalTitle?: string;
  profilePhoto?: string;
  focusArea?: HubFocusArea;
}

// Hub service item (expertise or experience)
export interface HubServiceItem {
  _id: string;
  title: string;
  slug: string;
  coverPhoto?: string;
  type: 'expertise' | 'experience';
  price?: number;
  currency?: string;
  rating?: number;
}

export interface HubListResult {
  hubs: HubListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

// Filter options for hub listing
export interface HubFilters {
  page?: number;
  limit?: number;
  focusArea?: string;
  companyType?: string;
  city?: string;
  country?: string;
  search?: string;
  featured?: boolean;
}
