/**
 * Admin reference data schemas - Native JSON Schema
 * Similar to web reference data but for admin use
 */

const objectIdPattern = '^[a-f\\d]{24}$';

/**
 * Base reference data schemas
 */

// Create schema (name + optional description)
export const adminCreateReferenceDataSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Name',
      },
      description: {
        type: 'string',
        maxLength: 500,
        description: 'Description',
      },
      priority: {
        type: 'number',
        minimum: 0,
        description: 'Priority',
      },
    },
  },
} as const;

// Create schema (name only - for simple collections)
export const adminCreateSimpleReferenceDataSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Name',
      },
      priority: {
        type: 'number',
        minimum: 0,
        description: 'Priority',
      },
    },
  },
} as const;

// Update schema (name + optional description)
export const adminUpdateReferenceDataSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Reference data ID',
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
        description: 'Name',
      },
      description: {
        type: 'string',
        maxLength: 500,
        description: 'Description',
      },
      isActive: {
        type: 'boolean',
        description: 'Active status',
      },
      priority: {
        type: 'number',
        minimum: 0,
        description: 'Priority',
      },
    },
  },
} as const;

// Update schema (name only)
export const adminUpdateSimpleReferenceDataSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Reference data ID',
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
        description: 'Name',
      },
      isActive: {
        type: 'boolean',
        description: 'Active status',
      },
      priority: {
        type: 'number',
        minimum: 0,
        description: 'Priority',
      },
    },
  },
} as const;

// Delete/Get by ID schema
export const adminReferenceDataIdSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Reference data ID',
      },
    },
  },
} as const;

/**
 * FocusArea-specific schemas (has icon field)
 */
export const adminCreateFocusAreaSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Name',
      },
      icon: {
        type: 'string',
        maxLength: 50,
        description: 'Icon identifier',
      },
      description: {
        type: 'string',
        maxLength: 500,
        description: 'Description',
      },
      priority: {
        type: 'number',
        minimum: 0,
        description: 'Priority',
      },
    },
  },
} as const;

export const adminUpdateFocusAreaSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Focus area ID',
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
        description: 'Name',
      },
      icon: {
        type: 'string',
        maxLength: 50,
        description: 'Icon identifier',
      },
      description: {
        type: 'string',
        maxLength: 500,
        description: 'Description',
      },
      isActive: {
        type: 'boolean',
        description: 'Active status',
      },
      priority: {
        type: 'number',
        minimum: 0,
        description: 'Priority',
      },
    },
  },
} as const;

/**
 * Skill-specific schemas (has focusAreaId and type fields)
 */
export const adminCreateSkillSchema = {
  body: {
    type: 'object',
    required: ['name', 'focusAreaId'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Name',
      },
      focusAreaId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Focus Area ObjectId',
      },
      type: {
        type: 'string',
        enum: ['primary', 'additional'],
        description: 'Skill type',
      },
      priority: {
        type: 'number',
        minimum: 0,
        description: 'Priority',
      },
    },
  },
} as const;

export const adminUpdateSkillSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Skill ID',
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
        description: 'Name',
      },
      focusAreaId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Focus Area ObjectId',
      },
      type: {
        type: 'string',
        enum: ['primary', 'additional'],
        description: 'Skill type',
      },
      isActive: {
        type: 'boolean',
        description: 'Active status',
      },
      priority: {
        type: 'number',
        minimum: 0,
        description: 'Priority',
      },
    },
  },
} as const;

/**
 * Language-specific schemas (has code field)
 */
export const adminCreateLanguageSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Name',
      },
      code: {
        type: 'string',
        minLength: 2,
        maxLength: 2,
        description: 'Language code (2 characters, uppercase)',
      },
      priority: {
        type: 'number',
        minimum: 0,
        description: 'Priority',
      },
    },
  },
} as const;

export const adminUpdateLanguageSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Language ID',
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
        description: 'Name',
      },
      code: {
        type: 'string',
        minLength: 2,
        maxLength: 2,
        description: 'Language code (2 characters, uppercase)',
      },
      isActive: {
        type: 'boolean',
        description: 'Active status',
      },
      priority: {
        type: 'number',
        minimum: 0,
        description: 'Priority',
      },
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface AdminCreateReferenceDataInput {
  name: string;
  description?: string;
  priority?: number;
}

export interface AdminCreateSimpleReferenceDataInput {
  name: string;
  priority?: number;
}

export interface AdminUpdateReferenceDataInput {
  name?: string;
  description?: string;
  isActive?: boolean;
  priority?: number;
}

export interface AdminUpdateSimpleReferenceDataInput {
  name?: string;
  isActive?: boolean;
  priority?: number;
}

export interface AdminCreateFocusAreaInput {
  name: string;
  icon?: string;
  description?: string;
  priority?: number;
}

export interface AdminUpdateFocusAreaInput {
  name?: string;
  icon?: string;
  description?: string;
  isActive?: boolean;
  priority?: number;
}

export interface AdminCreateSkillInput {
  name: string;
  focusAreaId: string;
  type?: 'primary' | 'additional';
  priority?: number;
}

export interface AdminUpdateSkillInput {
  name?: string;
  focusAreaId?: string;
  type?: 'primary' | 'additional';
  isActive?: boolean;
  priority?: number;
}

export interface AdminCreateLanguageInput {
  name: string;
  code?: string;
  priority?: number;
}

export interface AdminUpdateLanguageInput {
  name?: string;
  code?: string;
  isActive?: boolean;
  priority?: number;
}
