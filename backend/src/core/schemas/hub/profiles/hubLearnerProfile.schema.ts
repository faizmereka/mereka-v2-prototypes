/**
 * Hub Learner profile schemas - Native JSON Schema
 */

/**
 * Update learner profile schema
 */
export const hubUpdateLearnerProfileBodySchema = {
  body: {
    type: 'object',
    properties: {
      slug: {
        type: 'string',
        minLength: 3,
        maxLength: 50,
        pattern: '^[a-zA-Z][a-zA-Z0-9._-]*$',
        description: 'Username slug',
      },
      phoneNumber: {
        type: 'string',
        description: 'Phone number with country code',
      },
      bio: {
        type: 'string',
        maxLength: 1000,
        description: 'About me (max 1000 characters)',
      },
      coverPhoto: {
        type: 'string',
        format: 'uri',
        description: 'Cover photo URL',
      },
      location: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'City',
          },
          country: {
            type: 'string',
            description: 'Country',
          },
          lat: {
            type: 'number',
            description: 'Latitude',
          },
          lng: {
            type: 'number',
            description: 'Longitude',
          },
        },
        description: 'User location',
      },
      socialLinks: {
        type: 'object',
        properties: {
          website: {
            type: 'string',
            format: 'uri',
            description: 'Website URL',
          },
          facebook: {
            type: 'string',
            format: 'uri',
            description: 'Facebook URL',
          },
          instagram: {
            type: 'string',
            format: 'uri',
            description: 'Instagram URL',
          },
          twitter: {
            type: 'string',
            format: 'uri',
            description: 'Twitter URL',
          },
          linkedin: {
            type: 'string',
            format: 'uri',
            description: 'LinkedIn URL',
          },
        },
        description: 'Social media links',
      },
    },
  },
} as const;

/**
 * Check slug availability schema
 */
export const hubCheckSlugBodySchema = {
  body: {
    type: 'object',
    required: ['slug'],
    properties: {
      slug: {
        type: 'string',
        minLength: 3,
        maxLength: 50,
        pattern: '^[a-zA-Z][a-zA-Z0-9._-]*$',
        description:
          'Slug must start with letter and contain only letters, numbers, dots, underscores, hyphens',
      },
      resourceType: {
        type: 'string',
        enum: ['learner', 'experience', 'service', 'space', 'hub', 'expert'],
        default: 'learner',
        description: 'Type of resource',
      },
    },
  },
} as const;

/**
 * TypeScript type definitions
 */
export interface HubUpdateLearnerProfileInput {
  slug?: string;
  phoneNumber?: string;
  bio?: string;
  coverPhoto?: string;
  location?: {
    city?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  socialLinks?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
}

export interface HubCheckSlugInput {
  slug: string;
  resourceType?: 'learner' | 'experience' | 'service' | 'space' | 'hub' | 'expert';
}
