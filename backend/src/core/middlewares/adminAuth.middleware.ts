import { AdminRole, AdminStatus } from '@core/models/AdminUser';
import { type AdminTokenPayload, adminUserService } from '@services/admin';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Extract token from cookies or Authorization header
 */
function extractToken(request: FastifyRequest): string | null {
  // Priority 1: Check cookies first
  if (request.cookies?.adminAccessToken) {
    return request.cookies.adminAccessToken;
  }

  // Priority 2: Check Authorization header
  const authorization = request.headers.authorization;

  if (!authorization) {
    return null;
  }

  const parts = authorization.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] || null;
}

/**
 * Middleware: Require admin authentication
 * Verifies JWT access token and checks admin status
 */
export async function requireAdminAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const token = extractToken(request);

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No authorization token provided',
        },
      });
    }

    // Verify admin token
    const decoded = adminUserService.verifyAdminAccessToken(token);

    // Check if token is admin type
    if (decoded.type !== 'admin') {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token type',
        },
      });
    }

    // Verify admin still exists and is active
    const admin = await adminUserService.getAdminById(decoded.sub);

    if (!admin) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin not found',
        },
      });
    }

    if (admin.status !== AdminStatus.ACTIVE) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Admin account is not active',
        },
      });
    }

    // Attach admin info to request
    (request as unknown as { admin: AdminTokenPayload }).admin = decoded;
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: error instanceof Error ? error.message : 'Invalid token',
      },
    });
  }
}

/**
 * Get admin ID from authenticated request
 */
export function getAdminId(request: FastifyRequest): string {
  const adminRequest = request as unknown as { admin: AdminTokenPayload };

  if (!adminRequest.admin || !adminRequest.admin.sub) {
    throw new Error('Admin not authenticated. Ensure requireAdminAuth middleware is applied.');
  }

  return adminRequest.admin.sub;
}

/**
 * Get full admin payload from authenticated request
 */
export function getAdminPayload(request: FastifyRequest): AdminTokenPayload {
  const adminRequest = request as unknown as { admin: AdminTokenPayload };

  if (!adminRequest.admin || !adminRequest.admin.sub) {
    throw new Error('Admin not authenticated. Ensure requireAdminAuth middleware is applied.');
  }

  return adminRequest.admin;
}

/**
 * Middleware: Require super admin role
 * Must be used after requireAdminAuth
 */
export async function requireSuperAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const adminRequest = request as unknown as { admin: AdminTokenPayload };

  if (!adminRequest.admin) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Admin not authenticated',
      },
    });
  }

  if (adminRequest.admin.role !== AdminRole.SUPER_ADMIN) {
    return reply.status(403).send({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Super admin access required',
      },
    });
  }
}
