import { requireAuth } from '@core/middlewares/auth.middleware';
import type { FastifyInstance } from 'fastify';
import {
  checkUsernameController,
  getMyProfileController,
  updateMyProfileController,
} from '../../controllers/profiles/userProfile.controller';

/**
 * User profile routes
 * Handles learner profile operations for onboarding
 */
export async function userProfileRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Check username availability
   * Can be called with or without authentication
   */
  fastify.get('/check-username', {
    schema: {
      tags: ['Users'],
      summary: 'Check username availability',
      description:
        'Check if a username is available. If authenticated, excludes current user from check.',
      querystring: {
        type: 'object',
        required: ['username'],
        properties: {
          username: {
            type: 'string',
            minLength: 6,
            maxLength: 30,
            description: 'Username to check (alphanumeric, underscores, hyphens only)',
          },
        },
      },
    },
    handler: checkUsernameController,
  });

  /**
   * Get current user profile
   */
  fastify.get('/me/profile', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Users'],
      summary: 'Get my profile',
      description: 'Get current authenticated user profile',
      security: [{ bearerAuth: [] }],
    },
    handler: getMyProfileController,
  });

  /**
   * Update learner profile
   */
  fastify.put('/me/profile', {
    preHandler: [requireAuth],
    schema: {
      tags: ['Users'],
      summary: 'Update my profile',
      description: 'Update current user profile (learner onboarding)',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 100,
          },
          username: {
            type: 'string',
            minLength: 6,
            maxLength: 30,
            pattern: '^[a-zA-Z0-9_-]+$',
          },
          profilePhoto: {
            type: 'string',
          },
          coverPhoto: {
            type: 'string',
          },
          phoneNumber: {
            type: 'string',
          },
          bio: {
            type: 'string',
            maxLength: 500,
          },
          location: {
            type: 'object',
            properties: {
              city: { type: 'string' },
              country: { type: 'string' },
              lat: { type: 'number' },
              lng: { type: 'number' },
            },
          },
          socialLinks: {
            type: 'object',
            properties: {
              website: { type: 'string' },
              facebook: { type: 'string' },
              instagram: { type: 'string' },
              twitter: { type: 'string' },
              linkedin: { type: 'string' },
            },
          },
        },
      },
    },
    handler: updateMyProfileController,
  });
}
