import {
  adminChangePassword,
  adminLogin,
  adminLogout,
  adminMe,
  adminRefreshToken,
} from '@controllers/admin';
import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import { adminChangePasswordSchema, adminLoginSchema } from '@schemas/admin';
import type { FastifyInstance } from 'fastify';

// Refresh token schema (JSON Schema)
const refreshTokenSchema = {
  type: 'object',
  properties: {
    refreshToken: { type: 'string' },
  },
} as const;

/**
 * Admin authentication routes
 * Base path: /api/v1/admin/auth
 */
export async function adminAuthRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Admin login
   */
  fastify.post('/login', {
    schema: {
      tags: ['Admin Authentication'],
      summary: 'Admin login',
      description: 'Login to admin panel with email and password',
      body: adminLoginSchema,
    },
    handler: adminLogin,
  });

  /**
   * Refresh admin token
   */
  fastify.post('/refresh', {
    schema: {
      tags: ['Admin Authentication'],
      summary: 'Refresh admin token',
      description: 'Get new access token using refresh token',
      body: refreshTokenSchema,
    },
    handler: adminRefreshToken,
  });

  /**
   * Admin logout
   */
  fastify.post('/logout', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin Authentication'],
      summary: 'Admin logout',
      description: 'Logout and revoke tokens',
      security: [{ bearerAuth: [] }],
    },
    handler: adminLogout,
  });

  /**
   * Get current admin
   */
  fastify.get('/me', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin Authentication'],
      summary: 'Get current admin',
      description: 'Get authenticated admin information',
      security: [{ bearerAuth: [] }],
    },
    handler: adminMe,
  });

  /**
   * Change admin password
   */
  fastify.post('/change-password', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin Authentication'],
      summary: 'Change admin password',
      description: 'Change password for logged-in admin',
      body: adminChangePasswordSchema,
      security: [{ bearerAuth: [] }],
    },
    handler: adminChangePassword,
  });
}
