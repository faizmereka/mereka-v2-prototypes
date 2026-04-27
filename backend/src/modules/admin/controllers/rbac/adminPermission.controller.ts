import type {
  AdminCreatePermissionInput,
  AdminQueryPermissionsInput,
  AdminUpdatePermissionInput,
} from '@schemas/admin';
import { adminPermissionService as permissionService } from '@services/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Permission Controllers for Admin Module
 */

/**
 * Create a new permission
 * POST /api/v1/admin/permissions
 */
export async function createPermission(
  request: FastifyRequest<{ Body: AdminCreatePermissionInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const permission = await permissionService.createPermission(request.body);
    return reply.status(201).send({
      success: true,
      data: permission,
    });
  } catch (error) {
    request.log.error({ error }, 'Error creating permission');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'PERMISSION_CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create permission',
      },
    });
  }
}

/**
 * List all permissions with filtering
 * GET /api/v1/admin/permissions
 */
export async function listPermissions(
  request: FastifyRequest<{ Querystring: AdminQueryPermissionsInput }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const result = await permissionService.listPermissions(request.query);
    return reply.send({
      success: true,
      data: result.permissions,
      meta: {
        total: result.total,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Error listing permissions');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'PERMISSION_LIST_ERROR',
        message: 'Failed to list permissions',
      },
    });
  }
}

/**
 * Get active permissions
 * GET /api/v1/admin/permissions/active
 */
export async function getActivePermissions(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const permissions = await permissionService.getActivePermissions();
    return reply.send({
      success: true,
      data: permissions,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting active permissions');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'PERMISSION_LIST_ERROR',
        message: 'Failed to get active permissions',
      },
    });
  }
}

/**
 * Get permissions grouped by category
 * GET /api/v1/admin/permissions/grouped
 */
export async function getPermissionsGrouped(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const grouped = await permissionService.getPermissionsGroupedByCategory();
    return reply.send({
      success: true,
      data: grouped,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting grouped permissions');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'PERMISSION_LIST_ERROR',
        message: 'Failed to get grouped permissions',
      },
    });
  }
}

/**
 * Get permission categories
 * GET /api/v1/admin/permissions/categories
 */
export async function getPermissionCategories(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const categories = permissionService.getCategories();
    return reply.send({
      success: true,
      data: categories,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting permission categories');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'PERMISSION_CATEGORIES_ERROR',
        message: 'Failed to get permission categories',
      },
    });
  }
}

/**
 * Get permission by ID
 * GET /api/v1/admin/permissions/:id
 */
export async function getPermissionById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const permission = await permissionService.getPermissionById(request.params.id);

    if (!permission) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'PERMISSION_NOT_FOUND',
          message: 'Permission not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: permission,
    });
  } catch (error) {
    request.log.error({ error }, 'Error getting permission');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'PERMISSION_GET_ERROR',
        message: 'Failed to get permission',
      },
    });
  }
}

/**
 * Update a permission
 * PATCH /api/v1/admin/permissions/:id
 */
export async function updatePermission(
  request: FastifyRequest<{
    Params: { id: string };
    Body: AdminUpdatePermissionInput['body'];
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const permission = await permissionService.updatePermission(request.params.id, request.body);
    return reply.send({
      success: true,
      data: permission,
    });
  } catch (error) {
    request.log.error({ error }, 'Error updating permission');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'PERMISSION_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update permission',
      },
    });
  }
}

/**
 * Delete a permission (soft delete)
 * DELETE /api/v1/admin/permissions/:id
 */
export async function deletePermission(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    await permissionService.deletePermission(request.params.id);
    return reply.send({
      success: true,
      message: 'Permission deactivated successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Error deleting permission');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'PERMISSION_DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete permission',
      },
    });
  }
}

/**
 * Toggle permission active status
 * PATCH /api/v1/admin/permissions/:id/toggle
 */
export async function togglePermissionStatus(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { isActive: boolean };
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const permission = await permissionService.togglePermissionStatus(
      request.params.id,
      request.body.isActive,
    );
    return reply.send({
      success: true,
      data: permission,
      message: `Permission ${request.body.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    request.log.error({ error }, 'Error toggling permission status');
    return reply.status(400).send({
      success: false,
      error: {
        code: 'PERMISSION_TOGGLE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to toggle permission status',
      },
    });
  }
}
