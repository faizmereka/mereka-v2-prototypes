/**
 * Experience theme schemas - Native JSON Schema
 * Note: Transform for isActive, page, limit handled in controller
 */

/**
 * Create Experience Theme Schema
 */
export const adminCreateExperienceThemeSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Theme name',
      },
      description: {
        type: 'string',
        description: 'Theme description',
      },
      icon: {
        type: 'string',
        description: 'Icon identifier',
      },
      isActive: {
        type: 'boolean',
        default: true,
        description: 'Active status',
      },
      count: {
        type: 'number',
        minimum: 0,
        default: 0,
        description: 'Experience count',
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
 * Update Experience Theme Schema
 */
export const adminUpdateExperienceThemeSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        minLength: 1,
        description: 'Theme ID',
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
        description: 'Theme name',
      },
      description: {
        type: 'string',
        description: 'Theme description',
      },
      icon: {
        type: 'string',
        description: 'Icon identifier',
      },
      isActive: {
        type: 'boolean',
        description: 'Active status',
      },
      count: {
        type: 'number',
        minimum: 0,
        description: 'Experience count',
      },
      priority: {
        type: 'number',
        description: 'Priority',
      },
    },
  },
} as const;

/**
 * Get Experience Theme by ID Schema
 */
export const adminGetExperienceThemeByIdSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        minLength: 1,
        description: 'Theme ID',
      },
    },
  },
} as const;

/**
 * List Experience Themes Query Schema
 * Note: Transform for isActive, page, limit handled in controller
 */
export const adminListExperienceThemesQuerySchema = {
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
        default: 20,
        description: 'Items per page',
      },
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface AdminCreateExperienceThemeInput {
  name: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  count?: number;
  priority?: number;
}

export interface AdminUpdateExperienceThemeInput {
  name?: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  count?: number;
  priority?: number;
}

export interface AdminListExperienceThemesQuery {
  isActive?: string; // Will be transformed to boolean
  page?: number;
  limit?: number;
}
