import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { PlanService, Plan, CreatePlanInput, UpdatePlanInput } from './plan.service';
import { DialogService } from '../../shared/dialog';
import { ToastService } from '../../shared/ui';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './plans.component.html',
  styleUrl: './plans.component.scss'
})
export class PlansComponent implements OnInit {
  private readonly planService = inject(PlanService);
  private readonly dialogService = inject(DialogService);
  private readonly toast = inject(ToastService);

  plans = signal<Plan[]>([]);
  loading = signal(false);
  showAddModal = signal(false);
  showEditModal = signal(false);
  selectedPlan = signal<Plan | null>(null);

  // Form data
  formData = signal<CreatePlanInput>({
    planCode: '',
    name: '',
    tagline: '',
    description: '',
    price: 0,
    currency: 'USD',
    stripePriceId: '',
    stripeProductId: '',
    features: [],
    sortOrder: 0
  });

  featureInput = '';

  ngOnInit() {
    this.loadPlans();
  }

  loadPlans() {
    this.loading.set(true);
    this.planService.listPlans().subscribe({
      next: (response) => {
        this.plans.set(response.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error('Failed to load plans');
        console.error('Failed to load plans:', err);
      }
    });
  }

  formatPrice(price: number, currency: string): string {
    return this.planService.formatPrice(price, currency);
  }

  openAddModal() {
    this.formData.set({
      planCode: '',
      name: '',
      tagline: '',
      description: '',
      price: 0,
      currency: 'USD',
      stripePriceId: '',
      stripeProductId: '',
      features: [],
      sortOrder: 0
    });
    this.featureInput = '';
    this.showAddModal.set(true);
  }

  openEditModal(plan: Plan) {
    this.selectedPlan.set(plan);
    this.formData.set({
      planCode: plan.planCode,
      name: plan.name,
      tagline: plan.tagline,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      stripePriceId: plan.stripePriceId,
      stripeProductId: plan.stripeProductId,
      features: [...plan.features],
      sortOrder: plan.sortOrder
    });
    this.featureInput = '';
    this.showEditModal.set(true);
  }

  addFeature() {
    if (!this.featureInput.trim()) return;
    this.formData.update(data => ({
      ...data,
      features: [...(data.features || []), this.featureInput.trim()]
    }));
    this.featureInput = '';
  }

  removeFeature(index: number) {
    this.formData.update(data => ({
      ...data,
      features: (data.features || []).filter((_, i) => i !== index)
    }));
  }

  createPlan() {
    const data = this.formData();
    if (!data.planCode || !data.name || !data.stripePriceId || !data.stripeProductId) {
      this.toast.error('Please fill in all required fields (Plan Code, Name, Stripe Price ID, Stripe Product ID)');
      return;
    }

    this.loading.set(true);
    this.planService.createPlan(data).subscribe({
      next: () => {
        this.showAddModal.set(false);
        this.loadPlans();
        this.loading.set(false);
        this.toast.success('Plan created successfully');
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err.error?.error?.message || 'Failed to create plan');
        console.error('Failed to create plan:', err);
      }
    });
  }

  updatePlan() {
    const plan = this.selectedPlan();
    if (!plan) return;

    const data = this.formData();
    const updateData: UpdatePlanInput = {
      name: data.name,
      tagline: data.tagline,
      description: data.description,
      price: data.price,
      currency: data.currency,
      stripePriceId: data.stripePriceId,
      stripeProductId: data.stripeProductId,
      features: data.features,
      sortOrder: data.sortOrder
    };

    this.loading.set(true);
    this.planService.updatePlan(plan.planCode, updateData).subscribe({
      next: () => {
        this.showEditModal.set(false);
        this.selectedPlan.set(null);
        this.loadPlans();
        this.loading.set(false);
        this.toast.success('Plan updated successfully');
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error('Failed to update plan');
        console.error('Failed to update plan:', err);
      }
    });
  }

  async deactivatePlan(plan: Plan) {
    const confirmed = await this.dialogService.confirm({
      title: 'Deactivate Plan',
      message: `Are you sure you want to deactivate the "${plan.name}" plan? Users won't be able to subscribe to this plan.`,
      type: 'warning',
      confirmText: 'Deactivate',
    });

    if (!confirmed) return;

    this.planService.deletePlan(plan.planCode).subscribe({
      next: () => {
        this.loadPlans();
        this.toast.success('Plan deactivated successfully');
      },
      error: (err) => {
        this.toast.error('Failed to deactivate plan');
        console.error('Failed to deactivate plan:', err);
      }
    });
  }

  activatePlan(plan: Plan) {
    this.planService.activatePlan(plan.planCode).subscribe({
      next: () => {
        this.loadPlans();
        this.toast.success('Plan activated successfully');
      },
      error: (err) => {
        this.toast.error('Failed to activate plan');
        console.error('Failed to activate plan:', err);
      }
    });
  }

  updateFormField(field: keyof CreatePlanInput, value: string | number | string[]) {
    this.formData.update(data => ({ ...data, [field]: value }));
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'archived': return 'Archived';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}
