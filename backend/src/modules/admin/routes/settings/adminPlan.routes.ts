import {
  activatePlan,
  createPlan,
  deletePlan,
  getAllPlans,
  getPlanByCode,
  updatePlan,
} from '@controllers/admin';
import { requireAdminAuth } from '@core/middlewares/adminAuth.middleware';
import {
  adminCreatePlanBodySchema,
  adminPlanCodeParamsSchema,
  adminUpdatePlanBodySchema,
} from '@schemas/admin';
import type { FastifyInstance } from 'fastify';

/**
 * Admin Plan routes
 */
export async function adminPlanRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Get all plans (admin - includes inactive)
   */
  fastify.get('/', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Plans'],
      summary: 'Get all plans',
      description: 'Get all plans including inactive ones (admin only)',
      security: [{ cookieAuth: [] }],
    },
    handler: getAllPlans,
  });

  /**
   * Get plan by code
   */
  fastify.get('/:planCode', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Plans'],
      summary: 'Get plan by code',
      description: 'Get specific plan details (admin only)',
      params: adminPlanCodeParamsSchema.params,
      security: [{ cookieAuth: [] }],
    },
    handler: getPlanByCode,
  });

  /**
   * Create plan (admin only)
   */
  fastify.post('/', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Plans'],
      summary: 'Create plan',
      description: 'Create new plan (admin only)',
      body: adminCreatePlanBodySchema.body,
      security: [{ cookieAuth: [] }],
    },
    handler: createPlan,
  });

  /**
   * Update plan (admin only)
   */
  fastify.patch('/:planCode', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Plans'],
      summary: 'Update plan',
      description: 'Update plan (admin only)',
      params: adminPlanCodeParamsSchema.params,
      body: adminUpdatePlanBodySchema.body,
      security: [{ cookieAuth: [] }],
    },
    handler: updatePlan,
  });

  /**
   * Delete plan (admin only - soft delete)
   */
  fastify.delete('/:planCode', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Plans'],
      summary: 'Delete plan',
      description: 'Soft delete plan by setting status to inactive (admin only)',
      params: adminPlanCodeParamsSchema.params,
      security: [{ cookieAuth: [] }],
    },
    handler: deletePlan,
  });

  /**
   * Activate plan (admin only)
   */
  fastify.post('/:planCode/activate', {
    preHandler: [requireAdminAuth],
    schema: {
      tags: ['Plans'],
      summary: 'Activate plan',
      description: 'Activate an inactive plan (admin only)',
      params: adminPlanCodeParamsSchema.params,
      security: [{ cookieAuth: [] }],
    },
    handler: activatePlan,
  });
}
