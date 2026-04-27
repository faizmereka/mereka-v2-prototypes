import {
  createAdmin,
  deleteAdmin,
  forceLogoutAdmin,
  getAdminById,
  getAdminSessions,
  getAdminStats,
  listAdmins,
  unlockAdmin,
  updateAdmin,
} from '@controllers/admin';
import { requireAdminAuth, requireSuperAdmin } from '@core/middlewares/adminAuth.middleware';
import {
  adminCreateUserSchema,
  adminQueryUsersSchema,
  adminUpdateUserSchema,
} from '@schemas/admin';
import type { FastifyInstance } from 'fastify';

/**
 * Admin users management routes
 * Base path: /api/v1/admin/admins
 * All routes require super admin access
 */
export async function adminUsersRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require admin auth and super admin role
  fastify.addHook('preHandler', requireAdminAuth);
  fastify.addHook('preHandler', requireSuperAdmin);

  /**
   * Get admin statistics
   */
  fastify.get('/stats', {
    schema: {
      tags: ['Admin Management'],
      summary: 'Get admin statistics',
      description: 'Get statistics about admin users (total, by status, by role, locked)',
      security: [{ bearerAuth: [] }],
    },
    handler: getAdminStats,
  });

  /**
   * List all admins
   */
  fastify.get('/', {
    schema: {
      tags: ['Admin Management'],
      summary: 'List all admins',
      description: 'Get paginated list of admin users with optional filtering',
      querystring: adminQueryUsersSchema,
      security: [{ bearerAuth: [] }],
    },
    handler: listAdmins,
  });

  /**
   * Get admin by ID
   */
  fastify.get('/:id', {
    schema: {
      tags: ['Admin Management'],
      summary: 'Get admin by ID',
      description: 'Get admin user details by ID',
      security: [{ bearerAuth: [] }],
    },
    handler: getAdminById,
  });

  /**
   * Create new admin
   */
  fastify.post('/', {
    schema: {
      tags: ['Admin Management'],
      summary: 'Create new admin',
      description: 'Create a new admin user',
      body: adminCreateUserSchema,
      security: [{ bearerAuth: [] }],
    },
    handler: createAdmin,
  });

  /**
   * Update admin
   */
  fastify.patch('/:id', {
    schema: {
      tags: ['Admin Management'],
      summary: 'Update admin',
      description: 'Update admin user details',
      body: adminUpdateUserSchema,
      security: [{ bearerAuth: [] }],
    },
    handler: updateAdmin,
  });

  /**
   * Delete (deactivate) admin
   */
  fastify.delete('/:id', {
    schema: {
      tags: ['Admin Management'],
      summary: 'Deactivate admin',
      description: 'Deactivate an admin user (soft delete)',
      security: [{ bearerAuth: [] }],
    },
    handler: deleteAdmin,
  });

  /**
   * Get admin session info
   */
  fastify.get('/:id/sessions', {
    schema: {
      tags: ['Admin Management'],
      summary: 'Get admin session info',
      description: 'Get login and session information for an admin',
      security: [{ bearerAuth: [] }],
    },
    handler: getAdminSessions,
  });

  /**
   * Force logout admin
   */
  fastify.post('/:id/logout', {
    schema: {
      tags: ['Admin Management'],
      summary: 'Force logout admin',
      description: 'Force logout an admin from all sessions',
      security: [{ bearerAuth: [] }],
    },
    handler: forceLogoutAdmin,
  });

  /**
   * Unlock admin account
   */
  fastify.post('/:id/unlock', {
    schema: {
      tags: ['Admin Management'],
      summary: 'Unlock admin account',
      description: 'Unlock a locked admin account',
      security: [{ bearerAuth: [] }],
    },
    handler: unlockAdmin,
  });
}
