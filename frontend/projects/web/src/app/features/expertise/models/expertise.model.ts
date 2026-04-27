/**
 * Expertise Models - MUST match backend WebExpertise schema exactly
 * See: src/core/schemas/web/expertise/webExpertise.schema.ts
 */

// ============================================================================
// Backend Response Types (match exactly)
// ============================================================================

export interface ExpertiseHost {
  id?: string;
  name: string;
  profileUrl?: string;
  description?: string;
}

export interface ExpertiseLocation {
  venueName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface ExpertiseTicket {
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

export interface ExpertiseHub {
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
export interface OperatingDay {
  key: string; // 'monday', 'tuesday', etc.
  fullTitle: string; // 'Monday', 'Tuesday', etc.
  title: string; // 'M', 'T', 'W', etc.
  isActive: boolean;
  fullDay: boolean;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

export interface OperatingHours {
  sameOperatingHoursForAll: boolean;
  allOperatingHours: boolean;
  allOperatingStartTime?: string;
  allOperatingEndTime?: string;
  days: OperatingDay[];
}

export type AvailabilityType = 'manual' | 'flexible' | 'autofill';

export interface ExpertiseDetail {
  _id: string;
  expertiseTitle: string;
  slug: string;
  expertiseDescription?: string;
  expertiseSummary?: string;

  // Host & Hub
  host?: ExpertiseHost;
  hub?: ExpertiseHub;

  // Location
  location?: ExpertiseLocation;

  // Languages
  primaryLanguage?: string;
  secondaryLanguages?: string[];

  // Tags
  tags?: string[];

  // Pricing
  currency: string;
  ticket: ExpertiseTicket[];
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
  operatingHours?: OperatingHours;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;

  // Favorite status (populated when user is authenticated)
  isFavorited?: boolean;
}

export interface FeaturedExpertise {
  _id: string;
  expertiseTitle: string;
  slug: string;
  coverPhoto?: string;
  host?: { name: string };
  ticket: ExpertiseTicket[];
  rating?: number;
  location?: { city?: string };
}

export type ExpertiseMode = 'online' | 'physical' | 'hybrid';

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

// Legacy alias for backward compatibility
export type Expertise = ExpertiseDetail;

// ============================================================================
// List Types
// ============================================================================

export interface ExpertiseListItem {
  _id: string;
  expertiseTitle: string;
  slug: string;
  coverPhoto?: string;
  host?: { name: string; profileUrl?: string };
  location?: { city?: string; country?: string };
  ticket: { ticketType: 'Paid' | 'Free'; standardRate: number; expertiseMode: string }[];
  currency: string;
  rating?: number;
}

export interface ExpertiseFilters {
  page?: number;
  limit?: number;
  search?: string;
}

// ============================================================================
// Expertise Slots Types (for booking availability)
// ============================================================================

export interface ExpertiseTicketInfo {
  id: string;
  name: string;
  price: number;
  type: 'Paid' | 'Free';
  description?: string;
  mode: string;
  sessionDuration: number;
  durationUnit: string;
  bufferTime?: number;
  instantBooking: boolean;
}

export interface ExpertiseTimeSlot {
  time: string; // HH:mm format
  available: boolean;
}

export interface ExpertiseDateSlots {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  slots: ExpertiseTimeSlot[];
}

export interface ExpertiseSlotsResponse {
  expertise: {
    _id: string;
    expertiseTitle: string;
    slug: string;
    coverPhoto?: string;
    host?: {
      name: string;
      profileUrl?: string;
    };
    hub: {
      _id: string;
      name: string;
    };
  };
  tickets: ExpertiseTicketInfo[];
  currency: string;
  minPrice: number;
  isHubPayingFee: boolean;
  availableDates: ExpertiseDateSlots[];
}
