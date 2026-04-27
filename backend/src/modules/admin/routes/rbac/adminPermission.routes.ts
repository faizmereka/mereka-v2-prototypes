import {
  createPermission,
  deletePermission,
  getActivePermissions,
  getPermissionById,
  getPermissionCategories,
  getPermissionsGrouped,
  listPermissions,
  togglePermissionStatus,
  updatePermission,
} from '@controllers/admin';
import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import {
  adminCreatePermissionSchema,
  adminDeletePermissionSchema,
  adminGetPermissionByIdSchema,
  adminQueryPermissionsSchema,
  adminUpdatePermissionSchema,
} from '@schemas/admin';
import type { FastifyInstance } from 'fastify';

/**
 * Admin Permission Routes
 * All routes require admin authentication
 */
export async function adminPermissionRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/admin/permissions - List all permissions
  fastify.get('/', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Permissions'],
      summary: 'Get all permissions',
      description: 'List all permissions with optional filtering',
      querystring: adminQueryPermissionsSchema.querystring,
      security: [{ cookieAuth: [] }],
    },
    handler: listPermissions,
  });

  // GET /api/v1/admin/permissions/active - Get active permissions
  fastify.get('/active', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Permissions'],
      summary: 'Get active permissions',
      description: 'List all active permissions',
      security: [{ cookieAuth: [] }],
    },
    handler: getActivePermissions,
  });

  // GET /api/v1/admin/permissions/grouped - Get permissions grouped by category
  fastify.get('/grouped', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Permissions'],
      summary: 'Get permissions grouped by category',
      description: 'List all permissions grouped by their category',
      security: [{ cookieAuth: [] }],
    },
    handler: getPermissionsGrouped,
  });

  // GET /api/v1/admin/permissions/categories - Get permission categories
  fastify.get('/categories', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Permissions'],
      summary: 'Get permission categories',
      description: 'List all available permission categories',
      security: [{ cookieAuth: [] }],
    },
    handler: getPermissionCategories,
  });

  // GET /api/v1/admin/permissions/:id - Get permission by ID
  fastify.get('/:id', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Permissions'],
      summary: 'Get permission by ID',
      description: 'Get a specific permission by its ID',
      params: adminGetPermissionByIdSchema.params,
      security: [{ cookieAuth: [] }],
    },
    handler: getPermissionById,
  });

  // POST /api/v1/admin/permissions - Create new permission
  fastify.post('/', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Permissions'],
      summary: 'Create new permission',
      description: 'Create a new permission',
      body: adminCreatePermissionSchema.body,
      security: [{ cookieAuth: [] }],
    },
    handler: createPermission,
  });

  // PATCH /api/v1/admin/permissions/:id - Update permission
  fastify.patch('/:id', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Permissions'],
      summary: 'Update permission',
      description: 'Update an existing permission',
      params: adminUpdatePermissionSchema.params,
      body: adminUpdatePermissionSchema.body,
      security: [{ cookieAuth: [] }],
    },
    handler: updatePermission,
  });

  // PATCH /api/v1/admin/permissions/:id/toggle - Toggle permission status
  fastify.patch('/:id/toggle', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Permissions'],
      summary: 'Toggle permission status',
      description: 'Activate or deactivate a permission',
      params: adminDeletePermissionSchema.params,
      body: {
        type: 'object',
        properties: {
          isActive: { type: 'boolean' },
        },
        required: ['isActive'],
      } as const,
      security: [{ cookieAuth: [] }],
    },
    handler: togglePermissionStatus,
  });

  // DELETE /api/v1/admin/permissions/:id - Delete permission
  fastify.delete('/:id', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Permissions'],
      summary: 'Delete permission',
      description: 'Soft delete a permission (sets isActive to false)',
      params: adminDeletePermissionSchema.params,
      security: [{ cookieAuth: [] }],
    },
    handler: deletePermission,
  });
}
