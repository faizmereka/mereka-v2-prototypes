import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CreateJobService } from '../../services/create-job.service';
import {
  EMPLOYMENT_TYPE_OPTIONS,
  JOB_LOCATION_OPTIONS,
  ACCESS_MODE_OPTIONS,
  EXPERT_LEVEL_OPTIONS,
} from '../../models';

@Component({
  selector: 'app-job-overview',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './overview.component.html',
})
export class JobOverviewComponent implements OnInit, OnDestroy {
  private readonly createJobService = inject(CreateJobService);
  private readonly destroy$ = new Subject<void>();

  // Form from service
  readonly form: FormGroup = this.createJobService.overviewForm;

  // Reference data
  readonly categories = this.createJobService.categories;
  readonly serviceTypesForCategory = this.createJobService.serviceTypesForCategory;

  // Options
  readonly employmentTypeOptions = EMPLOYMENT_TYPE_OPTIONS;
  readonly jobLocationOptions = JOB_LOCATION_OPTIONS;
  readonly accessModeOptions = ACCESS_MODE_OPTIONS;
  readonly expertLevelOptions = EXPERT_LEVEL_OPTIONS;

  // UI state
  readonly titleLength = signal(0);
  readonly maxTitleLength = 70;

  ngOnInit(): void {
    // Set current step
    this.createJobService.setCurrentStep('overview');

    // Track title length
    this.updateTitleLength(this.form.get('jobTitle')?.value || '');

    this.form.get('jobTitle')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.updateTitleLength(value || '');
      });
  }

  /**
   * Handle category change - updates service types
   */
  onCategoryChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.createJobService.setSelectedCategory(select.value);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateTitleLength(value: string): void {
    this.titleLength.set(value.length);
  }

  onTitleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value.length > this.maxTitleLength) {
      input.value = input.value.substring(0, this.maxTitleLength);
      this.form.patchValue({ jobTitle: input.value });
    }
  }

  getCategoryName(categoryId: string): string {
    return this.createJobService.getCategoryName(categoryId);
  }
}
