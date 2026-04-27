import { PermissionCategory } from '@core/models/Permission';

/**
 * Create permission schema
 */
export const adminCreatePermissionSchema = {
  body: {
    type: 'object',
    required: ['key', 'name', 'category'],
    properties: {
      key: {
        type: 'string',
        minLength: 3,
        maxLength: 100,
        pattern: '^[a-z][a-zA-Z0-9]*$',
      },
      name: { type: 'string', minLength: 2, maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
      category: { type: 'string', enum: Object.values(PermissionCategory) },
      isActive: { type: 'boolean', default: true },
    },
  },
} as const;

/**
 * Update permission schema
 */
export const adminUpdatePermissionSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
    },
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100 },
      description: { type: 'string', maxLength: 500 },
      category: { type: 'string', enum: Object.values(PermissionCategory) },
      isActive: { type: 'boolean' },
    },
  },
} as const;

/**
 * Get permission by ID schema
 */
export const adminGetPermissionByIdSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
    },
  },
} as const;

/**
 * Delete permission schema
 */
export const adminDeletePermissionSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
    },
  },
} as const;

/**
 * Query permissions schema
 */
export const adminQueryPermissionsSchema = {
  querystring: {
    type: 'object',
    properties: {
      category: { type: 'string', enum: Object.values(PermissionCategory) },
      isActive: { type: 'string', enum: ['true', 'false'] },
      search: { type: 'string' },
    },
  },
} as const;

/**
 * Type exports
 */
export interface AdminCreatePermissionInput {
  key: string;
  name: string;
  description?: string;
  category: PermissionCategory;
  isActive?: boolean;
}

export interface AdminUpdatePermissionInput {
  params: { id: string };
  body: {
    name?: string;
    description?: string;
    category?: PermissionCategory;
    isActive?: boolean;
  };
}

export interface AdminGetPermissionByIdInput {
  id: string;
}

export interface AdminDeletePermissionInput {
  id: string;
}

export interface AdminQueryPermissionsInput {
  category?: PermissionCategory;
  isActive?: string;
  search?: string;
}
