import type { FastifySchema } from 'fastify';

// ============================================================================
// Types - Response Interfaces for Web Experience Detail
// ============================================================================

export interface WebExperienceHost {
  userId?: string;
  name?: string;
  email?: string;
  photoUrl?: string;
  description?: string;
}

export interface WebExperienceLocation {
  venueName?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface WebExperienceTicket {
  id?: string;
  ticketType: string;
  ticketName?: string;
  ticketPrice: number;
  ticketQty?: number;
  description?: string;
}

export interface WebExperienceEvent {
  _id: string;
  startTime: Date;
  endTime: Date;
  timeZone: string;
}

export interface WebExperienceTheme {
  _id?: string; // Optional for legacy string category values (e.g., "Workshop")
  name: string;
  slug?: string;
}

export interface WebExperienceTopic {
  theme: { _id: string; name: string } | string;
  topic: { _id: string; name: string } | string;
}

export interface WebExperienceHub {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  description?: string;
  location?: {
    city: string;
    country: string;
  };
}

export interface WebExperienceDetailResponse {
  _id: string;
  experienceTitle: string;
  slug: string;
  experienceDescription?: string;
  experienceType: 'Physical' | 'Virtual' | 'Hybrid';

  // Category and topics
  experienceCategory?: WebExperienceTheme;
  experienceTopics?: WebExperienceTopic[];

  // Location
  location?: WebExperienceLocation;
  timeZone?: string;

  // Host
  hostDetails: WebExperienceHost[];
  hub: WebExperienceHub;

  // Audience
  audienceType: string;
  targetAudience: string[];
  expertiseLevel?: string;

  // Languages
  primaryLanguage?: string;
  secondaryLanguage?: string[];

  // Pricing
  currency: string;
  ticket?: WebExperienceTicket[];
  canBookAsPrivate: boolean;

  // Duration
  experienceDuration?: number;

  // Media
  coverPhoto?: string;
  gallery?: string[];
  video?: string;

  // Content
  learnerOutcome?: string;
  instruction?: string;
  materialProvided?: string;
  materialNeedToBring?: string;

  // Metadata
  status: string;
  views: number;
  rating?: number;
  totalReviews?: number;

  // Upcoming events
  upcomingEvents: WebExperienceEvent[];

  // Featured experiences from same hub
  featuredExperiences?: Array<{
    _id: string;
    experienceTitle: string;
    slug: string;
    coverPhoto?: string;
    experienceType: string;
    ticket?: WebExperienceTicket[];
  }>;
}

// ============================================================================
// JSON Schema Definitions for Validation
// ============================================================================

export const webExperienceDetailParamsSchema = {
  type: 'object',
  required: ['slug'],
  properties: {
    slug: { type: 'string', minLength: 1 },
  },
} as const;

export const webExperienceListQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'number', default: 1, minimum: 1 },
    limit: { type: 'number', default: 20, minimum: 1, maximum: 100 },
    category: { type: 'string' },
    type: { type: 'string', enum: ['Physical', 'Virtual', 'Hybrid'] },
    city: { type: 'string' },
    search: { type: 'string' },
  },
} as const;

export const webExperienceEventsQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'number', default: 1, minimum: 1 },
    limit: { type: 'number', default: 10, minimum: 1, maximum: 50 },
  },
} as const;

// ============================================================================
// Fastify Route Schemas
// ============================================================================

export const getExperienceBySlugSchema: FastifySchema = {
  params: webExperienceDetailParamsSchema,
  tags: ['Web - Experiences'],
  summary: 'Get experience detail by slug',
  description:
    'Retrieves full experience details for public viewing, including upcoming events and host information',
};

export const getExperienceEventsSchema: FastifySchema = {
  params: webExperienceDetailParamsSchema,
  querystring: webExperienceEventsQuerySchema,
  tags: ['Web - Experiences'],
  summary: 'Get upcoming events for an experience',
  description: 'Retrieves paginated list of upcoming events/sessions for an experience',
};

export const listExperiencesSchema: FastifySchema = {
  querystring: webExperienceListQuerySchema,
  tags: ['Web - Experiences'],
  summary: 'List public experiences',
  description: 'Lists all active public experiences with optional filtering',
};

// ============================================================================
// Featured Experiences Schema (Lazy Load)
// ============================================================================

export const webExperienceFeaturedQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'number', default: 4, minimum: 1, maximum: 10 },
  },
} as const;

export const getExperienceFeaturedSchema: FastifySchema = {
  params: webExperienceDetailParamsSchema,
  querystring: webExperienceFeaturedQuerySchema,
  tags: ['Web - Experiences'],
  summary: 'Get featured experiences from same hub (lazy load)',
  description:
    'Retrieves featured experiences from the same hub. Use this for lazy loading after initial page load.',
};

// ============================================================================
// Slots API Types and Schema (for Booking Widget)
// ============================================================================

/**
 * Ticket with availability information for a specific slot
 */
export interface WebExperienceSlotTicket {
  id: string;
  name: string;
  price: number;
  type: 'Paid' | 'Free';
  description?: string;
  maximumQuantity: number;
  availableQuantity: number;
  ticketSalePeriodEndTime?: string;
}

/**
 * Slot (event) with ticket availability for booking
 */
export interface WebExperienceSlot {
  id: string;
  startTime: string;
  endTime: string;
  timeZone: string;
  tickets: WebExperienceSlotTicket[];
  totalAvailableQuantity: number;
}

/**
 * Response for slots API
 */
export interface WebExperienceSlotsResponse {
  slots: WebExperienceSlot[];
  currency: string;
  minPrice: number;
  isHubPayingFee: boolean;
}

export const webExperienceSlotsQuerySchema = {
  type: 'object',
  properties: {
    limit: { type: 'number', default: 100, minimum: 1, maximum: 200 },
  },
} as const;

export const getExperienceSlotsSchema: FastifySchema = {
  params: webExperienceDetailParamsSchema,
  querystring: webExperienceSlotsQuerySchema,
  tags: ['Web - Experiences'],
  summary: 'Get experience slots with ticket availability',
  description:
    'Retrieves upcoming slots/events with per-ticket availability for the booking widget. Calculates available quantity based on existing bookings.',
};
