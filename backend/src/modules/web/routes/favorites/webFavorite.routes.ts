import { requireAuth } from '@core/middlewares/auth.middleware';
import {
  addFavoriteSchema,
  checkFavoritesQuerySchema,
  checkFavoritesResponseSchema,
  listFavoritesQuerySchema,
  listFavoritesResponseSchema,
  removeFavoriteParamsSchema,
} from '@schemas/web';
import type { FastifyInstance, RouteHandlerMethod } from 'fastify';
import {
  addFavorite,
  checkFavorites,
  listFavorites,
  removeFavorite,
} from '../../controllers/favorites';

/**
 * Web Favorite Routes
 * All routes require authentication
 *
 * POST /favorites - Add a favorite
 * DELETE /favorites/:id - Remove a favorite
 * GET /favorites - List user's favorites
 * GET /favorites/check - Check if items are favorited
 */
export async function webFavoriteRoutes(fastify: FastifyInstance) {
  // Add a favorite
  fastify.post(
    '/',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Favorites'],
        summary: 'Add a favorite',
        description: 'Add an item (expert, hub, expertise, or experience) to favorites',
        security: [{ bearerAuth: [] }],
        body: addFavoriteSchema.body,
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  favoriteableType: { type: 'string' },
                  favoriteableId: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    addFavorite as RouteHandlerMethod,
  );

  // Remove a favorite
  fastify.delete(
    '/:id',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Favorites'],
        summary: 'Remove a favorite',
        description: 'Remove an item from favorites',
        security: [{ bearerAuth: [] }],
        params: removeFavoriteParamsSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    removeFavorite as RouteHandlerMethod,
  );

  // List user's favorites
  fastify.get(
    '/',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Favorites'],
        summary: 'List favorites',
        description: "Get user's favorites with optional type filter and pagination",
        security: [{ bearerAuth: [] }],
        querystring: listFavoritesQuerySchema,
        response: {
          200: listFavoritesResponseSchema,
        },
      },
    },
    listFavorites as RouteHandlerMethod,
  );

  // Check if items are favorited
  fastify.get(
    '/check',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Web - Favorites'],
        summary: 'Check favorites',
        description: 'Check if multiple items are favorited by the user',
        security: [{ bearerAuth: [] }],
        querystring: checkFavoritesQuerySchema,
        response: {
          200: checkFavoritesResponseSchema,
        },
      },
    },
    checkFavorites as RouteHandlerMethod,
  );
}
