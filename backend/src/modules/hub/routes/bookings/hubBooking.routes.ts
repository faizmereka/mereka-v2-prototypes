import {
  addHubReply,
  createHubBooking,
  deleteHubReply,
  exportHubBookings,
  getHubBookingById,
  listExperienceBookings,
  listHubBookings,
  updateHubBookingStatus,
  updateHubReply,
} from '@controllers/hub';
import { PERMISSIONS } from '@core/constants';
import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  loadHubContext,
  requireHubAccess,
  requireHubPermission,
} from '@core/middlewares/hubPermission.middleware';
import {
  hubCreateBookingSchema,
  hubExportBookingsSchema,
  hubGetBookingByIdSchema,
  hubListBookingsSchema,
  hubListExperienceBookingsSchema,
  hubUpdateBookingStatusSchema,
} from '@core/schemas/hub/bookings';
import type { FastifyInstance } from 'fastify';

/**
 * Hub Booking Routes (scoped to hub)
 * Prefix: /api/v1/hub/:hubId/bookings
 */
export async function hubScopedBookingRoutes(fastify: FastifyInstance): Promise<void> {
  // Common preHandlers
  const bookingPreHandlers = [requireAuth, loadHubContext, requireHubAccess];

  // List all hub bookings (experiences + expertise)
  fastify.get('/', {
    schema: hubListBookingsSchema,
    preHandler: [...bookingPreHandlers, requireHubPermission(PERMISSIONS.BOOKING_VIEW)],
    handler: listHubBookings,
  });

  // Create a manual booking
  fastify.post('/', {
    schema: hubCreateBookingSchema,
    preHandler: [...bookingPreHandlers, requireHubPermission(PERMISSIONS.BOOKING_CREATE)],
    handler: createHubBooking,
  });

  // Export bookings as CSV
  fastify.get('/export', {
    schema: hubExportBookingsSchema,
    preHandler: [...bookingPreHandlers, requireHubPermission(PERMISSIONS.BOOKING_VIEW)],
    handler: exportHubBookings,
  });

  // List bookings for an experience
  fastify.get('/experiences/:experienceId', {
    schema: hubListExperienceBookingsSchema,
    preHandler: [...bookingPreHandlers, requireHubPermission(PERMISSIONS.BOOKING_VIEW)],
    handler: listExperienceBookings,
  });

  // Get single booking
  fastify.get('/:bookingId', {
    schema: hubGetBookingByIdSchema,
    preHandler: [...bookingPreHandlers, requireHubPermission(PERMISSIONS.BOOKING_VIEW)],
    handler: getHubBookingById,
  });

  // Update booking status (approve/reject/cancel)
  fastify.patch('/:bookingId/status', {
    schema: hubUpdateBookingStatusSchema,
    preHandler: [...bookingPreHandlers, requireHubPermission(PERMISSIONS.BOOKING_CONFIRM)],
    handler: updateHubBookingStatus,
  });

  // ============================================================================
  // Hub Reply to Booking Review
  // ============================================================================

  const hubReplyBodySchema = {
    type: 'object',
    required: ['content'],
    properties: {
      content: { type: 'string', minLength: 1, maxLength: 500 },
    },
  } as const;

  // Add hub reply
  fastify.post('/:bookingId/reply', {
    schema: {
      tags: ['Hub - Bookings'],
      summary: 'Add hub reply to booking review',
      description: 'Add a reply to a learner review on a booking',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['hubId', 'bookingId'],
        properties: {
          hubId: { type: 'string' },
          bookingId: { type: 'string' },
        },
      },
      body: hubReplyBodySchema,
    },
    preHandler: [
      ...bookingPreHandlers,
      requireHubPermission(PERMISSIONS.COMMUNICATION_VIEW_REVIEWS),
    ],
    handler: addHubReply,
  });

  // Update hub reply
  fastify.put('/:bookingId/reply', {
    schema: {
      tags: ['Hub - Bookings'],
      summary: 'Update hub reply to booking review',
      description: 'Update an existing hub reply on a booking review',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['hubId', 'bookingId'],
        properties: {
          hubId: { type: 'string' },
          bookingId: { type: 'string' },
        },
      },
      body: hubReplyBodySchema,
    },
    preHandler: [
      ...bookingPreHandlers,
      requireHubPermission(PERMISSIONS.COMMUNICATION_VIEW_REVIEWS),
    ],
    handler: updateHubReply,
  });

  // Delete hub reply
  fastify.delete('/:bookingId/reply', {
    schema: {
      tags: ['Hub - Bookings'],
      summary: 'Delete hub reply from booking review',
      description: 'Delete the hub reply from a booking review',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['hubId', 'bookingId'],
        properties: {
          hubId: { type: 'string' },
          bookingId: { type: 'string' },
        },
      },
    },
    preHandler: [
      ...bookingPreHandlers,
      requireHubPermission(PERMISSIONS.COMMUNICATION_VIEW_REVIEWS),
    ],
    handler: deleteHubReply,
  });
}
