/**
 * Learner Dashboard Overview Schema
 * GET /me/overview - Returns dashboard overview data for authenticated learner
 */

// ============================================================================
// Response Schemas
// ============================================================================

export const learnerOverviewStatsSchema = {
  type: 'object',
  properties: {
    upcomingBookings: { type: 'number' },
    completedSessions: { type: 'number' },
    totalSpent: { type: 'number' },
    reviewsGiven: { type: 'number' },
  },
  required: ['upcomingBookings', 'completedSessions', 'totalSpent', 'reviewsGiven'],
} as const;

export const learnerUpcomingBookingSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    serviceName: { type: 'string' },
    serviceSlug: { type: 'string' },
    hubName: { type: 'string' },
    hubSlug: { type: 'string' },
    date: { type: 'string' },
    time: { type: 'string' },
    locationType: { type: 'string', enum: ['Online', 'Physical'] },
    location: { type: 'string' },
  },
} as const;

export const learnerOverviewResponseSchema = {
  type: 'object',
  properties: {
    user: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        firstName: { type: 'string' },
        emailVerified: { type: 'boolean' },
        profileComplete: { type: 'boolean' },
      },
    },
    stats: learnerOverviewStatsSchema,
    upcomingBookings: {
      type: 'array',
      items: learnerUpcomingBookingSchema,
    },
    currency: { type: 'string' },
  },
} as const;

// ============================================================================
// TypeScript Types
// ============================================================================

export interface LearnerOverviewStats {
  upcomingBookings: number;
  completedSessions: number;
  totalSpent: number;
  reviewsGiven: number;
}

export interface LearnerUpcomingBooking {
  id: string;
  serviceName: string;
  serviceSlug?: string;
  hubName: string;
  hubSlug?: string;
  date: string;
  time: string;
  locationType: 'Online' | 'Physical';
  location: string;
}

export interface LearnerOverviewUser {
  name: string;
  firstName: string;
  emailVerified: boolean;
  profileComplete: boolean;
}

export interface LearnerOverviewResponse {
  user: LearnerOverviewUser;
  stats: LearnerOverviewStats;
  upcomingBookings: LearnerUpcomingBooking[];
  currency: string;
}
