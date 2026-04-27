import {
  checkExperienceSlugAvailability,
  createExperience,
  getExperienceById,
  getExperienceSessions,
  listHubExperiences,
  updateExperience,
} from '@controllers/hub';
import { PERMISSIONS } from '@core/constants';
import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  loadHubContext,
  requireHubAccess,
  requireHubPermission,
} from '@core/middlewares/hubPermission.middleware';
import { hubCreateExperienceSchema, hubUpdateExperienceSchema } from '@schemas/hub';
import type { FastifyInstance } from 'fastify';

/**
 * Hub Experience Routes
 */
export async function hubScopedExperienceRoutes(fastify: FastifyInstance): Promise<void> {
  // Common preHandlers for experience routes
  const experiencePreHandlers = [requireAuth, loadHubContext, requireHubAccess];

  // List Hub Experiences
  fastify.get('/', {
    schema: {
      tags: ['Experiences'],
      summary: 'List hub experiences',
      description: 'List all experiences for a hub with optional filters and pagination',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: {
            type: 'string',
            minLength: 24,
            maxLength: 24,
            description: 'Hub ID',
          },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by status',
          },
          listingType: {
            type: 'string',
            description: 'Filter by listing type',
          },
          page: {
            type: 'number',
            default: 1,
            description: 'Page number',
          },
          limit: {
            type: 'number',
            default: 20,
            description: 'Items per page',
          },
        },
      },
    },
    preHandler: [...experiencePreHandlers, requireHubPermission(PERMISSIONS.EXPERIENCE_VIEW)],
    handler: listHubExperiences,
  });

  // Create Experience
  fastify.post('/', {
    schema: {
      tags: ['Experiences'],
      summary: 'Create a new experience',
      description: 'Create a new experience/event with comprehensive details',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: {
            type: 'string',
            minLength: 24,
            maxLength: 24,
            description: 'Hub ID',
          },
        },
      },
      body: hubCreateExperienceSchema.body,
    },
    preHandler: [...experiencePreHandlers, requireHubPermission(PERMISSIONS.EXPERIENCE_EDIT)],
    handler: createExperience,
  });

  // Update Experience
  fastify.patch('/:id', {
    schema: {
      tags: ['Experiences'],
      summary: 'Update experience',
      description: 'Update an existing experience',
      params: hubUpdateExperienceSchema.params,
      body: hubUpdateExperienceSchema.body,
    },
    preHandler: [...experiencePreHandlers, requireHubPermission(PERMISSIONS.EXPERIENCE_EDIT)],
    handler: updateExperience,
  });

  // Get Experience Sessions/Events
  fastify.get('/:id/sessions', {
    schema: {
      tags: ['Experiences'],
      summary: 'Get experience sessions',
      description: 'Get all sessions/events for an experience with pagination and filtering',
      params: {
        type: 'object',
        required: ['hubId', 'id'],
        properties: {
          hubId: {
            type: 'string',
            minLength: 24,
            maxLength: 24,
            description: 'Hub ID',
          },
          id: {
            type: 'string',
            minLength: 24,
            maxLength: 24,
            description: 'Experience ID',
          },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            enum: ['all', 'upcoming', 'past'],
            default: 'all',
            description: 'Filter sessions by time',
          },
          page: {
            type: 'number',
            default: 1,
            description: 'Page number',
          },
          limit: {
            type: 'number',
            default: 20,
            description: 'Items per page',
          },
        },
      },
    },
    preHandler: [...experiencePreHandlers, requireHubPermission(PERMISSIONS.EXPERIENCE_VIEW)],
    handler: getExperienceSessions,
  });

  // Check Slug Availability (must come before /:id to avoid /check being captured)
  fastify.get('/check/slug', {
    schema: {
      tags: ['Experiences'],
      summary: 'Check slug availability',
      description: 'Check if a slug is available for use',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: {
            type: 'string',
            minLength: 24,
            maxLength: 24,
            description: 'Hub ID',
          },
        },
      },
      querystring: {
        type: 'object',
        required: ['slug'],
        properties: {
          slug: {
            type: 'string',
            minLength: 1,
            description: 'Slug to check',
          },
          excludeId: {
            type: 'string',
            description: 'Experience ID to exclude from check',
          },
        },
      },
    },
    preHandler: [...experiencePreHandlers, requireHubPermission(PERMISSIONS.EXPERIENCE_VIEW)],
    handler: checkExperienceSlugAvailability,
  });

  // Get Experience by ID or Slug
  fastify.get('/:id', {
    schema: {
      tags: ['Experiences'],
      summary: 'Get experience by ID or slug',
      description:
        'Retrieve a single experience by MongoDB ObjectId or slug. Automatically detects format. Includes experienceEvents and stats.',
      params: {
        type: 'object',
        required: ['hubId', 'id'],
        properties: {
          hubId: {
            type: 'string',
            minLength: 24,
            maxLength: 24,
            description: 'Hub ID',
          },
          id: {
            type: 'string',
            minLength: 1,
            description: 'Experience ID or slug',
          },
        },
      },
    },
    preHandler: [...experiencePreHandlers, requireHubPermission(PERMISSIONS.EXPERIENCE_VIEW)],
    handler: getExperienceById,
  });
}
