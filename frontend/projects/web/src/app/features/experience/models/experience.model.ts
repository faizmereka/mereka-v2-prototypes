/**
 * Experience Detail Models
 * Matches the backend WebExperience schema response
 */

export interface ExperienceHost {
  userId?: string;
  name?: string;
  email?: string;
  photoUrl?: string;
  description?: string;
}

export interface ExperienceLocation {
  venueName?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface ExperienceTicket {
  id?: string;
  ticketType: string;
  ticketName: string;
  ticketPrice: number;
  ticketQty: number;
  description?: string;
}

export interface ExperienceEvent {
  _id: string;
  startTime: string;
  endTime: string;
  timeZone: string;
}

export interface ExperienceTheme {
  _id: string;
  name: string;
  slug?: string;
}

export interface ExperienceTopic {
  theme: ExperienceTheme;
  topic: {
    _id: string;
    name: string;
  };
}

export interface ExperienceHub {
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

export interface FeaturedExperience {
  _id: string;
  experienceTitle: string;
  slug: string;
  coverPhoto?: string;
  experienceType: string;
  ticket?: Array<{ ticketType: string; ticketPrice: number }>;
}

export interface ExperienceDetail {
  _id: string;
  experienceTitle: string;
  slug: string;
  experienceDescription?: string;
  experienceType: 'Physical' | 'Virtual' | 'Hybrid';

  // Category and topics
  experienceCategory?: ExperienceTheme;
  experienceTopics?: ExperienceTopic[];

  // Location
  location?: ExperienceLocation;
  timeZone?: string;

  // Host
  hostDetails: ExperienceHost[];
  hub: ExperienceHub;

  // Audience
  audienceType: string;
  targetAudience: string[];
  expertiseLevel?: string;

  // Languages
  primaryLanguage?: string;
  secondaryLanguage?: string[];

  // Pricing
  currency: string;
  ticket?: ExperienceTicket[];
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
  upcomingEvents: ExperienceEvent[];

  // Featured experiences from same hub
  featuredExperiences?: FeaturedExperience[];

  // Favorite status (populated when user is authenticated)
  isFavorited?: boolean;
}

export interface ExperienceListItem {
  _id: string;
  experienceTitle: string;
  slug: string;
  coverPhoto?: string;
  experienceType: string;
  experienceCategory?: string;
  location?: ExperienceLocation;
  ticket?: ExperienceTicket[];
  currency: string;
  rating?: number;
  views: number;
}

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
  data?: T[];
  meta?: {
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

// ============================================================================
// Slot & Ticket Models (for Booking Widget)
// ============================================================================

/**
 * Ticket status for display
 */
export enum TicketStatus {
  AVAILABLE = 'Available',
  SELLING_FAST = 'Selling fast!',
  SOLD_OUT = 'Sold out',
  SALES_ENDED = 'Sales ended',
}

/**
 * Ticket with availability information for a specific slot
 */
export interface ExperienceSlotTicket {
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
export interface ExperienceSlot {
  id: string;
  startTime: string;
  endTime: string;
  timeZone: string;
  tickets: ExperienceSlotTicket[];
  totalAvailableQuantity: number;
}

/**
 * Response from slots API
 */
export interface ExperienceSlotsResponse {
  slots: ExperienceSlot[];
  currency: string;
  minPrice: number;
  isHubPayingFee: boolean;
}

/**
 * Selected ticket for booking
 */
export interface SelectedTicket {
  id: string;
  name: string;
  price: number;
  quantity: number;
}
