import type { ResourceType } from '@core/models/Slug';
import { SlugService } from '@services/infrastructure';
import type { FastifyReply, FastifyRequest } from 'fastify';

const slugService = new SlugService();

/**
 * Check slug availability
 */
export async function checkSlugAvailability(
  request: FastifyRequest<{
    Params: { slug: string };
    Querystring: { resourceType?: ResourceType };
  }>,
  reply: FastifyReply,
) {
  try {
    const { slug } = request.params;
    const resourceType = (request.query.resourceType || 'hub') as ResourceType;

    const available = await slugService.isSlugAvailable(slug, resourceType);

    return reply.send({
      success: true,
      data: {
        slug,
        resourceType,
        available,
      },
    });
  } catch (error) {
    request.log.error({ error, params: request.params }, 'Failed to check slug availability');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'CHECK_SLUG_FAILED',
        message: 'Failed to check slug availability',
      },
    });
  }
}
