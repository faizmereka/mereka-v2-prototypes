import {
  createRole,
  deleteRole,
  getActiveRoles,
  getRoleById,
  getRolesByHub,
  getSystemRoles,
  listRoles,
  toggleRoleStatus,
  updateRole,
} from '@controllers/admin';
import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import {
  adminCreateRoleSchema,
  adminDeleteRoleSchema,
  adminGetRoleByIdSchema,
  adminQueryRolesSchema,
  adminUpdateRoleSchema,
} from '@schemas/admin';
import type { FastifyInstance } from 'fastify';

/**
 * Admin Role Routes
 * All routes require admin authentication
 */
export async function adminRoleRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/admin/roles - List all roles
  fastify.get('/', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Roles'],
      summary: 'Get all roles',
      description: 'List all roles with optional filtering',
      querystring: adminQueryRolesSchema.querystring,
      security: [{ cookieAuth: [] }],
    },
    handler: listRoles,
  });

  // GET /api/v1/admin/roles/active - Get active roles
  fastify.get('/active', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Roles'],
      summary: 'Get active roles',
      description: 'List all active roles',
      security: [{ cookieAuth: [] }],
    },
    handler: getActiveRoles,
  });

  // GET /api/v1/admin/roles/system - Get system roles
  fastify.get('/system', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Roles'],
      summary: 'Get system roles',
      description: 'List all system (built-in) roles',
      security: [{ cookieAuth: [] }],
    },
    handler: getSystemRoles,
  });

  // GET /api/v1/admin/roles/hub/:hubId - Get roles by hub
  fastify.get('/hub/:hubId', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Roles'],
      summary: 'Get roles by hub',
      description: 'List all roles for a specific hub (includes system roles)',
      params: {
        type: 'object',
        properties: {
          hubId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
        },
        required: ['hubId'],
      },
      security: [{ cookieAuth: [] }],
    },
    handler: getRolesByHub,
  });

  // GET /api/v1/admin/roles/:id - Get role by ID
  fastify.get('/:id', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Roles'],
      summary: 'Get role by ID',
      description: 'Get a specific role by its ID',
      params: adminGetRoleByIdSchema.params,
      security: [{ cookieAuth: [] }],
    },
    handler: getRoleById,
  });

  // POST /api/v1/admin/roles - Create new role
  fastify.post('/', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Roles'],
      summary: 'Create new role',
      description: 'Create a new role with specified permissions',
      body: adminCreateRoleSchema.body,
      security: [{ cookieAuth: [] }],
    },
    handler: createRole,
  });

  // PATCH /api/v1/admin/roles/:id - Update role
  fastify.patch('/:id', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Roles'],
      summary: 'Update role',
      description: 'Update an existing role',
      params: adminUpdateRoleSchema.params,
      body: adminUpdateRoleSchema.body,
      security: [{ cookieAuth: [] }],
    },
    handler: updateRole,
  });

  // PATCH /api/v1/admin/roles/:id/toggle - Toggle role status
  fastify.patch('/:id/toggle', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Roles'],
      summary: 'Toggle role status',
      description: 'Activate or deactivate a role',
      params: adminDeleteRoleSchema.params,
      body: {
        type: 'object',
        properties: {
          isActive: { type: 'boolean' },
        },
        required: ['isActive'],
      },
      security: [{ cookieAuth: [] }],
    },
    handler: toggleRoleStatus,
  });

  // DELETE /api/v1/admin/roles/:id - Delete role
  fastify.delete('/:id', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Roles'],
      summary: 'Delete role',
      description: 'Soft delete a role (sets isActive to false)',
      params: adminDeleteRoleSchema.params,
      security: [{ cookieAuth: [] }],
    },
    handler: deleteRole,
  });
}
