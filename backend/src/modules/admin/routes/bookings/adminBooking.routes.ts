import {
  getBookingById,
  getBookingStats,
  getCalendarEvents,
  getMonthlyTrends,
  getTopServices,
  listBookings,
} from '@controllers/admin';
import {
  getBookingByIdSchema,
  getBookingStatsSchema,
  getCalendarEventsSchema,
  getMonthlyTrendsSchema,
  getTopServicesSchema,
  listBookingsSchema,
} from '@core/schemas/admin/bookings';
import type { FastifyInstance } from 'fastify';

/**
 * Admin Booking Routes
 * Prefix: /api/v1/admin/bookings
 */
export async function adminBookingRoutes(fastify: FastifyInstance): Promise<void> {
  // Stats endpoint
  fastify.get('/stats', {
    schema: getBookingStatsSchema,
    handler: getBookingStats,
  });

  // List bookings
  fastify.get('/', {
    schema: listBookingsSchema,
    handler: listBookings,
  });

  // Calendar events
  fastify.get('/calendar', {
    schema: getCalendarEventsSchema,
    handler: getCalendarEvents,
  });

  // Monthly trends
  fastify.get('/trends', {
    schema: getMonthlyTrendsSchema,
    handler: getMonthlyTrends,
  });

  // Top services
  fastify.get('/top-services', {
    schema: getTopServicesSchema,
    handler: getTopServices,
  });

  // Get single booking
  fastify.get('/:id', {
    schema: getBookingByIdSchema,
    handler: getBookingById,
  });
}
