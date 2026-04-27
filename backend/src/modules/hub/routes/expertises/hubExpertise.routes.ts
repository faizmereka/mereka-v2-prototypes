import {
  archiveExpertise,
  deleteExpertise,
  getExpertiseById,
  getExpertiseSlots,
  publishExpertise,
  queryExpertises,
  upsertExpertise,
} from '@controllers/hub';
import { PERMISSIONS } from '@core/constants';
import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  loadHubContext,
  requireHubAccess,
  requireHubPermission,
} from '@core/middlewares/hubPermission.middleware';
import {
  hubDeleteExpertiseSchema,
  hubGetExpertiseByIdSchema,
  hubQueryExpertisesSchema,
  hubUpsertExpertiseSchema,
} from '@schemas/hub';
import type { FastifyInstance } from 'fastify';

// Common hubId param schema
const hubIdParamSchema = {
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
};

/**
 * Hub Expertise Routes
 * Handles expertise/service offering management
 */
export async function hubExpertiseRoutes(fastify: FastifyInstance) {
  // Common preHandlers for expertise routes
  const expertisePreHandlers = [requireAuth, loadHubContext, requireHubAccess];

  /**
   * Query Expertises
   */
  fastify.get('/', {
    schema: {
      tags: ['Expertises'],
      summary: 'Query expertises with filters',
      description: 'Retrieves a list of expertises for a hub with optional filters and pagination',
      params: hubIdParamSchema,
      querystring: hubQueryExpertisesSchema.querystring,
    },
    preHandler: [...expertisePreHandlers, requireHubPermission(PERMISSIONS.EXPERTISE_VIEW)],
    handler: queryExpertises,
  });

  /**
   * Create Expertise
   */
  fastify.post('/', {
    schema: {
      tags: ['Expertises'],
      summary: 'Create new expertise',
      description: 'Creates a new expertise/service offering',
      params: hubIdParamSchema,
      body: hubUpsertExpertiseSchema.body,
    },
    preHandler: [...expertisePreHandlers, requireHubPermission(PERMISSIONS.EXPERTISE_EDIT)],
    handler: upsertExpertise,
  });

  /**
   * Get Expertise by ID
   */
  fastify.get('/:id', {
    schema: {
      tags: ['Expertises'],
      summary: 'Get expertise by ID',
      description: 'Retrieves detailed information about a specific expertise',
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
          id: hubGetExpertiseByIdSchema.params.properties.id,
        },
      },
    },
    preHandler: [...expertisePreHandlers, requireHubPermission(PERMISSIONS.EXPERTISE_VIEW)],
    handler: getExpertiseById,
  });

  /**
   * Update Expertise by ID
   */
  fastify.put('/:id', {
    schema: {
      tags: ['Expertises'],
      summary: 'Update expertise',
      description: 'Updates an existing expertise by ID',
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
          id: hubUpsertExpertiseSchema.params.properties.id,
        },
      },
      body: hubUpsertExpertiseSchema.body,
    },
    preHandler: [...expertisePreHandlers, requireHubPermission(PERMISSIONS.EXPERTISE_EDIT)],
    handler: upsertExpertise,
  });

  /**
   * Delete Expertise by ID
   */
  fastify.delete('/:id', {
    schema: {
      tags: ['Expertises'],
      summary: 'Delete expertise',
      description: 'Deletes an expertise by ID',
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
          id: hubDeleteExpertiseSchema.params.properties.id,
        },
      },
    },
    preHandler: [...expertisePreHandlers, requireHubPermission(PERMISSIONS.EXPERTISE_EDIT)],
    handler: deleteExpertise,
  });

  /**
   * Publish Expertise
   */
  fastify.patch('/:id/publish', {
    schema: {
      tags: ['Expertises'],
      summary: 'Publish expertise',
      description: 'Changes expertise status to published',
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
          id: hubGetExpertiseByIdSchema.params.properties.id,
        },
      },
    },
    preHandler: [...expertisePreHandlers, requireHubPermission(PERMISSIONS.EXPERTISE_EDIT)],
    handler: publishExpertise,
  });

  /**
   * Archive Expertise
   */
  fastify.patch('/:id/archive', {
    schema: {
      tags: ['Expertises'],
      summary: 'Archive expertise',
      description: 'Changes expertise status to archived',
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
          id: hubGetExpertiseByIdSchema.params.properties.id,
        },
      },
    },
    preHandler: [...expertisePreHandlers, requireHubPermission(PERMISSIONS.EXPERTISE_EDIT)],
    handler: archiveExpertise,
  });

  /**
   * Get Expertise Slots
   * Returns available dates and time slots for booking
   */
  fastify.get('/:id/slots', {
    schema: {
      tags: ['Expertises'],
      summary: 'Get expertise available slots',
      description: 'Returns available dates and time slots for booking based on operating hours',
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
            description: 'Expertise ID',
          },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          ticketId: {
            type: 'string',
            description: 'Optional ticket ID to filter slots for',
          },
          daysAhead: {
            type: 'number',
            minimum: 1,
            maximum: 90,
            default: 30,
            description: 'Number of days ahead to generate slots for',
          },
        },
      },
    },
    preHandler: [...expertisePreHandlers, requireHubPermission(PERMISSIONS.EXPERTISE_VIEW)],
    handler: getExpertiseSlots,
  });
}
