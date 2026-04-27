import { listHubRoles } from '@controllers/hub';
import { requireAuth } from '@core/middlewares/auth.middleware';
import { requireHubMembership } from '@core/middlewares/hubPermission.middleware';
import { hubListHubRolesSchema } from '@core/schemas/hub';
import type { FastifyInstance } from 'fastify';

export async function hubRoleRoutes(fastify: FastifyInstance) {
  /**
   * List hub roles
   */
  fastify.get('/:hubId/roles', {
    schema: {
      tags: ['Hub Roles'],
      summary: 'List hub roles',
      description: 'Get all active roles available in this hub (system + hub-specific)',
      params: hubListHubRolesSchema.params,
      response: {
        200: {
          description: 'Roles retrieved successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                roles: { type: 'array' },
              },
            },
          },
        },
      },
    },
    preHandler: [requireAuth, requireHubMembership],
    handler: listHubRoles,
  });
}
