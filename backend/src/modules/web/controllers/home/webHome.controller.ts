import { webHomeService } from '@services/web';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Controllers
// ============================================================================

/**
 * Get home page data
 * GET /home
 *
 * Returns top 3 active expertises and experiences sorted by createdAt (newest first)
 */
export async function getHomeData(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = await webHomeService.getHomeData();

    return reply.send({
      success: true,
      data,
    });
  } catch (error) {
    request.log.error(error, 'Error fetching home page data');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch home page data',
      },
    });
  }
}

/**
 * Get featured reviews for home page
 * GET /home/reviews
 *
 * Returns featured high-rated reviews for the home page carousel
 */
export async function getHomeReviews(request: FastifyRequest, reply: FastifyReply) {
  try {
    const reviews = await webHomeService.getFeaturedReviews();

    return reply.send({
      success: true,
      data: reviews,
    });
  } catch (error) {
    request.log.error(error, 'Error fetching home page reviews');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch home page reviews',
      },
    });
  }
}
