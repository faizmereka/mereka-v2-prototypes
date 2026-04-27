import { Component, computed, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { CreateJobService } from './services/create-job.service';
import { environment } from '../../../../environments/environment';
import type { CreateJobStep } from './models';

interface Step {
  id: CreateJobStep;
  label: string;
  path: string;
}

@Component({
  selector: 'app-create-job',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './create-job.component.html',
})
export class CreateJobComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly createJobService = inject(CreateJobService);
  private readonly destroy$ = new Subject<void>();

  readonly webUrl = environment.webUrl;

  readonly steps: Step[] = [
    { id: 'overview', label: 'Overview', path: 'overview' },
    { id: 'requirements', label: 'Requirements', path: 'requirements' },
    { id: 'timeline-budget', label: 'Timeline & Budget', path: 'timeline-budget' },
    { id: 'your-detail', label: 'Your Detail', path: 'your-detail' },
    { id: 'confirmation', label: 'Confirmation', path: 'confirmation' },
  ];

  readonly currentStepIndex = signal(0);
  readonly currentPath = signal('overview');

  // Expose service state
  readonly isLoading = this.createJobService.isLoading;
  readonly isSaving = this.createJobService.isSaving;
  readonly isEditMode = this.createJobService.isEditMode;
  readonly error = this.createJobService.error;

  readonly progressMessage = computed(() => {
    const index = this.currentStepIndex();
    const messages = [
      "Let's Get Started!",
      'Define Your Requirements',
      'Set Timeline & Budget',
      'Your Contact Details',
      'Review & Publish',
    ];
    return messages[index] || messages[0];
  });

  // Check if on confirm step
  isConfirmStep(): boolean {
    return this.currentPath() === 'confirmation';
  }

  // Disable publish button on confirm step if not ready
  isPublishDisabled(): boolean {
    if (this.isConfirmStep()) {
      return !this.createJobService.isReadyToPublish();
    }
    return false;
  }

  ngOnInit(): void {
    // Initialize service (load categories, prefill user data)
    void this.createJobService.initialize();

    // Check for returnUrl and id in query params
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const returnUrl = params['returnUrl'];
      if (returnUrl) {
        this.createJobService.setReturnUrl(returnUrl);
      }
      // Also support id in query params for backward compatibility
      const queryId = params['id'];
      if (queryId && !this.createJobService.jobId()) {
        void this.loadJobForEdit(queryId);
      }
    });

    // Check for edit mode (job ID in route params - primary method)
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const jobId = params['id'];
      if (jobId) {
        void this.loadJobForEdit(jobId);
      }
    });

    // Also extract ID from URL for direct navigation (e.g., /onboarding/job/edit/{id}/confirmation)
    const urlMatch = this.router.url.match(/\/edit\/([a-f0-9]+)/i);
    if (urlMatch && urlMatch[1] && !this.createJobService.jobId()) {
      void this.loadJobForEdit(urlMatch[1]);
    }

    // Track navigation changes
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        const url = (event as NavigationEnd).urlAfterRedirects;
        this.updateCurrentStep(url);
      });

    // Set initial step based on current URL
    this.updateCurrentStep(this.router.url);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadJobForEdit(id: string): Promise<void> {
    const success = await this.createJobService.loadJob(id);
    if (!success) {
      console.error('Failed to load job for editing');
    }
  }

  private updateCurrentStep(url: string): void {
    const stepIndex = this.steps.findIndex((step) => url.includes(step.path));
    if (stepIndex !== -1) {
      this.currentStepIndex.set(stepIndex);
      this.currentPath.set(this.steps[stepIndex].path);
      this.createJobService.setCurrentStep(this.steps[stepIndex].id);
    }
  }

  isStepActive(index: number): boolean {
    return index === this.currentStepIndex();
  }

  isStepCompleted(index: number): boolean {
    return index < this.currentStepIndex();
  }

  isStepValid(index: number): boolean {
    const step = this.steps[index];
    return this.createJobService.isStepValid(step.id);
  }

  // Check if step has validation errors (for showing error indicator)
  stepHasErrors(index: number): boolean {
    const step = this.steps[index];
    return this.createJobService.stepHasErrors(step.id);
  }

  goBack(): void {
    const currentIndex = this.currentStepIndex();
    if (currentIndex > 0) {
      this.navigateToStep(currentIndex - 1);
    } else {
      this.router.navigate(['/hub/jobs/posts']);
    }
  }

  async saveAndExit(): Promise<void> {
    const result = await this.createJobService.saveDraft();
    if (result) {
      this.navigateBack();
    }
  }

  async continue(): Promise<void> {
    const currentIndex = this.currentStepIndex();
    if (currentIndex === this.steps.length - 1) {
      // On confirm step - publish the job
      await this.publish();
    } else if (currentIndex < this.steps.length - 1) {
      this.navigateToStep(currentIndex + 1);
    }
  }

  async publish(): Promise<void> {
    if (!this.createJobService.isReadyToPublish()) {
      console.warn('Cannot publish: validation failed');
      return;
    }

    const result = await this.createJobService.publish();
    if (result) {
      this.navigateBack();
    }
  }

  private navigateBack(): void {
    const returnUrl = this.createJobService.returnUrl();
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
    } else {
      this.router.navigate(['/hub/jobs/posts']);
    }
  }

  navigateToStep(index: number): void {
    const step = this.steps[index];
    const jobId = this.createJobService.jobId();

    if (jobId) {
      // Edit mode - include job ID in route
      this.router.navigate(['/onboarding/job', 'edit', jobId, step.path]);
    } else {
      // Create mode
      this.router.navigate(['/onboarding/job', step.path]);
    }
  }

  // Check if we can proceed to the next step
  canContinue(): boolean {
    const currentIndex = this.currentStepIndex();
    // On confirm step, check if ready to publish
    if (currentIndex === this.steps.length - 1) {
      return this.createJobService.isReadyToPublish();
    }
    // For other steps, just return true (validation happens per-step)
    return true;
  }

  // Get button text based on current step
  getContinueButtonText(): string {
    const currentIndex = this.currentStepIndex();
    if (currentIndex === this.steps.length - 1) {
      return 'Post this job';
    }
    return 'Continue';
  }
}
