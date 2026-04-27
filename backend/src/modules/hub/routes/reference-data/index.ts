import type { FastifyInstance } from 'fastify';
import {
  getAmenities,
  getCompanyTypes,
  getExperienceThemes,
  getExperienceTopics,
  getExperienceTypes,
  getFacilities,
  getFocusAreas,
  getJobCategories,
  getJobPreferences,
  getLanguages,
  getSkills,
  getSpaceTypes,
  getTargetAudiences,
} from '../../controllers/reference-data';

const includeInactiveQuerySchema = {
  type: 'object',
  properties: {
    includeInactive: { type: 'string', enum: ['true', 'false'] },
  },
} as const;

/**
 * Hub Reference Data Routes - GET only for onboarding forms
 */
export async function hubReferenceDataRoutes(fastify: FastifyInstance): Promise<void> {
  // Job Categories (for job posting wizard)
  fastify.get('/job-categories', {
    schema: {
      tags: ['Reference Data'],
      summary: 'Get all job categories with service types',
    },
    handler: getJobCategories,
  });

  // Focus Areas
  fastify.get('/focus-areas', {
    schema: {
      tags: ['Reference Data'],
      summary: 'Get all focus areas',
      querystring: includeInactiveQuerySchema,
    },
    handler: getFocusAreas,
  });

  // Company Types
  fastify.get('/company-types', {
    schema: {
      tags: ['Reference Data'],
      summary: 'Get all company types',
      querystring: includeInactiveQuerySchema,
    },
    handler: getCompanyTypes,
  });

  // Experience Types
  fastify.get('/experience-types', {
    schema: {
      tags: ['Reference Data'],
      summary: 'Get all experience types',
      querystring: includeInactiveQuerySchema,
    },
    handler: getExperienceTypes,
  });

  // Experience Themes
  fastify.get('/experience-themes', {
    schema: {
      tags: ['Reference Data'],
      summary: 'Get all experience themes',
      querystring: includeInactiveQuerySchema,
    },
    handler: getExperienceThemes,
  });

  // Experience Topics
  fastify.get('/experience-topics', {
    schema: {
      tags: ['Reference Data'],
      summary: 'Get all experience topics',
      querystring: includeInactiveQuerySchema,
    },
    handler: getExperienceTopics,
  });

  // Job Preferences
  fastify.get('/job-preferences', {
    schema: {
      tags: ['Reference Data'],
      summary: 'Get all job preferences',
      querystring: includeInactiveQuerySchema,
    },
    handler: getJobPreferences,
  });

  // Amenities
  fastify.get('/amenities', {
    schema: {
      tags: ['Reference Data'],
      summary: 'Get all amenities',
      querystring: includeInactiveQuerySchema,
    },
    handler: getAmenities,
  });

  // Facilities
  fastify.get('/facilities', {
    schema: {
      tags: ['Reference Data'],
      summary: 'Get all facilities',
      querystring: includeInactiveQuerySchema,
    },
    handler: getFacilities,
  });

  // Skills
  fastify.get('/skills', {
    schema: {
      tags: ['Reference Data'],
      summary: 'Get all skills',
      querystring: includeInactiveQuerySchema,
    },
    handler: getSkills,
  });

  // Languages
  fastify.get('/languages', {
    schema: {
      tags: ['Reference Data'],
      summary: 'Get all languages',
      querystring: includeInactiveQuerySchema,
    },
    handler: getLanguages,
  });

  // Space Types
  fastify.get('/space-types', {
    schema: {
      tags: ['Reference Data'],
      summary: 'Get all space types',
      querystring: includeInactiveQuerySchema,
    },
    handler: getSpaceTypes,
  });

  // Target Audiences
  fastify.get('/target-audiences', {
    schema: {
      tags: ['Reference Data'],
      summary: 'Get all target audiences',
      querystring: includeInactiveQuerySchema,
    },
    handler: getTargetAudiences,
  });
}
