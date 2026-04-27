import type {
  AdminCreateRoleInput,
  AdminQueryRolesInput,
  AdminUpdateRoleInput,
} from '@schemas/admin';
import { adminRoleService as roleService } from '@services/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Role Controllers for Admin Module
 */

/**
 * Create a new role
 * POST /api/v1/admin/roles
 */
export async function createRole(
  request: FastifyRequest<{ Body: AdminCreateRoleInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const role = await roleService.createRole(request.body);
    return reply.status(201).send({
      success: true,
      data: role,
    });
  } catch (error) {
    request.log.error({ error }, 'Error creating role');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'ROLE_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create role',
      },
    });
  }
}

/**
 * List all roles with filtering
 * GET /api/v1/admin/roles
 */
export async function listRoles(
  request: FastifyRequest<{ Querystring: AdminQueryRolesInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const result = await roleService.listRoles(request.query);
    return reply.send({
      success: true,
      data: result.roles,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing roles');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'ROLE_LIST_ERROR',
        message: 'Failed to list roles',
      },
    });
  }
}

/**
 * Get active roles
 * GET /api/v1/admin/roles/active
 */
export async function getActiveRoles(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const roles = await roleService.getActiveRoles();
    return reply.send({
      success: true,
      data: roles,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting active roles');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'ROLE_LIST_ERROR',
        message: 'Failed to get active roles',
      },
    });
  }
}

/**
 * Get system roles
 * GET /api/v1/admin/roles/system
 */
export async function getSystemRoles(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const roles = await roleService.getSystemRoles();
    return reply.send({
      success: true,
      data: roles,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting system roles');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'ROLE_LIST_ERROR',
        message: 'Failed to get system roles',
      },
    });
  }
}

/**
 * Get role by ID
 * GET /api/v1/admin/roles/:id
 */
export async function getRoleById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const role = await roleService.getRoleById(request.params.id);

    if (!role) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ROLE_NOT_FOUND',
          message: 'Role not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: role,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting role');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'ROLE_GET_ERROR',
        message: 'Failed to get role',
      },
    });
  }
}

/**
 * Update a role
 * PATCH /api/v1/admin/roles/:id
 */
export async function updateRole(
  request: FastifyRequest<{
    Params: { id: string };
    Body: AdminUpdateRoleInput['body'];
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const role = await roleService.updateRole(request.params.id, request.body);
    return reply.send({
      success: true,
      data: role,
    });
  } catch (error) {
    request.log.error({ error }, 'Error updating role');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'ROLE_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update role',
      },
    });
  }
}

/**
 * Delete a role (soft delete)
 * DELETE /api/v1/admin/roles/:id
 */
export async function deleteRole(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    await roleService.deleteRole(request.params.id);
    return reply.send({
      success: true,
      message: 'Role deactivated successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Error deleting role');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'ROLE_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete role',
      },
    });
  }
}

/**
 * Toggle role active status
 * PATCH /api/v1/admin/roles/:id/toggle
 */
export async function toggleRoleStatus(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { isActive: boolean };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const role = await roleService.toggleRoleStatus(request.params.id, request.body.isActive);
    return reply.send({
      success: true,
      data: role,
      message: `Role ${request.body.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    request.log.error({ error }, 'Error toggling role status');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'ROLE_TOGGLE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to toggle role status',
      },
    });
  }
}

/**
 * Get roles by hub
 * GET /api/v1/admin/roles/hub/:hubId
 */
export async function getRolesByHub(
  request: FastifyRequest<{ Params: { hubId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const roles = await roleService.getRolesByHub(request.params.hubId);
    return reply.send({
      success: true,
      data: roles,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting roles by hub');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'ROLE_LIST_ERROR',
        message: 'Failed to get roles by hub',
      },
    });
  }
}
