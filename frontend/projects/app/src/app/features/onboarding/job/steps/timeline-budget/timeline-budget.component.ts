import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CreateJobService } from '../../services/create-job.service';
import {
  START_DATE_OPTIONS,
  DURATION_OPTIONS,
  PRICING_TYPE_OPTIONS,
  CURRENCY_OPTIONS,
} from '../../models';

@Component({
  selector: 'app-job-timeline-budget',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './timeline-budget.component.html',
})
export class JobTimelineBudgetComponent implements OnInit, OnDestroy {
  private readonly createJobService = inject(CreateJobService);
  private readonly destroy$ = new Subject<void>();

  // Form from service
  readonly form: FormGroup = this.createJobService.timelineBudgetForm;

  // Options
  readonly startDateOptions = START_DATE_OPTIONS;
  readonly durationOptions = DURATION_OPTIONS;
  readonly pricingTypeOptions = PRICING_TYPE_OPTIONS;
  readonly currencyOptions = CURRENCY_OPTIONS;

  // UI state
  readonly showDatePicker = signal(false);
  readonly minDate = signal(this.getMinDate());

  ngOnInit(): void {
    // Set current step
    this.createJobService.setCurrentStep('timeline-budget');

    // Watch for start date type changes
    this.form.get('startDateType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.showDatePicker.set(value === 'specific');
        if (value !== 'specific') {
          this.form.patchValue({ startDate: null });
        }
      });

    // Initialize date picker visibility
    this.showDatePicker.set(this.form.get('startDateType')?.value === 'specific');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getMinDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  getCurrencySymbol(): string {
    const currency = this.form.get('currency')?.value;
    const option = this.currencyOptions.find(c => c.value === currency);
    return option?.symbol || 'RM';
  }

  getPricingLabel(): string {
    const pricingType = this.form.get('pricingType')?.value;
    return pricingType === 'hourly' ? 'per hour' : 'total';
  }
}
