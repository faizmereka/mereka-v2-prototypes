import { getDashboardStats } from '@controllers/admin';
import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import type { FastifyInstance } from 'fastify';

/**
 * Admin Dashboard Routes
 * Base path: /api/v1/admin/dashboard
 */
export async function adminDashboardRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/admin/dashboard/stats
  fastify.get('/stats', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Admin - Dashboard'],
      summary: 'Get dashboard statistics',
      description:
        'Returns comprehensive statistics for the admin dashboard including users, hubs, jobs, contracts, proposals, experiences, and expertise counts',
      security: [{ cookieAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                users: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    active: { type: 'number' },
                    inactive: { type: 'number' },
                    newThisMonth: { type: 'number' },
                  },
                },
                hubs: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    active: { type: 'number' },
                    pending: { type: 'number' },
                  },
                },
                jobs: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    active: { type: 'number' },
                    completed: { type: 'number' },
                    inProgress: { type: 'number' },
                  },
                },
                contracts: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    active: { type: 'number' },
                    completed: { type: 'number' },
                    pending: { type: 'number' },
                  },
                },
                proposals: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    pending: { type: 'number' },
                    accepted: { type: 'number' },
                    rejected: { type: 'number' },
                  },
                },
                experiences: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    published: { type: 'number' },
                    draft: { type: 'number' },
                  },
                },
                expertise: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    published: { type: 'number' },
                    draft: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    handler: getDashboardStats,
  });
}
