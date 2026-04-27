import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CreateJobService } from '../../services/create-job.service';
import {
  EMPLOYMENT_TYPE_OPTIONS,
  JOB_LOCATION_OPTIONS,
  ACCESS_MODE_OPTIONS,
  EXPERT_LEVEL_OPTIONS,
  START_DATE_OPTIONS,
  DURATION_OPTIONS,
  PRICING_TYPE_OPTIONS,
  CURRENCY_OPTIONS,
} from '../../models';

@Component({
  selector: 'app-job-confirmation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation.component.html',
})
export class JobConfirmationComponent implements OnInit {
  private readonly createJobService = inject(CreateJobService);
  private readonly router = inject(Router);

  // Get form data
  readonly formData = computed(() => this.createJobService.getFormData());

  // Reference data for display
  readonly categories = this.createJobService.categories;

  // Validation
  readonly validationErrors = computed(() => this.createJobService.getValidationErrors());
  readonly hasErrors = computed(() => this.validationErrors().length > 0);
  readonly isReadyToPublish = computed(() => this.createJobService.isReadyToPublish());

  ngOnInit(): void {
    // Set current step
    this.createJobService.setCurrentStep('confirmation');
  }

  // Navigation to edit steps
  editOverview(): void {
    this.navigateToStep('overview');
  }

  editRequirements(): void {
    this.navigateToStep('requirements');
  }

  editTimelineBudget(): void {
    this.navigateToStep('timeline-budget');
  }

  editYourDetail(): void {
    this.navigateToStep('your-detail');
  }

  navigateToStep(step: string): void {
    const jobId = this.createJobService.jobId();
    if (jobId) {
      this.router.navigate(['/onboarding/job', 'edit', jobId, step]);
    } else {
      this.router.navigate(['/onboarding/job', step]);
    }
  }

  // Get step label for display
  getStepLabel(step: string): string {
    const labels: Record<string, string> = {
      'overview': 'Overview',
      'requirements': 'Requirements',
      'timeline-budget': 'Timeline & Budget',
      'your-detail': 'Your Detail',
    };
    return labels[step] || step;
  }

  // Display helpers
  getEmploymentTypeLabel(value: string): string {
    return EMPLOYMENT_TYPE_OPTIONS.find(o => o.value === value)?.label || value;
  }

  getJobLocationLabel(value: string): string {
    return JOB_LOCATION_OPTIONS.find(o => o.value === value)?.label || value;
  }

  getAccessModeLabel(value: string): string {
    return ACCESS_MODE_OPTIONS.find(o => o.value === value)?.label || value;
  }

  getExpertLevelLabel(value: string): string {
    return EXPERT_LEVEL_OPTIONS.find(o => o.id === value)?.name || value;
  }

  getStartDateLabel(value: string): string {
    return START_DATE_OPTIONS.find(o => o.value === value)?.label || value;
  }

  getDurationLabel(value: string): string {
    return DURATION_OPTIONS.find(o => o.value === value)?.label || value;
  }

  getPricingTypeLabel(value: string): string {
    return PRICING_TYPE_OPTIONS.find(o => o.value === value)?.label || value;
  }

  getCurrencySymbol(value: string): string {
    return CURRENCY_OPTIONS.find(o => o.value === value)?.symbol || value;
  }

  getCategoryName(categoryId: string): string {
    return this.createJobService.getCategoryName(categoryId);
  }

  getServiceTypeName(categoryId: string, serviceTypeId: string): string {
    return this.createJobService.getServiceTypeName(categoryId, serviceTypeId);
  }

  formatBudget(): string {
    const data = this.formData();
    const symbol = this.getCurrencySymbol(data.currency);
    const from = data.budget.fromAmount.toLocaleString();
    const to = data.budget.upToAmount ? data.budget.upToAmount.toLocaleString() : null;
    const suffix = data.budget.pricingType === 'hourly' ? '/hr' : '';

    if (to) {
      return `${symbol} ${from} - ${symbol} ${to}${suffix}`;
    }
    return `${symbol} ${from}${suffix}`;
  }

  formatStartDate(): string {
    const data = this.formData();
    if (data.startDateType === 'specific' && data.startDate) {
      return new Date(data.startDate).toLocaleDateString('en-MY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return this.getStartDateLabel(data.startDateType);
  }
}
