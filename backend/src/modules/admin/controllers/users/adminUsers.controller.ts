import { getAdminId } from '@core/middlewares/adminAuth.middleware';
import type { AdminRole, AdminStatus } from '@core/models/AdminUser';
import type { AdminCreateUserInput, AdminUpdateUserInput } from '@schemas/admin';
import { adminUserService } from '@services/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get admin statistics
 */
export async function getAdminStats(request: FastifyRequest, reply: FastifyReply) {
  try {
    const stats = await adminUserService.getAdminStats();

    return reply.status(200).send({
      success: true,
      data: stats,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get admin stats');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'STATS_FETCH_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get admin stats',
      },
    });
  }
}

/**
 * List all admins
 */
export async function listAdmins(
  request: FastifyRequest<{
    Querystring: {
      page?: number;
      limit?: number;
      status?: string;
      role?: string;
      search?: string;
    };
  }>,
  reply: FastifyReply,
) {
  try {
    const { page, limit, status, role, search } = request.query;

    const result = await adminUserService.listAdmins({
      page,
      limit,
      status: status as AdminStatus | undefined,
      role: role as AdminRole | undefined,
      search,
    });

    return reply.status(200).send({
      success: true,
      data: result.admins,
      meta: {
        total: result.total,
        page: page || 1,
        limit: limit || 20,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to list admins');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'LIST_ADMINS_FAILED',
        message: error instanceof Error ? error.message : 'Failed to list admins',
      },
    });
  }
}

/**
 * Get admin by ID
 */
export async function getAdminById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const admin = await adminUserService.getAdminById(request.params.id);

    if (!admin) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ADMIN_NOT_FOUND',
          message: 'Admin not found',
        },
      });
    }

    return reply.status(200).send({
      success: true,
      data: admin,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get admin');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_ADMIN_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get admin',
      },
    });
  }
}

/**
 * Create new admin
 */
export async function createAdmin(
  request: FastifyRequest<{ Body: AdminCreateUserInput }>,
  reply: FastifyReply,
) {
  try {
    const createdById = getAdminId(request);
    const admin = await adminUserService.createAdminUser(request.body, createdById);

    return reply.status(201).send({
      success: true,
      data: admin,
      message: 'Admin created successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to create admin');

    const message = error instanceof Error ? error.message : 'Failed to create admin';
    const isDuplicate = message.includes('already exists');

    return reply.status(isDuplicate ? 409 : 400).send({
      success: false,
      error: {
        code: isDuplicate ? 'ADMIN_EXISTS' : 'CREATE_ADMIN_FAILED',
        message,
      },
    });
  }
}

/**
 * Update admin
 */
export async function updateAdmin(
  request: FastifyRequest<{ Params: { id: string }; Body: AdminUpdateUserInput }>,
  reply: FastifyReply,
) {
  try {
    const updatedById = getAdminId(request);
    const admin = await adminUserService.updateAdmin(request.params.id, request.body, updatedById);

    if (!admin) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ADMIN_NOT_FOUND',
          message: 'Admin not found',
        },
      });
    }

    return reply.status(200).send({
      success: true,
      data: admin,
      message: 'Admin updated successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to update admin');

    return reply.status(400).send({
      success: false,
      error: {
        code: 'UPDATE_ADMIN_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update admin',
      },
    });
  }
}

/**
 * Delete (deactivate) admin
 */
export async function deleteAdmin(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const currentAdminId = getAdminId(request);

    // Prevent self-deletion
    if (request.params.id === currentAdminId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'SELF_DELETE_FORBIDDEN',
          message: 'Cannot deactivate your own account',
        },
      });
    }

    await adminUserService.deleteAdmin(request.params.id);

    return reply.status(200).send({
      success: true,
      message: 'Admin deactivated successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to delete admin');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'DELETE_ADMIN_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete admin',
      },
    });
  }
}

/**
 * Get admin session info
 */
export async function getAdminSessions(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const sessionInfo = await adminUserService.getAdminSessions(request.params.id);

    return reply.status(200).send({
      success: true,
      data: sessionInfo,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get admin sessions');

    const message = error instanceof Error ? error.message : 'Failed to get admin sessions';
    const isNotFound = message.includes('not found');

    return reply.status(isNotFound ? 404 : 500).send({
      success: false,
      error: {
        code: isNotFound ? 'ADMIN_NOT_FOUND' : 'GET_SESSIONS_FAILED',
        message,
      },
    });
  }
}

/**
 * Force logout admin from all sessions
 */
export async function forceLogoutAdmin(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const currentAdminId = getAdminId(request);

    // Prevent self-logout via this endpoint
    if (request.params.id === currentAdminId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'SELF_LOGOUT_FORBIDDEN',
          message: 'Use the logout button to logout yourself',
        },
      });
    }

    await adminUserService.forceLogoutAdmin(request.params.id);

    return reply.status(200).send({
      success: true,
      message: 'Admin logged out from all sessions',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to force logout admin');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FORCE_LOGOUT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to force logout admin',
      },
    });
  }
}

/**
 * Unlock admin account
 */
export async function unlockAdmin(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  try {
    const admin = await adminUserService.unlockAdmin(request.params.id);

    if (!admin) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ADMIN_NOT_FOUND',
          message: 'Admin not found',
        },
      });
    }

    return reply.status(200).send({
      success: true,
      data: admin,
      message: 'Admin account unlocked successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to unlock admin');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'UNLOCK_ADMIN_FAILED',
        message: error instanceof Error ? error.message : 'Failed to unlock admin',
      },
    });
  }
}
