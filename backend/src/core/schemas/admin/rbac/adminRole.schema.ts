import { RoleScope } from '@core/models/Role';

/**
 * Admin role schemas - Native JSON Schema
 * Note: Transform for isActive handled in controller
 */

const objectIdPattern = '^[0-9a-fA-F]{24}$';

/**
 * Create role schema
 */
export const adminCreateRoleSchema = {
  body: {
    type: 'object',
    required: ['key', 'name', 'permissionIds'],
    properties: {
      key: {
        type: 'string',
        minLength: 3,
        maxLength: 100,
        pattern: '^[a-z][a-z0-9-]*$',
        description:
          'Role key (must start with lowercase letter and contain only lowercase letters, numbers, and hyphens)',
      },
      name: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        description: 'Role name',
      },
      description: {
        type: 'string',
        maxLength: 500,
        description: 'Role description',
      },
      permissionIds: {
        type: 'array',
        items: {
          type: 'string',
          pattern: objectIdPattern,
        },
        minItems: 0,
        description: 'Array of permission IDs',
      },
      scope: {
        type: 'string',
        enum: Object.values(RoleScope),
        default: RoleScope.HUB,
        description: 'Role scope',
      },
      hubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Hub ID (required if scope=HUB)',
      },
    },
  },
} as const;

/**
 * Update role schema
 */
export const adminUpdateRoleSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Role ID',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        description: 'Role name',
      },
      description: {
        type: 'string',
        maxLength: 500,
        description: 'Role description',
      },
      permissionIds: {
        type: 'array',
        items: {
          type: 'string',
          pattern: objectIdPattern,
        },
        description: 'Array of permission IDs',
      },
      isActive: {
        type: 'boolean',
        description: 'Active status',
      },
    },
  },
} as const;

/**
 * Get role by ID schema
 */
export const adminGetRoleByIdSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Role ID',
      },
    },
  },
} as const;

/**
 * Delete role schema
 */
export const adminDeleteRoleSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Role ID',
      },
    },
  },
} as const;

/**
 * Query roles schema
 * Note: Transform for isActive handled in controller
 */
export const adminQueryRolesSchema = {
  querystring: {
    type: 'object',
    properties: {
      scope: {
        type: 'string',
        enum: Object.values(RoleScope),
        description: 'Role scope filter',
      },
      hubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Hub ID filter',
      },
      isActive: {
        type: 'string',
        enum: ['true', 'false'],
        description: 'Active status filter (will be transformed to boolean)',
      },
      search: {
        type: 'string',
        description: 'Search query',
      },
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface AdminCreateRoleInput {
  key: string;
  name: string;
  description?: string;
  permissionIds: string[];
  scope?: RoleScope;
  hubId?: string;
}

export interface AdminUpdateRoleInput {
  params: {
    id: string;
  };
  body: {
    name?: string;
    description?: string;
    permissionIds?: string[];
    isActive?: boolean;
  };
}

export interface AdminGetRoleByIdInput {
  id: string;
}

export interface AdminDeleteRoleInput {
  id: string;
}

export interface AdminQueryRolesInput {
  scope?: RoleScope;
  hubId?: string;
  isActive?: string; // Will be transformed to boolean
  search?: string;
}
