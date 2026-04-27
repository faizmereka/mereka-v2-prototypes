/**
 * Hub Booking Models
 * Interfaces for hub booking list, filters, and API responses
 */

// ============================================================================
// Booking Types
// ============================================================================

export type BookingServiceType = 'experience' | 'expertise' | 'all';
export type BookingStatusFilter = 'upcoming' | 'past' | 'cancelled' | 'all';
export type BookingStatus = 'no-bookings' | 'low-bookings' | 'partially-booked' | 'mostly-booked' | 'fully-booked';
export type UpdateBookingStatus = 'active' | 'cancelled' | 'rejected';

// ============================================================================
// Service Info
// ============================================================================

export interface BookingService {
  _id: string;
  title: string;
  coverPhoto?: string;
  type?: string; // Physical/Virtual/Online
}

export interface BookingHost {
  name: string;
  profileUrl?: string;
}

export interface BookingEvent {
  _id: string;
  startTime: Date | string;
  endTime: Date | string;
}

export interface BookingSchedule {
  date: string;
  time: string;
}

// ============================================================================
// Learner & Ticket Info
// ============================================================================

export interface BookingLearner {
  name: string;
  email: string;
  phone?: string;
  ticketName?: string;
  ticketType?: string;
}

export interface BookingTicket {
  ticketId: string;
  ticketName: string;
  ticketType: string;
  quantity: number;
  pricePerTicket: number;
  currency: string;
  isFree: boolean;
}

// ============================================================================
// Main Booking Item
// ============================================================================

export interface HubBookingItem {
  _id: string;
  bookingType: 'experience' | 'expertise';
  service: BookingService;
  event?: BookingEvent;
  schedule?: BookingSchedule;
  host?: BookingHost;
  learners: BookingLearner[];
  selectedTickets: BookingTicket[];
  totalCost: number;
  currency: string;
  status: string;
  bookingStartDate: Date | string;
  bookingEndDate: Date | string;
  createdAt: Date | string;
  updatedAt?: Date | string;

  // Computed fields from API
  bookedSeats: number;
  totalSeats: number;
  bookingPercentage: number;
  bookingStatus: BookingStatus;

  // UI state
  isExpanded?: boolean;
  isSelected?: boolean;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface HubBookingListParams {
  serviceType?: BookingServiceType;
  status?: BookingStatusFilter;
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  grouped?: boolean;
}

export interface HubBookingPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface HubBookingListResponse {
  bookings: HubBookingItem[];
  pagination: HubBookingPagination;
}

export interface HubUpdateBookingParams {
  bookingId: string;
  status: UpdateBookingStatus;
  reason?: string;
}

export interface HubUpdateBookingResponse {
  _id: string;
  status: string;
  updatedAt: Date | string;
}

export interface HubExportBookingsParams {
  serviceType?: BookingServiceType;
  status?: BookingStatusFilter;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface BookingFilterState {
  serviceType: BookingServiceType;
  status: BookingStatusFilter;
  search: string;
  dateFrom: string;
  dateTo: string;
  grouped: boolean;
}

export interface BookingListState {
  bookings: HubBookingItem[];
  pagination: HubBookingPagination;
  loading: boolean;
  error: string | null;
  selectedIds: Set<string>;
  expandedIds: Set<string>;
}

// ============================================================================
// Service Type Options (for dropdown)
// ============================================================================

export interface ServiceTypeOption {
  value: BookingServiceType;
  label: string;
  icon?: string;
}

export const SERVICE_TYPE_OPTIONS: ServiceTypeOption[] = [
  { value: 'all', label: 'All Services' },
  { value: 'experience', label: 'Experiences' },
  { value: 'expertise', label: 'Expertise' },
];

// ============================================================================
// Tab Configuration
// ============================================================================

export interface BookingTab {
  id: BookingStatusFilter;
  label: string;
  count?: number;
}

export const BOOKING_TABS: BookingTab[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'cancelled', label: 'Cancelled' },
];

// ============================================================================
// Empty State Messages
// ============================================================================

export const EMPTY_STATE_MESSAGES: Record<BookingStatusFilter, string> = {
  upcoming: 'You currently do not have any bookings yet',
  past: 'You have no past bookings',
  cancelled: "You don't have any booking cancellations. Yay!",
  all: 'No bookings found',
};

// ============================================================================
// Status Badge Configuration
// ============================================================================

export interface StatusBadgeConfig {
  label: string;
  colorClass: string;
  bgClass: string;
}

export const BOOKING_STATUS_CONFIG: Record<BookingStatus, StatusBadgeConfig> = {
  'no-bookings': {
    label: 'No Bookings',
    colorClass: 'text-red-600',
    bgClass: 'bg-red-50',
  },
  'low-bookings': {
    label: 'Low Bookings',
    colorClass: 'text-yellow-600',
    bgClass: 'bg-yellow-50',
  },
  'partially-booked': {
    label: 'Partially Booked',
    colorClass: 'text-yellow-600',
    bgClass: 'bg-yellow-50',
  },
  'mostly-booked': {
    label: 'Mostly Booked',
    colorClass: 'text-green-600',
    bgClass: 'bg-green-50',
  },
  'fully-booked': {
    label: 'Fully Booked',
    colorClass: 'text-green-600',
    bgClass: 'bg-green-50',
  },
};
