import {
  getAllPermissionKeys,
  getPermissionsByCategory,
  PERMISSION_CATEGORIES,
  PERMISSION_UI_CATEGORIES,
  PERMISSIONS,
  type PermissionCategoryKey,
  ROLE_PERMISSIONS,
} from '@core/constants';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Response schema for permissions endpoint
 */
const permissionsResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        permissions: {
          type: 'object',
          description: 'Map of permission constant names to permission keys',
          additionalProperties: { type: 'string' },
        },
        categories: {
          type: 'object',
          description: 'Map of category constant names to category keys',
          additionalProperties: { type: 'string' },
        },
        rolePermissions: {
          type: 'object',
          description: 'Map of role keys to arrays of permission keys',
          additionalProperties: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
  },
} as const;

/**
 * Response schema for permission categories (UI format)
 */
const permissionCategoriesResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          label: { type: 'string' },
          columns: {
            type: 'array',
            items: { type: 'string' },
          },
          rows: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                permissions: {
                  type: 'array',
                  items: { type: ['string', 'null'] },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * Permissions Routes
 *
 * Public endpoints for frontend to fetch permission definitions
 * These endpoints allow the frontend to stay in sync with backend permission constants
 */
export async function permissionsRoutes(fastify: FastifyInstance) {
  /**
   * GET /permissions
   *
   * Get all permission definitions, categories, and role mappings
   * This is the main endpoint for frontend to fetch all permission data
   */
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Permissions'],
        summary: 'Get all permission definitions',
        description:
          'Returns all permission keys, categories, and role-permission mappings. Used by frontend for permission checking and UI display.',
        response: {
          200: permissionsResponseSchema,
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        success: true,
        data: {
          permissions: PERMISSIONS,
          categories: PERMISSION_CATEGORIES,
          rolePermissions: ROLE_PERMISSIONS,
        },
      });
    },
  );

  /**
   * GET /permissions/categories
   *
   * Get permissions grouped by category in UI table format
   * This is used by the permission table component to render checkboxes
   */
  fastify.get(
    '/categories',
    {
      schema: {
        tags: ['Permissions'],
        summary: 'Get permission categories for UI display',
        description:
          'Returns permission categories formatted for UI permission table component with rows and columns.',
        response: {
          200: permissionCategoriesResponseSchema,
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        success: true,
        data: PERMISSION_UI_CATEGORIES,
      });
    },
  );

  /**
   * GET /permissions/keys
   *
   * Get all permission keys as a simple array
   * Useful for validation and autocomplete
   */
  fastify.get(
    '/keys',
    {
      schema: {
        tags: ['Permissions'],
        summary: 'Get all permission keys',
        description: 'Returns a flat array of all permission keys.',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        success: true,
        data: getAllPermissionKeys(),
      });
    },
  );

  /**
   * GET /permissions/category/:category
   *
   * Get permissions for a specific category
   */
  fastify.get<{ Params: { category: string } }>(
    '/category/:category',
    {
      schema: {
        tags: ['Permissions'],
        summary: 'Get permissions by category',
        description: 'Returns all permissions for a specific category.',
        params: {
          type: 'object',
          required: ['category'],
          properties: {
            category: {
              type: 'string',
              enum: Object.values(PERMISSION_CATEGORIES),
              description: 'Permission category key',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { category: string } }>, reply: FastifyReply) => {
      const { category } = request.params;

      // Validate category
      if (!Object.values(PERMISSION_CATEGORIES).includes(category as PermissionCategoryKey)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_CATEGORY',
            message: `Invalid category: ${category}. Valid categories: ${Object.values(PERMISSION_CATEGORIES).join(', ')}`,
          },
        });
      }

      const permissions = getPermissionsByCategory(category as PermissionCategoryKey);
      return reply.send({
        success: true,
        data: permissions,
      });
    },
  );

  /**
   * GET /permissions/role/:roleKey
   *
   * Get permissions for a specific role
   */
  fastify.get<{ Params: { roleKey: string } }>(
    '/role/:roleKey',
    {
      schema: {
        tags: ['Permissions'],
        summary: 'Get permissions by role',
        description: 'Returns all default permissions for a specific role.',
        params: {
          type: 'object',
          required: ['roleKey'],
          properties: {
            roleKey: {
              type: 'string',
              enum: Object.keys(ROLE_PERMISSIONS),
              description: 'Role key (owner, admin, expert, member, collaborator)',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { roleKey: string } }>, reply: FastifyReply) => {
      const { roleKey } = request.params;

      // Validate role key
      if (!(roleKey in ROLE_PERMISSIONS)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message: `Invalid role: ${roleKey}. Valid roles: ${Object.keys(ROLE_PERMISSIONS).join(', ')}`,
          },
        });
      }

      const permissions = ROLE_PERMISSIONS[roleKey as keyof typeof ROLE_PERMISSIONS];
      return reply.send({
        success: true,
        data: [...permissions],
      });
    },
  );
}
