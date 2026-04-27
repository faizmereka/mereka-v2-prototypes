import type { BookingStatus, BookingType, StripePaymentStatus } from '@core/models/Booking';
import type {
  BookingIdParams,
  GetCalendarEventsQuery,
  GetMonthlyTrendsQuery,
  GetTopServicesQuery,
  ListBookingsQuery,
} from '@core/schemas/admin/bookings';
import { adminBookingService } from '@core/services/admin/bookings';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get booking statistics
 */
export async function getBookingStats(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const stats = await adminBookingService.getStats();
    return reply.send({ success: true, data: stats });
  } catch (error) {
    request.log.error({ error }, 'Error fetching booking stats');
    return reply.status(500).send({
      success: false,
      error: { code: 'STATS_ERROR', message: 'Failed to fetch booking statistics' },
    });
  }
}

/**
 * List bookings with pagination and filters
 */
export async function listBookings(
  request: FastifyRequest<{ Querystring: ListBookingsQuery }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { startDate, endDate, ...rest } = request.query;

    const result = await adminBookingService.list({
      ...rest,
      bookingType: rest.bookingType as BookingType | undefined,
      status: rest.status as BookingStatus | undefined,
      stripeStatus: rest.stripeStatus as StripePaymentStatus | undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return reply.send({ success: true, data: result });
  } catch (error) {
    request.log.error({ error }, 'Error listing bookings');
    return reply.status(500).send({
      success: false,
      error: { code: 'LIST_ERROR', message: 'Failed to list bookings' },
    });
  }
}

/**
 * Get calendar events
 */
export async function getCalendarEvents(
  request: FastifyRequest<{ Querystring: GetCalendarEventsQuery }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { startDate, endDate, bookingType } = request.query;

    const events = await adminBookingService.getCalendarEvents(
      new Date(startDate),
      new Date(endDate),
      bookingType as BookingType | undefined,
    );

    return reply.send({ success: true, data: events });
  } catch (error) {
    request.log.error({ error }, 'Error fetching calendar events');
    return reply.status(500).send({
      success: false,
      error: { code: 'CALENDAR_ERROR', message: 'Failed to fetch calendar events' },
    });
  }
}

/**
 * Get booking by ID
 */
export async function getBookingById(
  request: FastifyRequest<{ Params: BookingIdParams }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { id } = request.params;
    const booking = await adminBookingService.getById(id);

    if (!booking) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Booking not found' },
      });
    }

    return reply.send({ success: true, data: booking });
  } catch (error) {
    request.log.error({ error }, 'Error fetching booking');
    return reply.status(500).send({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Failed to fetch booking' },
    });
  }
}

/**
 * Get monthly trends
 */
export async function getMonthlyTrends(
  request: FastifyRequest<{ Querystring: GetMonthlyTrendsQuery }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { months = 12 } = request.query;
    const trends = await adminBookingService.getMonthlyTrends(months);

    return reply.send({ success: true, data: trends });
  } catch (error) {
    request.log.error({ error }, 'Error fetching monthly trends');
    return reply.status(500).send({
      success: false,
      error: { code: 'TRENDS_ERROR', message: 'Failed to fetch monthly trends' },
    });
  }
}

/**
 * Get top services
 */
export async function getTopServices(
  request: FastifyRequest<{ Querystring: GetTopServicesQuery }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { limit = 10 } = request.query;
    const services = await adminBookingService.getTopServices(limit);

    return reply.send({ success: true, data: services });
  } catch (error) {
    request.log.error({ error }, 'Error fetching top services');
    return reply.status(500).send({
      success: false,
      error: { code: 'TOP_SERVICES_ERROR', message: 'Failed to fetch top services' },
    });
  }
}
