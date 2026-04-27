import { getAdminId } from '@core/middlewares/adminAuth.middleware';
import type { AdminCreatePlanInput, AdminUpdatePlanInput } from '@schemas/admin';
import { planService } from '@services/payments';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Get all plans (admin - includes inactive)
 */
export async function getAllPlans(request: FastifyRequest, reply: FastifyReply) {
  try {
    const plans = await planService.getAllPlansAdmin();

    return reply.send({
      success: true,
      data: plans,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get plans');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_PLANS_FAILED',
        message: 'Failed to get plans',
      },
    });
  }
}

/**
 * Get plan by code
 */
export async function getPlanByCode(
  request: FastifyRequest<{ Params: { planCode: string } }>,
  reply: FastifyReply,
) {
  try {
    const { planCode } = request.params;

    const plan = await planService.getPlanByCodeAdmin(planCode);

    if (!plan) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'PLAN_NOT_FOUND',
          message: 'Plan not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: plan,
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to get plan');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'GET_PLAN_FAILED',
        message: 'Failed to get plan',
      },
    });
  }
}

/**
 * Create plan (admin only)
 */
export async function createPlan(
  request: FastifyRequest<{ Body: AdminCreatePlanInput }>,
  reply: FastifyReply,
) {
  try {
    const adminId = getAdminId(request);
    const plan = await planService.createPlan(request.body, adminId);

    return reply.status(201).send({
      success: true,
      data: plan,
      message: 'Plan created successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to create plan');

    const statusCode = error instanceof Error && error.message.includes('duplicate') ? 409 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'CREATE_PLAN_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create plan',
      },
    });
  }
}

/**
 * Update plan (admin only)
 */
export async function updatePlan(
  request: FastifyRequest<{ Params: { planCode: string }; Body: AdminUpdatePlanInput }>,
  reply: FastifyReply,
) {
  try {
    const adminId = getAdminId(request);
    const { planCode } = request.params;

    const plan = await planService.updatePlan(planCode, request.body, adminId);

    return reply.send({
      success: true,
      data: plan,
      message: 'Plan updated successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to update plan');

    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: 'UPDATE_PLAN_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update plan',
      },
    });
  }
}

/**
 * Delete plan (admin only - soft delete by setting status to inactive)
 */
export async function deletePlan(
  request: FastifyRequest<{ Params: { planCode: string } }>,
  reply: FastifyReply,
) {
  try {
    getAdminId(request); // Verify authentication
    const { planCode } = request.params;

    await planService.deletePlan(planCode);

    return reply.send({
      success: true,
      message: 'Plan deactivated successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to delete plan');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'DELETE_PLAN_FAILED',
        message: 'Failed to delete plan',
      },
    });
  }
}

/**
 * Activate plan (admin only)
 */
export async function activatePlan(
  request: FastifyRequest<{ Params: { planCode: string } }>,
  reply: FastifyReply,
) {
  try {
    getAdminId(request); // Verify authentication
    const { planCode } = request.params;

    const plan = await planService.activatePlan(planCode);

    if (!plan) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'PLAN_NOT_FOUND',
          message: 'Plan not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: plan,
      message: 'Plan activated successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Failed to activate plan');

    return reply.status(500).send({
      success: false,
      error: {
        code: 'ACTIVATE_PLAN_FAILED',
        message: 'Failed to activate plan',
      },
    });
  }
}
