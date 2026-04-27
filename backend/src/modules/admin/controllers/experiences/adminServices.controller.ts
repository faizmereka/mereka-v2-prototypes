import { Experience } from '@core/models/Experience';
import { Expertise } from '@core/models/Expertise';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get combined stats for services tabs (experiences and expertise counts)
 * Used to display counts in tabs like "Experiences (25)" and "Expertise (12)"
 */
export async function getServicesTabStats(_request: FastifyRequest, reply: FastifyReply) {
  try {
    // Run both counts in parallel for efficiency
    const [experienceCounts, expertiseCounts] = await Promise.all([
      Experience.aggregate([
        { $match: { status: { $ne: 'DELETED' } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Expertise.aggregate([
        { $match: { status: { $ne: 'archived' } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Calculate experience totals
    const experienceStats = {
      total: 0,
      active: 0,
      drafted: 0,
      expired: 0,
    };

    for (const item of experienceCounts) {
      if (item._id === 'ACTIVE') {
        experienceStats.active = item.count;
        experienceStats.total += item.count;
      } else if (item._id === 'DRAFTED') {
        experienceStats.drafted = item.count;
        experienceStats.total += item.count;
      } else if (item._id === 'EXPIRED') {
        experienceStats.expired = item.count;
        experienceStats.total += item.count;
      }
    }

    // Calculate expertise totals
    const expertiseStats = {
      total: 0,
      published: 0,
      draft: 0,
    };

    for (const item of expertiseCounts) {
      if (item._id === 'published') {
        expertiseStats.published = item.count;
        expertiseStats.total += item.count;
      } else if (item._id === 'draft') {
        expertiseStats.draft = item.count;
        expertiseStats.total += item.count;
      }
    }

    return reply.status(200).send({
      success: true,
      data: {
        experiences: experienceStats,
        expertise: expertiseStats,
      },
    });
  } catch (error) {
    _request.log.error({ error }, 'Failed to get services tab stats');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'SERVICES_TAB_STATS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get services tab stats',
      },
    });
  }
}
