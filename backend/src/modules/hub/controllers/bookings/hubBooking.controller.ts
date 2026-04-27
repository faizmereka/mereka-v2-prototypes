import type {
  HubCreateBookingBody,
  HubExportBookingsQuery,
  HubListBookingsQuery,
  HubUpdateBookingStatusBody,
} from '@core/schemas/hub/bookings';
import { hubBookingService } from '@core/services/hub/bookings';
import { hubReviewService } from '@core/services/reviews/hubReview.service';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * List all hub bookings (experiences + expertise)
 */
export async function listHubBookings(
  request: FastifyRequest<{
    Params: { hubId: string };
    Querystring: HubListBookingsQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const { serviceType, status, page, limit, search, dateFrom, dateTo, grouped } = request.query;

    const result = await hubBookingService.listAllBookings({
      hubId,
      serviceType,
      status,
      page,
      limit,
      search,
      dateFrom,
      dateTo,
      grouped,
    });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing hub bookings');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_BOOKINGS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list bookings',
      },
    });
  }
}

/**
 * Update booking status (approve/reject/cancel)
 */
export async function updateHubBookingStatus(
  request: FastifyRequest<{
    Params: { hubId: string; bookingId: string };
    Body: HubUpdateBookingStatusBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, bookingId } = request.params;
    const { status, reason } = request.body;

    const result = await hubBookingService.updateBookingStatus({
      hubId,
      bookingId,
      status,
      reason,
    });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Error updating booking status');
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'UPDATE_BOOKING_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update booking',
      },
    });
  }
}

/**
 * Export hub bookings as CSV
 */
export async function exportHubBookings(
  request: FastifyRequest<{
    Params: { hubId: string };
    Querystring: HubExportBookingsQuery;
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const { serviceType, status, dateFrom, dateTo } = request.query;

    const result = await hubBookingService.exportBookings({
      hubId,
      serviceType,
      status,
      dateFrom,
      dateTo,
    });

    // Convert to CSV format
    const csvContent = [
      result.headers.join(','),
      ...result.rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename="${result.filename}"`)
      .send(csvContent);
  } catch (error) {
    request.log.error({ error }, 'Error exporting bookings');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'EXPORT_BOOKINGS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to export bookings',
      },
    });
  }
}

/**
 * List experience bookings
 */
export async function listExperienceBookings(
  request: FastifyRequest<{
    Params: { hubId: string; experienceId: string };
    Querystring: {
      eventId?: string;
      status?: 'upcoming' | 'past' | 'cancelled' | 'all';
      page?: number;
      limit?: number;
      search?: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, experienceId } = request.params;
    const { eventId, status, page, limit, search } = request.query;

    const result = await hubBookingService.listExperienceBookings({
      hubId,
      experienceId,
      eventId,
      status,
      page,
      limit,
      search,
    });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing experience bookings');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_BOOKINGS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list bookings',
      },
    });
  }
}

/**
 * Get booking by ID
 */
export async function getHubBookingById(
  request: FastifyRequest<{
    Params: { hubId: string; bookingId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, bookingId } = request.params;

    const booking = await hubBookingService.getBookingById(hubId, bookingId);

    if (!booking) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'BOOKING_NOT_FOUND',
          message: 'Booking not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: booking,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting booking');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_BOOKING_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get booking',
      },
    });
  }
}

/**
 * Create a manual booking by hub admin
 */
export async function createHubBooking(
  request: FastifyRequest<{
    Params: { hubId: string };
    Body: HubCreateBookingBody;
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const { serviceType, serviceId, eventId, slotDate, slotTime, learners } = request.body;

    // Get user ID from auth context
    const userId = (request.user as { id?: string })?.id;
    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
    }

    const result = await hubBookingService.createBooking({
      hubId,
      userId,
      serviceType,
      serviceId,
      eventId,
      slotDate,
      slotTime,
      learners,
    });

    return reply.status(201).send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Error creating booking');
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'CREATE_BOOKING_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create booking',
      },
    });
  }
}

// ============================================================================
// Hub Reply to Booking Review
// ============================================================================

/**
 * Add hub reply to a booking review
 */
export async function addHubReply(
  request: FastifyRequest<{
    Params: { hubId: string; bookingId: string };
    Body: { content: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, bookingId } = request.params;
    const { content } = request.body;

    const result = await hubReviewService.addHubReply(hubId, bookingId, content);

    return reply.status(201).send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Error adding hub reply');
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'ADD_REPLY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to add reply',
      },
    });
  }
}

/**
 * Update hub reply
 */
export async function updateHubReply(
  request: FastifyRequest<{
    Params: { hubId: string; bookingId: string };
    Body: { content: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, bookingId } = request.params;
    const { content } = request.body;

    const result = await hubReviewService.updateHubReply(hubId, bookingId, content);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Error updating hub reply');
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'UPDATE_REPLY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update reply',
      },
    });
  }
}

/**
 * Delete hub reply
 */
export async function deleteHubReply(
  request: FastifyRequest<{
    Params: { hubId: string; bookingId: string };
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId, bookingId } = request.params;

    await hubReviewService.deleteHubReply(hubId, bookingId);

    return reply.send({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    request.log.error({ error }, 'Error deleting hub reply');
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'DELETE_REPLY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete reply',
      },
    });
  }
}
