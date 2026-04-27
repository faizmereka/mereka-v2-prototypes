import type { AdminQueryPlatformUsersInput } from '@schemas/admin';
import { adminPlatformUserService } from '@services/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get platform user statistics
 * GET /api/v1/admin/users/stats
 */
export async function getPlatformUserStats(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const stats = await adminPlatformUserService.getStats();

    return reply.send({
      success: true,
      data: stats,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get platform user stats');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'PLATFORM_USER_STATS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get platform user stats',
      },
    });
  }
}

/**
 * List all platform users with filtering and pagination
 * GET /api/v1/admin/users
 */
export async function listPlatformUsers(
  request: FastifyRequest<{
    Querystring: AdminQueryPlatformUsersInput;
  }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const result = await adminPlatformUserService.listUsers(request.query);

    return reply.send({
      success: true,
      data: result.users,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to list platform users');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_PLATFORM_USERS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list platform users',
      },
    });
  }
}

/**
 * Get platform user by ID with full details
 * GET /api/v1/admin/users/:id
 */
export async function getPlatformUserById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  try {
    const result = await adminPlatformUserService.getUserById(request.params.id);

    if (!result) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get platform user');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_PLATFORM_USER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get platform user',
      },
    });
  }
}
