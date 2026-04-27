/**
 * Admin bank schemas - Native JSON Schema
 * Note: Transform for isActive, page, limit handled in controller
 */

const objectIdPattern = '^[a-f\\d]{24}$';

/**
 * Bank-specific schemas
 */
export const adminCreateBankSchema = {
  body: {
    type: 'object',
    required: ['name', 'countryCode'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Bank name',
      },
      routingNumber: {
        type: 'string',
        maxLength: 11,
        description: 'Routing/SWIFT code (uppercase)',
      },
      logoUrl: {
        type: 'string',
        format: 'uri',
        description: 'Bank logo URL',
      },
      countryCode: {
        type: 'string',
        minLength: 2,
        maxLength: 2,
        description: 'ISO country code (2 characters, uppercase)',
      },
      priority: {
        type: 'number',
        minimum: 0,
        description: 'Priority',
      },
    },
  },
} as const;

export const adminUpdateBankSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Bank ID',
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
        description: 'Bank name',
      },
      routingNumber: {
        type: 'string',
        maxLength: 11,
        description: 'Routing/SWIFT code (uppercase)',
      },
      logoUrl: {
        type: 'string',
        format: 'uri',
        description: 'Bank logo URL',
      },
      countryCode: {
        type: 'string',
        minLength: 2,
        maxLength: 2,
        description: 'ISO country code (2 characters, uppercase)',
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

export const adminBankIdSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Bank ID',
      },
    },
  },
} as const;

export const adminBankCountryCodeSchema = {
  params: {
    type: 'object',
    required: ['countryCode'],
    properties: {
      countryCode: {
        type: 'string',
        minLength: 2,
        maxLength: 2,
        description: 'ISO country code (2 characters, uppercase)',
      },
    },
  },
} as const;

export const adminListBanksQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      countryCode: {
        type: 'string',
        minLength: 2,
        maxLength: 2,
        description: 'Country code filter (uppercase)',
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
        default: 100,
        description: 'Items per page',
      },
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface AdminCreateBankInput {
  name: string;
  routingNumber?: string;
  logoUrl?: string;
  countryCode: string;
  priority?: number;
}

export interface AdminUpdateBankInput {
  name?: string;
  routingNumber?: string;
  logoUrl?: string;
  countryCode?: string;
  isActive?: boolean;
  priority?: number;
}
