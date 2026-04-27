import { learnerOverviewService } from '@services/web';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get learner dashboard overview
 * GET /me/overview
 *
 * Returns dashboard overview data including stats, upcoming bookings, and user info
 */
export async function getLearnerOverview(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as { sub: string }).sub;

  try {
    const overview = await learnerOverviewService.getOverview(userId);

    return reply.send({
      success: true,
      data: overview,
    });
  } catch (error) {
    request.log.error({ error, userId }, 'Error fetching learner overview');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch dashboard overview',
      },
    });
  }
}
