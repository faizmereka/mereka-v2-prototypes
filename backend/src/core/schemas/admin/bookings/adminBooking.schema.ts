/**
 * Admin Booking Schemas
 * JSON Schema definitions for admin booking endpoints
 */

export const getBookingStatsSchema = {
  tags: ['Admin - Bookings'],
  summary: 'Get booking statistics',
  description:
    'Returns aggregated booking statistics including counts by type, status, and revenue',
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            byType: {
              type: 'object',
              properties: {
                experience: { type: 'number' },
                expertise: { type: 'number' },
                space: { type: 'number' },
              },
            },
            byStatus: {
              type: 'object',
              properties: {
                pending: { type: 'number' },
                active: { type: 'number' },
                completed: { type: 'number' },
                cancelled: { type: 'number' },
              },
            },
            byPaymentStatus: {
              type: 'object',
              properties: {
                succeeded: { type: 'number' },
                pending: { type: 'number' },
                failed: { type: 'number' },
                refunded: { type: 'number' },
              },
            },
            revenue: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                thisMonth: { type: 'number' },
                thisWeek: { type: 'number' },
                today: { type: 'number' },
              },
            },
          },
        },
      },
    },
  },
} as const;

export const listBookingsSchema = {
  tags: ['Admin - Bookings'],
  summary: 'List all bookings',
  description: 'Returns paginated list of bookings with optional filters',
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'number', minimum: 1, default: 1 },
      limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
      bookingType: { type: 'string', enum: ['experience', 'expertise', 'space'] },
      status: {
        type: 'string',
        enum: ['pending', 'active', 'completed', 'cancelled', 'withdrawn', 'rejected', 'expired'],
      },
      stripeStatus: {
        type: 'string',
        enum: [
          'pending',
          'succeeded',
          'requires_payment_method',
          'requires_confirmation',
          'requires_action',
          'processing',
          'requires_capture',
          'canceled',
          'failed',
        ],
      },
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
      hubId: { type: 'string' },
      search: { type: 'string' },
      sortBy: { type: 'string', default: 'createdAt' },
      sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
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

export const getCalendarEventsSchema = {
  tags: ['Admin - Bookings'],
  summary: 'Get calendar events',
  description: 'Returns bookings formatted for calendar display within a date range',
  querystring: {
    type: 'object',
    required: ['startDate', 'endDate'],
    properties: {
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
      bookingType: { type: 'string', enum: ['experience', 'expertise', 'space'] },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              start: { type: 'string', format: 'date-time' },
              end: { type: 'string', format: 'date-time' },
              bookingType: { type: 'string' },
              status: { type: 'string' },
              totalCost: { type: 'number' },
              currency: { type: 'string' },
              learnerCount: { type: 'number' },
              serviceName: { type: 'string' },
              hubName: { type: 'string' },
            },
          },
        },
      },
    },
  },
} as const;

export const getBookingByIdSchema = {
  tags: ['Admin - Bookings'],
  summary: 'Get booking by ID',
  description: 'Returns detailed booking information',
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object', additionalProperties: true },
      },
    },
    404: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  },
} as const;

export const getMonthlyTrendsSchema = {
  tags: ['Admin - Bookings'],
  summary: 'Get monthly booking trends',
  description: 'Returns booking counts and revenue by month',
  querystring: {
    type: 'object',
    properties: {
      months: { type: 'number', minimum: 1, maximum: 24, default: 12 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              year: { type: 'number' },
              month: { type: 'number' },
              count: { type: 'number' },
              revenue: { type: 'number' },
            },
          },
        },
      },
    },
  },
} as const;

export const getTopServicesSchema = {
  tags: ['Admin - Bookings'],
  summary: 'Get top services by bookings',
  description: 'Returns top services ranked by booking count',
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'number', minimum: 1, maximum: 50, default: 10 },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              serviceId: { type: 'string' },
              serviceName: { type: 'string' },
              bookingType: { type: 'string' },
              count: { type: 'number' },
              revenue: { type: 'number' },
            },
          },
        },
      },
    },
  },
} as const;

// Query interfaces
export interface ListBookingsQuery {
  page?: number;
  limit?: number;
  bookingType?: 'experience' | 'expertise' | 'space';
  status?: string;
  stripeStatus?: string;
  startDate?: string;
  endDate?: string;
  hubId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetCalendarEventsQuery {
  startDate: string;
  endDate: string;
  bookingType?: 'experience' | 'expertise' | 'space';
}

export interface GetMonthlyTrendsQuery {
  months?: number;
}

export interface GetTopServicesQuery {
  limit?: number;
}

export interface BookingIdParams {
  id: string;
}
