/**
 * Experience topic schemas - Native JSON Schema
 * Note: Transform for isActive, page, limit handled in controller
 */

/**
 * Create Experience Topic Schema
 */
export const adminCreateExperienceTopicSchema = {
  body: {
    type: 'object',
    required: ['name', 'parentCategory'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Topic name',
      },
      parentCategory: {
        type: 'string',
        minLength: 1,
        description: 'Parent theme ID',
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
 * Update Experience Topic Schema
 */
export const adminUpdateExperienceTopicSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        minLength: 1,
        description: 'Topic ID',
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
        description: 'Topic name',
      },
      parentCategory: {
        type: 'string',
        minLength: 1,
        description: 'Parent theme ID',
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
 * Get Experience Topic by ID Schema
 */
export const adminGetExperienceTopicByIdSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        minLength: 1,
        description: 'Topic ID',
      },
    },
  },
} as const;

/**
 * List Experience Topics Query Schema
 * Note: Transform for isActive, page, limit handled in controller
 */
export const adminListExperienceTopicsQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      themeId: {
        type: 'string',
        description: 'Theme ID filter',
      },
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
export interface AdminCreateExperienceTopicInput {
  name: string;
  parentCategory: string;
  isActive?: boolean;
  priority?: number;
}

export interface AdminUpdateExperienceTopicInput {
  name?: string;
  parentCategory?: string;
  isActive?: boolean;
  priority?: number;
}

export interface AdminListExperienceTopicsQuery {
  themeId?: string;
  isActive?: string; // Will be transformed to boolean
  page?: number;
  limit?: number;
}
