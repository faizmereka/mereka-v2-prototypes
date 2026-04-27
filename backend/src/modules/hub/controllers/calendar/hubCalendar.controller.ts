import type {
  CalendarEventType,
  HubCalendarEventDetailQuery,
  HubCalendarEventsByDateQuery,
  HubCalendarEventsQuery,
} from '@core/schemas/hub/calendar';
import { hubCalendarService } from '@services/hub';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get calendar events for date range
 * GET /hub/:hubId/calendar/events
 */
export async function getCalendarEvents(
  request: FastifyRequest<{
    Params: { hubId: string };
    Querystring: HubCalendarEventsQuery;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { hubId } = request.params;
    const query = request.query;

    const result = await hubCalendarService.getCalendarEvents(hubId, query);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, hubId: request.params.hubId }, 'Error fetching calendar events');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'CALENDAR_EVENTS_ERROR',
        message: 'Failed to fetch calendar events',
      },
    });
  }
}

/**
 * Get events for a specific date
 * GET /hub/:hubId/calendar/date/:date
 */
export async function getEventsByDate(
  request: FastifyRequest<{
    Params: { hubId: string; date: string };
    Querystring: HubCalendarEventsByDateQuery;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { hubId, date } = request.params;
    const { type = 'all' } = request.query;

    const events = await hubCalendarService.getEventsByDate(
      hubId,
      date,
      type as 'all' | CalendarEventType,
    );

    return reply.send({
      success: true,
      data: {
        date,
        events,
        totalEvents: events.length,
      },
    });
  } catch (error) {
    request.log.error(
      { error, hubId: request.params.hubId, date: request.params.date },
      'Error fetching events for date',
    );
    return reply.status(500).send({
      success: false,
      error: {
        code: 'CALENDAR_DATE_ERROR',
        message: 'Failed to fetch events for date',
      },
    });
  }
}

/**
 * Get event details with bookings
 * GET /hub/:hubId/calendar/event/:id
 */
export async function getEventDetails(
  request: FastifyRequest<{
    Params: { hubId: string; id: string };
    Querystring: HubCalendarEventDetailQuery;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const { hubId, id } = request.params;
    const { type } = request.query;

    if (!type) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Event type is required',
        },
      });
    }

    const eventDetail = await hubCalendarService.getEventDetails(hubId, id, type);

    if (!eventDetail) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'EVENT_NOT_FOUND',
          message: 'Event not found or does not belong to this hub',
        },
      });
    }

    return reply.send({
      success: true,
      data: eventDetail,
    });
  } catch (error) {
    request.log.error(
      { error, hubId: request.params.hubId, eventId: request.params.id },
      'Error fetching event details',
    );
    return reply.status(500).send({
      success: false,
      error: {
        code: 'EVENT_DETAILS_ERROR',
        message: 'Failed to fetch event details',
      },
    });
  }
}
