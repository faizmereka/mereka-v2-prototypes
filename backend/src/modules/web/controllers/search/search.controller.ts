import type { SearchQuery, SearchResponse } from '@core/schemas/web/search';
import { searchService } from '@core/services/web/search';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Unified search controller
 * Searches across experts, hubs, expertise, and experiences
 */
export async function search(
  request: FastifyRequest<{ Querystring: SearchQuery }>,
  reply: FastifyReply,
): Promise<SearchResponse> {
  try {
    const { q, limit = 10 } = request.query;

    const results = await searchService.search(q, limit);

    return reply.send({
      success: true,
      data: {
        results,
        total: results.length,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Search failed');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: 'An error occurred while searching',
      },
    });
  }
}
