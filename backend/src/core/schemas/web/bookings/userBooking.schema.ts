/**
 * User Booking Schemas
 * Validation schemas for user booking endpoints (my bookings)
 */

/**
 * Query parameters for listing user bookings
 */
export const userBookingsQuerySchema = {
  type: 'object',
  properties: {
    serviceType: {
      type: 'string',
      enum: ['experience', 'expertise', 'space'],
      description: 'Filter by service type',
    },
    status: {
      type: 'string',
      enum: ['upcoming', 'past', 'cancelled', 'pending', 'rejected'],
      description: 'Filter by booking status',
    },
    page: {
      type: 'number',
      minimum: 1,
      default: 1,
      description: 'Page number for pagination',
    },
    limit: {
      type: 'number',
      minimum: 1,
      maximum: 50,
      default: 20,
      description: 'Number of items per page',
    },
  },
} as const;

/**
 * Parameters for getting a single booking
 */
export const userBookingParamsSchema = {
  type: 'object',
  required: ['bookingId'],
  properties: {
    bookingId: {
      type: 'string',
      minLength: 24,
      maxLength: 24,
      description: 'Booking ID',
    },
  },
} as const;

/**
 * Body schema for cancelling a booking
 */
export const cancelBookingBodySchema = {
  type: 'object',
  required: ['reason'],
  properties: {
    reason: {
      type: 'string',
      minLength: 1,
      maxLength: 1000,
      description: 'Reason for cancellation',
    },
  },
} as const;

/**
 * Input types for TypeScript
 */
export interface UserBookingsQuery {
  serviceType?: 'experience' | 'expertise' | 'space';
  status?: 'upcoming' | 'past' | 'cancelled' | 'pending' | 'rejected';
  page?: number;
  limit?: number;
}

export interface UserBookingParams {
  bookingId: string;
}

export interface CancelBookingInput {
  reason: string;
}

/**
 * Response types
 */
export interface UserBookingTicket {
  name: string;
  quantity: number;
  duration?: string;
}

export interface UserBookingResponse {
  id: string;
  serviceType: 'experience' | 'expertise' | 'space';
  serviceName: string;
  serviceSlug?: string;
  hubId: string;
  hubName: string;
  hostName?: string;
  location: string;
  locationType: 'Online' | 'Physical';
  bookingDate: string;
  bookingTime: string;
  timezone: string;
  tickets: UserBookingTicket[];
  totalPaid: number;
  currency: string;
  status: 'upcoming' | 'past' | 'cancelled' | 'pending' | 'rejected';
  cancelledBy?: 'learner' | 'hub';
  cancellationReason?: string;
  rating?: number;
  hasReview?: boolean;
  createdAt: string;
}
