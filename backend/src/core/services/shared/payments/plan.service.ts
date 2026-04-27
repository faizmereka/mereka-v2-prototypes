import { type IPlan, Plan, PlanStatus } from '@core/models/Plan';
import type { AdminUpdatePlanInput } from '@schemas/admin';

/**
 * Plan service - Manage subscription plans
 */
export class PlanService {
  /**
   * Get all active plans
   */
  async getAllPlans(): Promise<IPlan[]> {
    const plans = await Plan.find({ status: PlanStatus.ACTIVE }).sort({ sortOrder: 1 });
    return plans;
  }

  /**
   * Get all plans (admin - includes inactive)
   */
  async getAllPlansAdmin(): Promise<IPlan[]> {
    const plans = await Plan.find().sort({ sortOrder: 1 });
    return plans;
  }

  /**
   * Get plan by code
   */
  async getPlanByCode(planCode: string): Promise<IPlan | null> {
    const plan = await Plan.findOne({ planCode, status: PlanStatus.ACTIVE });
    return plan;
  }

  /**
   * Get plan by code (admin - includes inactive)
   */
  async getPlanByCodeAdmin(planCode: string): Promise<IPlan | null> {
    const plan = await Plan.findOne({ planCode });
    return plan;
  }

  /**
   * Get Stripe price ID for a plan
   */
  getStripePriceId(plan: IPlan): string {
    return plan.stripePriceId;
  }

  /**
   * Create plan (admin only)
   */
  async createPlan(data: Partial<IPlan>, adminId: string): Promise<IPlan> {
    const plan = await Plan.create({
      ...data,
      createdBy: adminId,
      lastUpdatedBy: adminId,
    });

    return plan;
  }

  /**
   * Update plan (admin only)
   */
  async updatePlan(planCode: string, data: AdminUpdatePlanInput, adminId: string): Promise<IPlan> {
    const updateData: Record<string, unknown> = {
      ...data,
      lastUpdatedBy: adminId,
    };

    const plan = await Plan.findOneAndUpdate({ planCode }, updateData, {
      new: true,
      runValidators: true,
    });

    if (!plan) {
      throw new Error('Plan not found');
    }

    return plan;
  }

  /**
   * Delete plan (admin only - soft delete by setting status to inactive)
   */
  async deletePlan(planCode: string): Promise<void> {
    await Plan.findOneAndUpdate({ planCode }, { status: PlanStatus.INACTIVE });
  }

  /**
   * Activate plan (admin only)
   */
  async activatePlan(planCode: string): Promise<IPlan | null> {
    const plan = await Plan.findOneAndUpdate(
      { planCode },
      { status: PlanStatus.ACTIVE },
      { new: true },
    );
    return plan;
  }

  /**
   * Archive plan (admin only)
   */
  async archivePlan(planCode: string): Promise<IPlan | null> {
    const plan = await Plan.findOneAndUpdate(
      { planCode },
      { status: PlanStatus.ARCHIVED },
      { new: true },
    );
    return plan;
  }
}

// Export singleton instance
export const planService = new PlanService();
