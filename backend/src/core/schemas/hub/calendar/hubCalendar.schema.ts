/**
 * Hub Calendar schemas - Native JSON Schema
 * Unified calendar events for experiences and expertises
 */

/**
 * Calendar event type enum
 */
export type CalendarEventType = 'experience' | 'expertise';

/**
 * Booking status enum - based on capacity percentage
 */
export type BookingStatus = 'no-bookings' | 'partially-booked' | 'mostly-booked' | 'fully-booked';

/**
 * Calendar view type
 */
export type CalendarView = 'month' | 'week';

/**
 * Calendar events list query schema
 */
export const hubCalendarEventsQuerySchema = {
  type: 'object',
  required: ['startDate', 'endDate'],
  properties: {
    startDate: {
      type: 'string',
      format: 'date',
      description: 'Start date (YYYY-MM-DD)',
    },
    endDate: {
      type: 'string',
      format: 'date',
      description: 'End date (YYYY-MM-DD)',
    },
    view: {
      type: 'string',
      enum: ['month', 'week'],
      default: 'month',
      description: 'Calendar view type',
    },
    type: {
      type: 'string',
      enum: ['all', 'experience', 'expertise'],
      default: 'all',
      description: 'Event type filter',
    },
  },
} as const;

/**
 * Calendar events by date query schema
 */
export const hubCalendarEventsByDateQuerySchema = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['all', 'experience', 'expertise'],
      default: 'all',
      description: 'Event type filter',
    },
  },
} as const;

/**
 * Calendar event params schema
 */
export const hubCalendarEventParamsSchema = {
  type: 'object',
  required: ['hubId', 'id'],
  properties: {
    hubId: {
      type: 'string',
      minLength: 24,
      maxLength: 24,
      description: 'Hub ID (MongoDB ObjectId)',
    },
    id: {
      type: 'string',
      minLength: 1,
      description: 'Event ID',
    },
  },
} as const;

/**
 * Calendar date params schema
 */
export const hubCalendarDateParamsSchema = {
  type: 'object',
  required: ['hubId', 'date'],
  properties: {
    hubId: {
      type: 'string',
      minLength: 24,
      maxLength: 24,
      description: 'Hub ID (MongoDB ObjectId)',
    },
    date: {
      type: 'string',
      format: 'date',
      description: 'Date (YYYY-MM-DD)',
    },
  },
} as const;

/**
 * Calendar event detail query schema
 */
export const hubCalendarEventDetailQuerySchema = {
  type: 'object',
  required: ['type'],
  properties: {
    type: {
      type: 'string',
      enum: ['experience', 'expertise'],
      description: 'Event type',
    },
  },
} as const;

/**
 * TypeScript interfaces
 */

/**
 * Calendar events query input
 */
export interface HubCalendarEventsQuery {
  startDate: string;
  endDate: string;
  view?: CalendarView;
  type?: 'all' | CalendarEventType;
}

/**
 * Calendar events by date query
 */
export interface HubCalendarEventsByDateQuery {
  type?: 'all' | CalendarEventType;
}

/**
 * Calendar event detail query
 */
export interface HubCalendarEventDetailQuery {
  type: CalendarEventType;
}

/**
 * Calendar event summary (for list view)
 */
export interface CalendarEventSummary {
  id: string;
  title: string;
  type: CalendarEventType;
  startTime: Date;
  endTime: Date;
  serviceId: string;
  serviceName: string;
  bookingCount: number;
  maxCapacity: number;
  bookingStatus: BookingStatus;
  status: string;
}

/**
 * Calendar event with experience details
 */
export interface CalendarExperienceEvent extends CalendarEventSummary {
  type: 'experience';
  experienceType: string;
  location?: {
    address?: string;
    city?: string;
    country?: string;
  };
  coverPhoto?: string;
  hostDetails?: Array<{
    fullName?: string;
    profileUrl?: string;
  }>;
  tickets?: Array<{
    id: string;
    ticketName: string;
    ticketPrice: number;
    ticketQty: number;
  }>;
}

/**
 * Calendar event with expertise details
 */
export interface CalendarExpertiseEvent extends CalendarEventSummary {
  type: 'expertise';
  expertiseMode?: string;
  location?: {
    address?: string;
    city?: string;
    country?: string;
  };
  coverPhoto?: string;
  host?: {
    name?: string;
    profileUrl?: string;
  };
  ticket?: {
    ticketName: string;
    standardRate: number;
    sessionDuration?: number;
  };
}

/**
 * Learner info for booking details
 */
export interface CalendarLearnerInfo {
  id: number;
  name: string;
  email: string;
  phone?: string;
  attendance?: boolean;
  ticketName?: string;
  ticketType?: string;
}

/**
 * Booking summary for event details
 */
export interface CalendarBookingSummary {
  id: string;
  learner: {
    name: string;
    email: string;
    phone?: string;
  };
  ticketDetails: Array<{
    ticketName: string;
    quantity: number;
    price: number;
  }>;
  totalCost: number;
  status: string;
  createdAt: Date;
}

/**
 * Event statistics
 */
export interface CalendarEventStats {
  totalBookings: number;
  totalLearners: number;
  totalRevenue: number;
  attendanceCount?: number;
}

/**
 * Calendar event detail response
 */
export interface CalendarEventDetail {
  event: CalendarExperienceEvent | CalendarExpertiseEvent;
  bookings: CalendarBookingSummary[];
  stats: CalendarEventStats;
}

/**
 * Calendar events list response
 */
export interface CalendarEventsResponse {
  events: CalendarEventSummary[];
  meta: {
    startDate: string;
    endDate: string;
    totalEvents: number;
    experienceCount: number;
    expertiseCount: number;
  };
}
