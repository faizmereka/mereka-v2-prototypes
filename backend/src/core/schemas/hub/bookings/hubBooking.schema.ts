/**
 * Hub Booking Schemas
 * JSON Schema definitions for hub booking endpoints
 */

// Input types for TypeScript
export interface HubListBookingsQuery {
  serviceType?: 'experience' | 'expertise' | 'all';
  status?: 'upcoming' | 'past' | 'cancelled' | 'all';
  page?: number;
  limit?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  grouped?: boolean;
}

export interface HubUpdateBookingStatusBody {
  status: 'active' | 'cancelled' | 'rejected';
  reason?: string;
}

export interface HubExportBookingsQuery {
  serviceType?: 'experience' | 'expertise' | 'all';
  status?: 'upcoming' | 'past' | 'cancelled' | 'all';
  dateFrom?: string;
  dateTo?: string;
}

export interface HubCreateBookingLearner {
  name: string;
  email: string;
  phone: string;
  ticketId?: string;
}

export interface HubCreateBookingBody {
  serviceType: 'experience' | 'expertise';
  serviceId: string;
  eventId?: string; // MongoDB ObjectId for experiences, date-time slot for expertise (e.g., "2025-12-26-09:30")
  slotDate?: string; // For expertise: date in YYYY-MM-DD format
  slotTime?: string; // For expertise: time in HH:mm format
  learners: HubCreateBookingLearner[];
  addedByHub?: boolean;
}

/**
 * List all hub bookings (experiences + expertise)
 * GET /api/v1/hub/:hubId/bookings
 */
export const hubListBookingsSchema = {
  tags: ['Hub Bookings'],
  summary: 'List all hub bookings',
  description: 'List all bookings for a hub with filters for service type, status, date range',
  params: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
    },
  },
  querystring: {
    type: 'object',
    properties: {
      serviceType: {
        type: 'string',
        enum: ['experience', 'expertise', 'all'],
        default: 'all',
        description: 'Filter by service type',
      },
      status: {
        type: 'string',
        enum: ['upcoming', 'past', 'cancelled', 'all'],
        default: 'upcoming',
        description: 'Filter by booking status',
      },
      page: {
        type: 'number',
        minimum: 1,
        default: 1,
        description: 'Page number',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 20,
        description: 'Items per page',
      },
      search: {
        type: 'string',
        description: 'Search by service name, learner name or email',
      },
      dateFrom: {
        type: 'string',
        format: 'date',
        description: 'Filter bookings from this date (YYYY-MM-DD)',
      },
      dateTo: {
        type: 'string',
        format: 'date',
        description: 'Filter bookings to this date (YYYY-MM-DD)',
      },
      grouped: {
        type: 'boolean',
        default: true,
        description: 'Group bookings by event/session',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            bookings: { type: 'array' },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * Update booking status
 * PATCH /api/v1/hub/:hubId/bookings/:bookingId/status
 */
export const hubUpdateBookingStatusSchema = {
  tags: ['Hub Bookings'],
  summary: 'Update booking status',
  description: 'Approve, reject, or cancel a booking',
  params: {
    type: 'object',
    required: ['hubId', 'bookingId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      bookingId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Booking ID',
      },
    },
  },
  body: {
    type: 'object',
    required: ['status'],
    properties: {
      status: {
        type: 'string',
        enum: ['active', 'cancelled', 'rejected'],
        description: 'New booking status',
      },
      reason: {
        type: 'string',
        maxLength: 500,
        description: 'Reason for status change (required for cancel/reject)',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            status: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
} as const;

/**
 * Export bookings
 * GET /api/v1/hub/:hubId/bookings/export
 */
export const hubExportBookingsSchema = {
  tags: ['Hub Bookings'],
  summary: 'Export bookings to CSV',
  description: 'Export hub bookings data as CSV file',
  params: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
    },
  },
  querystring: {
    type: 'object',
    properties: {
      serviceType: {
        type: 'string',
        enum: ['experience', 'expertise', 'all'],
        default: 'all',
        description: 'Filter by service type',
      },
      status: {
        type: 'string',
        enum: ['upcoming', 'past', 'cancelled', 'all'],
        default: 'all',
        description: 'Filter by booking status',
      },
      dateFrom: {
        type: 'string',
        format: 'date',
        description: 'Filter from date (YYYY-MM-DD)',
      },
      dateTo: {
        type: 'string',
        format: 'date',
        description: 'Filter to date (YYYY-MM-DD)',
      },
    },
  },
} as const;

export const hubListExperienceBookingsSchema = {
  tags: ['Hub Bookings'],
  summary: 'List experience bookings',
  description: 'List all bookings for an experience with optional event filter',
  params: {
    type: 'object',
    required: ['hubId', 'experienceId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      experienceId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Experience ID',
      },
    },
  },
  querystring: {
    type: 'object',
    properties: {
      eventId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Filter by specific event/session ID',
      },
      status: {
        type: 'string',
        enum: ['upcoming', 'past', 'cancelled', 'all'],
        default: 'all',
        description: 'Filter by booking status',
      },
      page: {
        type: 'number',
        minimum: 1,
        default: 1,
        description: 'Page number',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 20,
        description: 'Items per page',
      },
      search: {
        type: 'string',
        description: 'Search by learner name or email',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            bookings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  bookingType: { type: 'string' },
                  serviceName: { type: 'string' },
                  serviceId: { type: 'string' },
                  eventId: { type: 'string' },
                  bookingStartDate: { type: 'string', format: 'date-time' },
                  bookingEndDate: { type: 'string', format: 'date-time' },
                  status: { type: 'string' },
                  totalCost: { type: 'number' },
                  currency: { type: 'string' },
                  isFree: { type: 'boolean' },
                  ticketCount: { type: 'number' },
                  learners: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        email: { type: 'string' },
                        ticketName: { type: 'string' },
                        ticketType: { type: 'string' },
                      },
                    },
                  },
                  bookerName: { type: 'string' },
                  bookerEmail: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  },
} as const;

export const hubGetBookingByIdSchema = {
  tags: ['Hub Bookings'],
  summary: 'Get booking by ID',
  description: 'Get a single booking by its ID',
  params: {
    type: 'object',
    required: ['hubId', 'bookingId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
      bookingId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Booking ID',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            bookingType: { type: 'string' },
            serviceName: { type: 'string' },
            serviceId: { type: 'string' },
            eventId: { type: 'string' },
            bookingStartDate: { type: 'string', format: 'date-time' },
            bookingEndDate: { type: 'string', format: 'date-time' },
            status: { type: 'string' },
            totalCost: { type: 'number' },
            currency: { type: 'string' },
            isFree: { type: 'boolean' },
            ticketCount: { type: 'number' },
            learners: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  ticketName: { type: 'string' },
                  ticketType: { type: 'string' },
                },
              },
            },
            bookerName: { type: 'string' },
            bookerEmail: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
} as const;

/**
 * Create a manual booking (by hub admin)
 * POST /api/v1/hub/:hubId/bookings
 */
export const hubCreateBookingSchema = {
  tags: ['Hub Bookings'],
  summary: 'Create a manual booking',
  description: 'Create a booking manually by hub admin for an experience or expertise',
  params: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'Hub ID',
      },
    },
  },
  body: {
    type: 'object',
    required: ['serviceType', 'serviceId', 'learners'],
    properties: {
      serviceType: {
        type: 'string',
        enum: ['experience', 'expertise'],
        description: 'Type of service being booked',
      },
      serviceId: {
        type: 'string',
        minLength: 24,
        maxLength: 24,
        description: 'ID of the service (experience or expertise)',
      },
      eventId: {
        type: 'string',
        minLength: 1,
        description:
          'Event/session ID for experiences (24 char ObjectId) or slot identifier for expertise (e.g., "2025-12-26-09:30")',
      },
      slotDate: {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        description: 'For expertise: date in YYYY-MM-DD format',
      },
      slotTime: {
        type: 'string',
        pattern: '^\\d{2}:\\d{2}$',
        description: 'For expertise: time in HH:mm format',
      },
      learners: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['name', 'email', 'phone'],
          properties: {
            name: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', minLength: 1 },
            ticketId: { type: 'string' },
          },
        },
        description: 'Array of learner details for the booking',
      },
      addedByHub: {
        type: 'boolean',
        default: true,
        description: 'Flag indicating booking was added by hub',
      },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            bookingType: { type: 'string' },
            status: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
} as const;
