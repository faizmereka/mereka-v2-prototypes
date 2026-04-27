/**
 * Target audience schemas - Native JSON Schema
 * Note: Transform for isActive, page, limit handled in controller
 */

/**
 * Create Target Audience Schema
 */
export const adminCreateTargetAudienceSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Audience name',
      },
      description: {
        type: 'string',
        description: 'Audience description',
      },
      isActive: {
        type: 'boolean',
        default: true,
        description: 'Active status',
      },
      priority: {
        type: 'number',
        default: 0,
        description: 'Priority',
      },
    },
  },
} as const;

/**
 * Update Target Audience Schema
 */
export const adminUpdateTargetAudienceSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        minLength: 1,
        description: 'Audience ID',
      },
    },
  },
  body: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Audience name',
      },
      description: {
        type: 'string',
        description: 'Audience description',
      },
      isActive: {
        type: 'boolean',
        description: 'Active status',
      },
      priority: {
        type: 'number',
        description: 'Priority',
      },
    },
  },
} as const;

/**
 * Get Target Audience by ID Schema
 */
export const adminGetTargetAudienceByIdSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        minLength: 1,
        description: 'Audience ID',
      },
    },
  },
} as const;

/**
 * List Target Audiences Query Schema
 * Note: Transform for isActive, page, limit handled in controller
 */
export const adminListTargetAudiencesQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      isActive: {
        type: 'string',
        enum: ['true', 'false'],
        description: 'Active status filter (will be transformed to boolean)',
      },
      page: {
        type: 'number',
        minimum: 1,
        default: 1,
        description: 'Page number',
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 100,
        description: 'Items per page',
      },
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface AdminCreateTargetAudienceInput {
  name: string;
  description?: string;
  isActive?: boolean;
  priority?: number;
}

export interface AdminUpdateTargetAudienceInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  priority?: number;
}

export interface AdminListTargetAudiencesQuery {
  isActive?: string; // Will be transformed to boolean
  page?: number;
  limit?: number;
}
