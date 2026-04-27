/**
 * Hub roles schemas - Native JSON Schema
 */

const objectIdPattern = '^[0-9a-fA-F]{24}$';

/**
 * List hub roles schema
 */
export const hubListHubRolesSchema = {
  params: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: {
        type: 'string',
        pattern: objectIdPattern,
        description: 'Hub ID',
      },
    },
  },
} as const;

/**
 * TypeScript input definitions
 */
export interface HubListHubRolesInput {
  params: {
    hubId: string;
  };
}
