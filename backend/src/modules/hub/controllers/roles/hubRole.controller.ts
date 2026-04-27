import type { HubListHubRolesInput } from '@core/schemas/hub';

import { hubRoleService } from '@core/services/hub';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * List hub roles
 */
export async function listHubRoles(
  request: FastifyRequest<{
    Params: HubListHubRolesInput['params'];
  }>,
  reply: FastifyReply,
) {
  try {
    const { hubId } = request.params;
    const roles = await hubRoleService.listRolesForHub(hubId);

    return reply.send({
      success: true,
      data: {
        roles,
      },
    });
  } catch (error) {
    request.log.error({ error, hubId: request.params.hubId }, 'Error listing hub roles');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_HUB_ROLES_ERROR',
        message: 'Failed to list hub roles',
      },
    });
  }
}
