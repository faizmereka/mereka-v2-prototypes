/**
 * Slug validation schemas - Native JSON Schema
 */

/**
 * Check slug availability params schema
 */
export const checkSlugParamsSchema = {
  type: 'object',
  required: ['slug'],
  properties: {
    slug: {
      type: 'string',
      minLength: 3,
      maxLength: 100,
      description: 'Slug to check',
    },
  },
} as const;

/**
 * Check slug availability query schema
 */
export const checkSlugQuerySchema = {
  type: 'object',
  properties: {
    resourceType: {
      type: 'string',
      enum: ['learner', 'hub', 'experience', 'service', 'space', 'expert'],
      default: 'hub',
      description: 'Type of resource',
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface CheckSlugParams {
  slug: string;
}

export interface CheckSlugQuery {
  resourceType?: 'learner' | 'hub' | 'experience' | 'service' | 'space' | 'expert';
}
