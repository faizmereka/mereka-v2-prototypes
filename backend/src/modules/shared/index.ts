import type { FastifyInstance } from 'fastify';

/**
 * Shared Auth Module - Authentication routes
 * Used by all frontend applications
 */
export async function authModule(fastify: FastifyInstance) {
  const { authRoutes } = await import('./auth/routes/auth.routes');
  await fastify.register(authRoutes, { prefix: '/auth' });
}

/**
 * Shared Permissions Module - Permission constants and definitions
 * Used by frontend to fetch permission data for RBAC
 */
export async function permissionsModule(fastify: FastifyInstance) {
  const { permissionsRoutes } = await import('./routes/permissions.routes');
  await fastify.register(permissionsRoutes, { prefix: '/permissions' });
}

/**
 * Shared Checkout Module - Checkout routes for proposals
 * Used by checkout.mereka.io for proposal submission
 */
export async function checkoutModule(fastify: FastifyInstance) {
  const { checkoutProposalRoutes } = await import('./checkout/routes/checkoutProposal.routes');
  await fastify.register(checkoutProposalRoutes, { prefix: '/proposal' });
}
