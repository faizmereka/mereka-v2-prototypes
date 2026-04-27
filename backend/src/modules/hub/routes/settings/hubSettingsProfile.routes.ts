import { getHubSettingsProfileHandler, updateHubSettingsProfileHandler } from '@controllers/hub';
import { requireAuth } from '@core/middlewares/auth.middleware';
import { hubUpdateSettingsProfileBodySchema } from '@core/schemas/hub/settings';
import type { FastifyInstance } from 'fastify';

/**
 * Hub Settings Profile routes
 * Endpoints for managing hub business profile from settings page
 * Base path: /hub/:hubId/settings/profile
 */
export async function hubSettingsProfileRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Get hub settings profile
   */
  fastify.get('/', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Settings'],
      summary: 'Get hub settings profile',
      description: 'Get hub business profile information for settings page',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: {
            type: 'string',
            description: 'Hub ID',
          },
        },
      },
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                email: { type: 'string' },
                phoneNumber: { type: 'string' },
                website: { type: 'string' },
                address: { type: 'string' },
                logo: { type: 'string' },
                coverImage: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: getHubSettingsProfileHandler,
  });

  /**
   * Update hub settings profile
   */
  fastify.patch('/', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Hub Settings'],
      summary: 'Update hub settings profile',
      description: 'Update hub business profile information from settings page',
      params: {
        type: 'object',
        required: ['hubId'],
        properties: {
          hubId: {
            type: 'string',
            description: 'Hub ID',
          },
        },
      },
      body: hubUpdateSettingsProfileBodySchema.body,
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                email: { type: 'string' },
                phoneNumber: { type: 'string' },
                website: { type: 'string' },
                address: { type: 'string' },
                logo: { type: 'string' },
                coverImage: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: updateHubSettingsProfileHandler,
  });
}
