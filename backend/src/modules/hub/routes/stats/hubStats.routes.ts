import { getExpertStats, getJobStats } from '@controllers/hub';
import { hubGetStatsSchema } from '@schemas/hub';
import type { FastifyInstance } from 'fastify';

/**
 * Hub Stats Routes
 * Prefix: /hub/:hubId/stats
 */
export async function hubStatsRoutes(fastify: FastifyInstance) {
  // Get hub stats (jobs, proposals, contracts counts) - Employer/Client perspective
  fastify.get('/', {
    schema: {
      tags: ['Hub Stats'],
      summary: 'Get hub stats (employer view)',
      description: 'Returns counts for jobs posted, proposals received, and contracts as employer',
      params: hubGetStatsSchema.params,
      response: hubGetStatsSchema.response,
    },
    handler: getJobStats,
  });

  // Get expert stats (proposals, contracts counts) - Expert perspective
  fastify.get('/expert', {
    schema: {
      tags: ['Hub Stats'],
      summary: 'Get expert stats (expert view)',
      description: 'Returns counts for proposals submitted and contracts as expert',
      params: hubGetStatsSchema.params,
    },
    handler: getExpertStats,
  });
}
