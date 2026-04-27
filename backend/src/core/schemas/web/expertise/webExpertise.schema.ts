import type { FastifySchema } from 'fastify';

// ============================================================================
// Types - Response Interfaces for Web Expertise Detail
// ============================================================================

export interface WebExpertiseHost {
  id?: string;
  name: string;
  profileUrl?: string;
  description?: string;
}

export interface WebExpertiseLocation {
  venueName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface WebExpertiseTicket {
  id: string;
  ticketName: string;
  ticketType: 'Paid' | 'Free';
  standardRate: number;
  ticketQty?: number;
  expertiseMode: 'online' | 'physical' | 'hybrid';
  sessionDuration?: number;
  durationUnit?: 'minutes' | 'hours';
  description?: string;
  // Booking settings
  hasBufferTime?: boolean;
  bufferTime?: number;
  instantBooking?: boolean;
}

export interface WebExpertiseHub {
  _id: string;
  name: string;
  slug?: string;
  logo?: string;
  description?: string;
  location?: {
    city?: string;
    country?: string;
  };
}

// Operating hours for booking availability
export interface WebOperatingDay {
  key: string; // 'monday', 'tuesday', etc.
  fullTitle: string; // 'Monday', 'Tuesday', etc.
  title: string; // 'M', 'T', 'W', etc.
  isActive: boolean;
  fullDay: boolean;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

export interface WebOperatingHours {
  sameOperatingHoursForAll: boolean;
  allOperatingHours: boolean;
  allOperatingStartTime?: string;
  allOperatingEndTime?: string;
  days: WebOperatingDay[];
}

export type AvailabilityType = 'manual' | 'flexible' | 'autofill';

export interface WebExpertiseDetailResponse {
  _id: string;
  expertiseTitle: string;
  slug: string;
  expertiseDescription?: string;
  expertiseSummary?: string;

  // Host & Hub
  host?: WebExpertiseHost;
  hub?: WebExpertiseHub;

  // Location
  location?: WebExpertiseLocation;

  // Languages
  primaryLanguage?: string;
  secondaryLanguages?: string[];

  // Tags
  tags?: string[];

  // Pricing
  currency: string;
  ticket: WebExpertiseTicket[];
  feePaidBy?: string;

  // Media
  coverPhoto?: string;
  gallery?: string[];

  // Content
  expertiseInstructions?: string;
  materialProvided?: string[];
  materialNeedToBring?: string[];

  // Metadata
  status: string;
  rating?: number;
  totalReviews?: number;
  views?: number;

  // Booking configuration
  availabilityType: AvailabilityType;
  operatingHours?: WebOperatingHours;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

export interface WebExpertiseFeaturedResponse {
  _id: string;
  expertiseTitle: string;
  slug: string;
  coverPhoto?: string;
  host?: { name: string };
  ticket: WebExpertiseTicket[];
  rating?: number;
  location?: { city?: string };
}

// ============================================================================
// JSON Schema Definitions for Validation
// ============================================================================

export const webExpertiseDetailParamsSchema = {
  type: 'object',
  required: ['slug'],
  properties: {
    slug: { type: 'string', minLength: 1 },
  },
} as const;

export const webExpertiseListQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'number', default: 1, minimum: 1 },
    limit: { type: 'number', default: 20, minimum: 1, maximum: 100 },
    city: { type: 'string' },
    mode: { type: 'string', enum: ['online', 'physical'] },
    search: { type: 'string' },
  },
} as const;

export const webExpertiseFeaturedQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'number', default: 4, minimum: 1, maximum: 10 },
  },
} as const;

// ============================================================================
// Fastify Route Schemas
// ============================================================================

export const getExpertiseBySlugSchema: FastifySchema = {
  params: webExpertiseDetailParamsSchema,
  tags: ['Web - Expertises'],
  summary: 'Get expertise detail by slug',
  description: 'Retrieves full expertise details for public viewing',
};

export const listExpertisesSchema: FastifySchema = {
  querystring: webExpertiseListQuerySchema,
  tags: ['Web - Expertises'],
  summary: 'List public expertises',
  description: 'Lists all active public expertises with optional filtering',
};

export const getExpertiseFeaturedSchema: FastifySchema = {
  params: webExpertiseDetailParamsSchema,
  querystring: webExpertiseFeaturedQuerySchema,
  tags: ['Web - Expertises'],
  summary: 'Get featured expertises from same hub',
  description: 'Retrieves featured expertises from the same hub for lazy loading',
};

// ============================================================================
// Expertise Slots Schema - For Checkout Step 1
// ============================================================================

export const webExpertiseSlotsQuerySchema = {
  type: 'object',
  properties: {
    ticketId: { type: 'string' },
    daysAhead: { type: 'number', default: 30, minimum: 1, maximum: 90 },
  },
} as const;

export const getExpertiseSlotsSchema: FastifySchema = {
  params: webExpertiseDetailParamsSchema,
  querystring: webExpertiseSlotsQuerySchema,
  tags: ['Web - Expertises'],
  summary: 'Get expertise available slots',
  description: 'Retrieves available booking slots based on operating hours for checkout widget',
};
