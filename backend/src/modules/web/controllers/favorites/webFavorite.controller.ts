import type {
  AddFavoriteInput,
  CheckFavoritesQuery,
  ListFavoritesQuery,
  RemoveFavoriteParams,
} from '@schemas/web';
import { webFavoriteService } from '@services/web';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Add a favorite
 * POST /favorites
 */
export async function addFavorite(
  request: FastifyRequest<{ Body: AddFavoriteInput }>,
  reply: FastifyReply,
) {
  const userId = (request.user as { sub: string }).sub;

  try {
    const favorite = await webFavoriteService.addFavorite(userId, request.body);

    return reply.status(201).send({
      success: true,
      data: favorite,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    request.log.error({ error, userId }, 'Error adding favorite');

    if (errorMessage.includes('not found')) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: errorMessage,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'ADD_FAVORITE_ERROR',
        message: 'Failed to add favorite',
      },
    });
  }
}

/**
 * Remove a favorite
 * DELETE /favorites/:id
 */
export async function removeFavorite(
  request: FastifyRequest<{ Params: RemoveFavoriteParams }>,
  reply: FastifyReply,
) {
  const userId = (request.user as { sub: string }).sub;

  try {
    await webFavoriteService.removeFavorite(userId, request.params.id);

    return reply.send({
      success: true,
      data: { message: 'Favorite removed successfully' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    request.log.error({ error, userId }, 'Error removing favorite');

    if (errorMessage === 'Favorite not found') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Favorite not found',
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'REMOVE_FAVORITE_ERROR',
        message: 'Failed to remove favorite',
      },
    });
  }
}

/**
 * List user's favorites
 * GET /favorites
 */
export async function listFavorites(
  request: FastifyRequest<{ Querystring: ListFavoritesQuery }>,
  reply: FastifyReply,
) {
  const userId = (request.user as { sub: string }).sub;

  try {
    const result = await webFavoriteService.listFavorites(userId, request.query);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, userId }, 'Error listing favorites');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_FAVORITES_ERROR',
        message: 'Failed to list favorites',
      },
    });
  }
}

/**
 * Check if items are favorited
 * GET /favorites/check
 */
export async function checkFavorites(
  request: FastifyRequest<{ Querystring: CheckFavoritesQuery }>,
  reply: FastifyReply,
) {
  const userId = (request.user as { sub: string }).sub;

  try {
    // Parse comma-separated IDs
    const ids = request.query.ids.split(',').map((id) => id.trim());

    const result = await webFavoriteService.checkFavorites(userId, request.query.type, ids);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error, userId }, 'Error checking favorites');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'CHECK_FAVORITES_ERROR',
        message: 'Failed to check favorites',
      },
    });
  }
}
