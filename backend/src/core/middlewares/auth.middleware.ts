import { TokenService } from '@services/auth';

import type { FastifyReply, FastifyRequest } from 'fastify';

const tokenService = new TokenService();

/**
 * Extract token from cookies or Authorization header
 */
function extractToken(request: FastifyRequest): string | null {
  // Priority 1: Check cookies first (for web with multi-domain)
  if (request.cookies?.accessToken) {
    return request.cookies.accessToken;
  }

  // Priority 2: Check Authorization header (for mobile/API)
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
 * Middleware: Require authentication
 * Verifies JWT access token from cookies OR Authorization header
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
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

    // Verify token
    const decoded = tokenService.verifyAccessToken(token);

    // Attach user info to request
    (request as unknown as { user: unknown }).user = decoded;
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
 * Middleware: Optional authentication
 * Adds user info if token is provided, but doesn't require it
 */
export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    const token = extractToken(request);

    if (token) {
      const decoded = tokenService.verifyAccessToken(token);
      (request as unknown as { user: unknown }).user = decoded;
    }
  } catch {
    // Ignore errors for optional auth
  }
}
