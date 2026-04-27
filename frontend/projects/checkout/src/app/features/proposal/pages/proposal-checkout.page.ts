import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import {
  StepProgressComponent,
  type CheckoutStep,
} from '../../../shared/components';
import {
  CheckoutApiService,
  AuthService,
} from '../../../core/services';
import type {
  ProposalCheckoutData,
  ProposalFormData,
  MilestoneInput,
  HubExpert,
} from '../models';

@Component({
  selector: 'app-proposal-checkout-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StepProgressComponent,
  ],
  templateUrl: './proposal-checkout.page.html',
})
export class ProposalCheckoutPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly checkoutApi = inject(CheckoutApiService);
  private readonly authService = inject(AuthService);

  // Step Management
  readonly currentStep = signal<CheckoutStep>(1);
  readonly completedSteps = signal<CheckoutStep[]>([]);

  // State
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly showErrors = signal(false);

  // Checkout Data
  readonly checkoutData = signal<ProposalCheckoutData | null>(null);

  // Form Data
  readonly formData = signal<ProposalFormData>({
    asssignedExpertId: null,
    proposalDetails: '',
    priceType: 'fixed',
    proposedPrice: null,
    hourlyProposedPrice: null,
    workingHours: null,
    files: [],
    enableMilestones: false,
    milestones: [],
  });

  // Computed Values
  readonly job = computed(() => this.checkoutData()?.job);
  readonly expert = computed(() => this.checkoutData()?.expert);
  readonly hubExperts = computed(() => this.checkoutData()?.hubExperts ?? []);
  readonly showExpertSelection = computed(() => this.hubExperts().length > 1);
  readonly hasExistingProposal = computed(() => this.checkoutData()?.hasExistingProposal ?? false);

  readonly isLoggedIn = computed(() => this.authService.isLoggedIn());

  readonly canContinueStep1 = computed(() => {
    return !this.hasExistingProposal();
  });

  readonly proposalDetailsValid = computed(() => {
    const details = this.formData().proposalDetails;
    return details && details.length >= 10 && details.length <= 2000;
  });

  readonly budgetValid = computed(() => {
    const form = this.formData();
    if (form.priceType === 'fixed') {
      return form.proposedPrice !== null && form.proposedPrice > 0;
    } else {
      return (
        form.hourlyProposedPrice !== null &&
        form.hourlyProposedPrice > 0 &&
        form.workingHours !== null &&
        form.workingHours > 0
      );
    }
  });

  readonly milestonesValid = computed(() => {
    const form = this.formData();
    if (!form.enableMilestones || form.milestones.length === 0) {
      return true;
    }
    // Check all milestones have required fields
    const allValid = form.milestones.every(
      (m) => m.taskName && m.amount > 0 && m.dueDate
    );
    if (!allValid) return false;

    // Check total doesn't exceed proposed price
    if (form.priceType === 'fixed' && form.proposedPrice) {
      const total = form.milestones.reduce((sum, m) => sum + m.amount, 0);
      return total <= form.proposedPrice;
    }
    return true;
  });

  readonly canContinueStep2 = computed(() => {
    return this.proposalDetailsValid() && this.budgetValid() && this.milestonesValid();
  });

  readonly canSubmit = computed(() => {
    return this.canContinueStep2() && !this.submitting();
  });

  readonly totalPrice = computed(() => {
    const form = this.formData();
    if (form.priceType === 'fixed') {
      return form.proposedPrice || 0;
    } else {
      return (form.hourlyProposedPrice || 0) * (form.workingHours || 0);
    }
  });

  readonly milestonesTotal = computed(() => {
    const form = this.formData();
    if (!form.enableMilestones) return 0;
    return form.milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
  });

  readonly proposalDetailsRemaining = computed(() => {
    return 2000 - (this.formData().proposalDetails?.length || 0);
  });

  async ngOnInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Initialize auth
    await this.authService.init();

    // Check if user is logged in - proposals require authentication
    if (!this.authService.isLoggedIn()) {
      const returnUrl = window.location.href;
      this.authService.redirectToLogin(returnUrl);
      return;
    }

    // Get job ID from URL
    const jobId = this.route.snapshot.paramMap.get('jobId');
    if (!jobId) {
      this.error.set('Invalid checkout URL');
      this.loading.set(false);
      return;
    }

    try {
      await this.loadCheckoutData(jobId);
    } catch (err: unknown) {
      console.error('Checkout init error:', err);
      this.error.set(err instanceof Error ? err.message : 'Failed to load job details');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadCheckoutData(jobId: string): Promise<void> {
    const data = await this.checkoutApi.getProposalCheckout(jobId);
    this.checkoutData.set(data);

    // Set default price type based on job budget
    if (data.job.jobBudget.pricingType) {
      this.updateFormData({ priceType: data.job.jobBudget.pricingType });
    }

    // Set default expert selection (first expert or current user)
    if (data.hubExperts && data.hubExperts.length > 0) {
      this.updateFormData({ asssignedExpertId: data.hubExperts[0]._id });
    } else if (data.expert) {
      this.updateFormData({ asssignedExpertId: data.expert._id });
    }
  }

  // =========================================================================
  // Step Navigation
  // =========================================================================

  continueFromStep1(): void {
    if (!this.canContinueStep1()) return;
    this.completedSteps.set([1]);
    this.currentStep.set(2);
  }

  continueFromStep2(): void {
    this.showErrors.set(true);
    if (!this.canContinueStep2()) return;
    this.completedSteps.set([1, 2]);
    this.currentStep.set(3);
    this.showErrors.set(false);
  }

  goBackToStep(step: CheckoutStep): void {
    this.currentStep.set(step);
  }

  // =========================================================================
  // Form Updates
  // =========================================================================

  updateFormData(updates: Partial<ProposalFormData>): void {
    this.formData.update((current) => ({
      ...current,
      ...updates,
    }));
  }

  onProposalDetailsChange(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.updateFormData({ proposalDetails: value });
  }

  onPriceTypeChange(priceType: 'fixed' | 'hourly'): void {
    this.updateFormData({ priceType });
  }

  onProposedPriceChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.updateFormData({ proposedPrice: isNaN(value) ? null : value });
  }

  onHourlyRateChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.updateFormData({ hourlyProposedPrice: isNaN(value) ? null : value });
  }

  onWorkingHoursChange(event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value);
    this.updateFormData({ workingHours: isNaN(value) ? null : value });
  }

  onEnableMilestonesChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.updateFormData({
      enableMilestones: checked,
      milestones: checked ? [this.createEmptyMilestone()] : [],
    });
  }

  onExpertChange(event: Event): void {
    const expertId = (event.target as HTMLSelectElement).value;
    this.updateFormData({ asssignedExpertId: expertId || null });
  }

  private createEmptyMilestone(): MilestoneInput {
    return {
      taskName: '',
      taskDescription: '',
      amount: 0,
      dueDate: '',
    };
  }

  addMilestone(): void {
    const milestones = [...this.formData().milestones, this.createEmptyMilestone()];
    this.updateFormData({ milestones });
  }

  removeMilestone(index: number): void {
    const milestones = this.formData().milestones.filter((_, i) => i !== index);
    this.updateFormData({ milestones });
  }

  updateMilestone(index: number, field: keyof MilestoneInput, value: string | number): void {
    const milestones = [...this.formData().milestones];
    milestones[index] = { ...milestones[index], [field]: value };
    this.updateFormData({ milestones });
  }

  // =========================================================================
  // Submit
  // =========================================================================

  async onSubmit(): Promise<void> {
    this.showErrors.set(true);

    if (!this.canSubmit()) {
      return;
    }

    const data = this.checkoutData();
    if (!data) {
      this.error.set('Checkout data not found');
      return;
    }

    const form = this.formData();
    this.submitting.set(true);

    try {
      const result = await this.checkoutApi.submitProposal({
        jobId: data.job._id,
        asssignedExpertId: form.asssignedExpertId ?? undefined,
        proposalDetails: form.proposalDetails,
        priceType: form.priceType,
        proposedPrice: form.priceType === 'fixed' ? form.proposedPrice ?? undefined : undefined,
        hourlyProposedPrice:
          form.priceType === 'hourly' ? form.hourlyProposedPrice ?? undefined : undefined,
        workingHours: form.priceType === 'hourly' ? form.workingHours ?? undefined : undefined,
        selectedCurrency: data.job.jobCurrency,
        files: form.files,
        milestones: form.enableMilestones ? form.milestones : undefined,
      });

      this.router.navigate(['/proposal/success', result.proposalId]);
    } catch (err: unknown) {
      console.error('Submit proposal error:', err);
      this.error.set(err instanceof Error ? err.message : 'Failed to submit proposal');
      this.submitting.set(false);
    }
  }
}
