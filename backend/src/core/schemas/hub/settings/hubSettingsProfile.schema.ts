/**
 * Hub Settings Profile Schema
 * Simple schema for updating hub business profile from settings page
 */

/**
 * Update hub settings profile schema
 */
export const hubUpdateSettingsProfileBodySchema = {
  body: {
    type: 'object',
    properties: {
      hubId: {
        type: 'string',
        description: 'Hub ID to update (for users with multiple hubs)',
      },
      name: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
        description: 'Business name',
      },
      description: {
        type: 'string',
        maxLength: 1000,
        description: 'Business description',
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'Business email',
      },
      phoneNumber: {
        type: 'string',
        description: 'Business phone number',
      },
      website: {
        type: 'string',
        description: 'Business website URL',
      },
      address: {
        type: 'string',
        description: 'Business address',
      },
      logo: {
        type: 'string',
        format: 'uri',
        description: 'Business logo URL',
      },
      coverImage: {
        type: 'string',
        format: 'uri',
        description: 'Business cover image URL',
      },
    },
  },
} as const;

/**
 * TypeScript interface for update settings profile input
 */
export interface HubUpdateSettingsProfileInput {
  hubId?: string;
  name?: string;
  description?: string;
  email?: string;
  phoneNumber?: string;
  website?: string;
  address?: string;
  logo?: string;
  coverImage?: string;
}
