import type { CancelBookingInput, UserBookingParams, UserBookingsQuery } from '@schemas/web';
import { userBookingService } from '@services/web';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get user's bookings
 * GET /me/bookings
 *
 * Returns paginated list of user's bookings with optional filters
 */
export async function getUserBookings(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as { sub: string }).sub;
  const query = request.query as UserBookingsQuery;

  try {
    const result = await userBookingService.getUserBookings(userId, query);

    return reply.send({
      success: true,
      data: result.bookings,
      meta: result.pagination,
    });
  } catch (error) {
    request.log.error({ error, userId }, 'Error fetching user bookings');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch bookings',
      },
    });
  }
}

/**
 * Get a single booking by ID
 * GET /me/bookings/:bookingId
 *
 * Returns detailed information about a specific booking
 */
export async function getUserBookingById(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as { sub: string }).sub;
  const { bookingId } = request.params as UserBookingParams;

  try {
    const booking = await userBookingService.getUserBookingById(userId, bookingId);

    if (!booking) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: booking,
    });
  } catch (error) {
    request.log.error({ error, userId, bookingId }, 'Error fetching booking');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch booking',
      },
    });
  }
}

/**
 * Cancel a booking
 * POST /me/bookings/:bookingId/cancel
 *
 * Cancels a booking if it's eligible for cancellation
 */
export async function cancelBooking(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as { sub: string }).sub;
  const { bookingId } = request.params as UserBookingParams;
  const { reason } = request.body as CancelBookingInput;

  try {
    const result = await userBookingService.cancelBooking(userId, bookingId, reason);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    request.log.error({ error, userId, bookingId }, 'Error cancelling booking');

    if (errorMessage.includes('BOOKING_NOT_FOUND')) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found',
        },
      });
    }

    if (errorMessage.includes('CANNOT_CANCEL')) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'CANNOT_CANCEL',
          message: errorMessage.replace('CANNOT_CANCEL: ', ''),
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'CANCEL_ERROR',
        message: 'Failed to cancel booking',
      },
    });
  }
}
