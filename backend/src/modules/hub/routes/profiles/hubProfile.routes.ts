import { createHubProfile, getMyHubProfile, publishHub, updateHubProfile } from '@controllers/hub';
import { requireAuth } from '@core/middlewares/auth.middleware';
import { hubCreateHubProfileBodySchema, hubUpdateHubProfileBodySchema } from '@schemas/hub';
import type { FastifyInstance } from 'fastify';

/**
 * Hub Profile routes - Initial profile creation from /hub-onboard/form
 */
export async function hubProfileRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Get my hub profile
   */
  fastify.get('/me', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Profile'],
      summary: 'Get my hub profile',
      description:
        'Get current user hub profile with optional subscription data. If hubId is provided, gets that specific hub.',
      querystring: {
        type: 'object',
        properties: {
          hubId: {
            type: 'string',
            description: 'Specific hub ID to fetch (for users with multiple hubs)',
          },
          includeSubscription: {
            type: 'string',
            enum: ['true', 'false'],
            description: 'Include subscription data in response',
          },
          includeUserFields: {
            type: 'string',
            enum: ['true', 'false'],
            description:
              'Include user fields (professionalTitle, employment, education, etc.) in response',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    handler: getMyHubProfile,
  });

  /**
   * Create initial hub profile
   */
  fastify.post('/', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Profile'],
      summary: 'Create hub profile',
      description: 'Create initial hub profile from /hub-onboard/form page',
      body: hubCreateHubProfileBodySchema.body,
      security: [{ bearerAuth: [] }],
    },
    handler: createHubProfile,
  });

  /**
   * Update hub profile (upsert)
   * Supports updating both Hub and User fields based on subscription plan
   */
  fastify.patch('/', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Profile'],
      summary: 'Update hub profile',
      description:
        'Update hub profile (creates if does not exist - upsert behavior). Updates both Hub and User fields. Scale-specific fields only saved if user has Scale plan.',
      body: hubUpdateHubProfileBodySchema.body,
      security: [{ bearerAuth: [] }],
    },
    handler: updateHubProfile,
  });

  /**
   * Publish hub for approval
   */
  fastify.post('/publish', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Profile'],
      summary: 'Publish hub for approval',
      description:
        "Submit hub for approval after completing all onboarding steps. Validates required fields based on user's subscription plan (Scale vs Soar).",
      security: [{ bearerAuth: [] }],
    },
    handler: publishHub,
  });
}
