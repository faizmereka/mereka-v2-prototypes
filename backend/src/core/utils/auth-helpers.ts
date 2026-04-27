import type { FastifyRequest } from 'fastify';

/**
 * Interface for authenticated request with user payload
 */
interface AuthenticatedRequest extends FastifyRequest {
  user: {
    sub: string;
    [key: string]: unknown;
  };
}

/**
 * Extract user ID from authenticated request
 * Must be used only in routes protected by requireAuth middleware
 */
export function getUserId(request: FastifyRequest): string {
  const authRequest = request as unknown as AuthenticatedRequest;

  if (!authRequest.user || !authRequest.user.sub) {
    throw new Error('User not authenticated. Ensure requireAuth middleware is applied.');
  }

  return authRequest.user.sub;
}

/**
 * Get full user payload from authenticated request
 * Must be used only in routes protected by requireAuth middleware
 */
export function getUserPayload(request: FastifyRequest): { sub: string; [key: string]: unknown } {
  const authRequest = request as unknown as AuthenticatedRequest;

  if (!authRequest.user || !authRequest.user.sub) {
    throw new Error('User not authenticated. Ensure requireAuth middleware is applied.');
  }

  return authRequest.user;
}
