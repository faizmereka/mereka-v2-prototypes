import { getCalendarEvents, getEventDetails, getEventsByDate } from '@controllers/hub';
import { PERMISSIONS } from '@core/constants';
import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  loadHubContext,
  requireHubAccess,
  requireHubPermission,
} from '@core/middlewares/hubPermission.middleware';
import {
  hubCalendarDateParamsSchema,
  hubCalendarEventDetailQuerySchema,
  hubCalendarEventParamsSchema,
  hubCalendarEventsByDateQuerySchema,
  hubCalendarEventsQuerySchema,
} from '@core/schemas/hub/calendar';
import type { FastifyInstance } from 'fastify';

/**
 * Hub Calendar routes - Calendar data for hub owners/members
 * Base path: /hub/:hubId/calendar
 */
export async function hubCalendarRoutes(fastify: FastifyInstance): Promise<void> {
  // Common preHandlers for all calendar routes
  const calendarPreHandlers = [requireAuth, loadHubContext, requireHubAccess];

  /**
   * Get calendar events for date range
   * Fetches both experience events and expertise bookings
   */
  fastify.get('/events', {
    preHandler: [...calendarPreHandlers, requireHubPermission(PERMISSIONS.BOOKING_VIEW)],
    schema: {
      tags: ['Hub Calendar'],
      summary: 'Get calendar events for date range',
      description:
        'Get all calendar events (experiences + expertises) for a date range. Returns unified event format with booking counts.',
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
      querystring: hubCalendarEventsQuerySchema,
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                events: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      title: { type: 'string' },
                      type: { type: 'string', enum: ['experience', 'expertise'] },
                      startTime: { type: 'string', format: 'date-time' },
                      endTime: { type: 'string', format: 'date-time' },
                      serviceId: { type: 'string' },
                      serviceName: { type: 'string' },
                      bookingCount: { type: 'number' },
                      maxCapacity: { type: 'number' },
                      bookingStatus: {
                        type: 'string',
                        enum: ['no-bookings', 'partially-booked', 'mostly-booked', 'fully-booked'],
                      },
                      status: { type: 'string' },
                    },
                  },
                },
                meta: {
                  type: 'object',
                  properties: {
                    startDate: { type: 'string' },
                    endDate: { type: 'string' },
                    totalEvents: { type: 'number' },
                    experienceCount: { type: 'number' },
                    expertiseCount: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: getCalendarEvents,
  });

  /**
   * Get events for a specific date
   * For sidebar/detail view when clicking on a date
   */
  fastify.get('/date/:date', {
    preHandler: [...calendarPreHandlers, requireHubPermission(PERMISSIONS.BOOKING_VIEW)],
    schema: {
      tags: ['Hub Calendar'],
      summary: 'Get events for a specific date',
      description:
        'Get all events for a specific date. Useful for sidebar details when clicking on a calendar date.',
      params: hubCalendarDateParamsSchema,
      querystring: hubCalendarEventsByDateQuerySchema,
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                date: { type: 'string' },
                events: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      title: { type: 'string' },
                      type: { type: 'string', enum: ['experience', 'expertise'] },
                      startTime: { type: 'string', format: 'date-time' },
                      endTime: { type: 'string', format: 'date-time' },
                      serviceId: { type: 'string' },
                      serviceName: { type: 'string' },
                      bookingCount: { type: 'number' },
                      maxCapacity: { type: 'number' },
                      bookingStatus: {
                        type: 'string',
                        enum: ['no-bookings', 'partially-booked', 'mostly-booked', 'fully-booked'],
                      },
                      status: { type: 'string' },
                    },
                  },
                },
                totalEvents: { type: 'number' },
              },
            },
          },
        },
      },
    },
    handler: getEventsByDate,
  });

  /**
   * Get event details with bookings
   * For viewing full event information and learner list
   */
  fastify.get('/event/:id', {
    preHandler: [...calendarPreHandlers, requireHubPermission(PERMISSIONS.BOOKING_VIEW)],
    schema: {
      tags: ['Hub Calendar'],
      summary: 'Get event details with bookings',
      description:
        'Get detailed event information including all bookings and learner details. Requires event type query parameter.',
      params: hubCalendarEventParamsSchema,
      querystring: hubCalendarEventDetailQuerySchema,
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                event: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    type: { type: 'string', enum: ['experience', 'expertise'] },
                    startTime: { type: 'string', format: 'date-time' },
                    endTime: { type: 'string', format: 'date-time' },
                    serviceId: { type: 'string' },
                    serviceName: { type: 'string' },
                    bookingCount: { type: 'number' },
                    maxCapacity: { type: 'number' },
                    bookingStatus: { type: 'string' },
                    status: { type: 'string' },
                  },
                },
                bookings: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      learner: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          email: { type: 'string' },
                          phone: { type: 'string' },
                        },
                      },
                      ticketDetails: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            ticketName: { type: 'string' },
                            quantity: { type: 'number' },
                            price: { type: 'number' },
                          },
                        },
                      },
                      totalCost: { type: 'number' },
                      status: { type: 'string' },
                      createdAt: { type: 'string', format: 'date-time' },
                    },
                  },
                },
                stats: {
                  type: 'object',
                  properties: {
                    totalBookings: { type: 'number' },
                    totalLearners: { type: 'number' },
                    totalRevenue: { type: 'number' },
                  },
                },
              },
            },
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
    },
    handler: getEventDetails,
  });
}
