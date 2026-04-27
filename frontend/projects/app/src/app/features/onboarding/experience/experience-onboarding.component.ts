import { Component, computed, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ExperienceOnboardingService, type OnboardingStep } from './services/experience-onboarding.service';
import { ReferenceDataService } from '../services/reference-data.service';
import { environment } from '../../../../environments/environment';

interface Step {
  id: OnboardingStep;
  label: string;
  path: string;
}

@Component({
  selector: 'app-experience-onboarding',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './experience-onboarding.component.html',
})
export class ExperienceOnboardingComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly onboardingService = inject(ExperienceOnboardingService);
  private readonly referenceData = inject(ReferenceDataService);
  private readonly destroy$ = new Subject<void>();

  readonly webUrl = environment.webUrl;

  readonly steps: Step[] = [
    { id: 'basic-info', label: 'Your Experience', path: 'basic-info' },
    { id: 'audience', label: 'Your Audience', path: 'audience' },
    { id: 'booking', label: 'Booking Details', path: 'booking' },
    { id: 'tickets', label: 'Tickets', path: 'tickets' },
    { id: 'page', label: 'Your Page', path: 'page' },
    { id: 'details', label: 'More Details', path: 'details' },
    { id: 'confirm', label: 'Confirmation', path: 'confirm' },
  ];

  readonly currentStepIndex = signal(0);
  readonly currentPath = signal('basic-info');

  // Expose service state
  readonly isLoading = this.onboardingService.isLoading;
  readonly isSaving = this.onboardingService.isSaving;
  readonly isEditMode = this.onboardingService.isEditMode;
  readonly error = this.onboardingService.error;

  readonly progressMessage = computed(() => {
    const index = this.currentStepIndex();
    const messages = [
      "Let's Get Started!",
      'Doing great so far!',
      'Keep going!',
      'Halfway there!',
      'Almost there!',
      'Just a bit more!',
      'Final step!',
    ];
    return messages[index] || messages[0];
  });

  // Check if on confirm step
  isConfirmStep(): boolean {
    return this.currentPath() === 'confirm';
  }

  // Disable publish button on confirm step if not ready
  isPublishDisabled(): boolean {
    if (this.isConfirmStep()) {
      return !this.onboardingService.isReadyToPublish();
    }
    return false;
  }

  ngOnInit(): void {
    // Initialize reference data
    this.referenceData.loadExperienceReferenceData();

    // Check for returnUrl in query params
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const returnUrl = params['returnUrl'];
      if (returnUrl) {
        this.onboardingService.setReturnUrl(returnUrl);
      }
    });

    // Check for edit mode (experience ID in route)
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const experienceId = params['id'];
      if (experienceId) {
        this.loadExperienceForEdit(experienceId);
      }
    });

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

  private async loadExperienceForEdit(id: string): Promise<void> {
    const success = await this.onboardingService.loadExperience(id);
    if (!success) {
      // Handle error - could redirect or show error message
      console.error('Failed to load experience for editing');
    }
  }

  private updateCurrentStep(url: string): void {
    const stepIndex = this.steps.findIndex((step) => url.includes(step.path));
    if (stepIndex !== -1) {
      this.currentStepIndex.set(stepIndex);
      this.currentPath.set(this.steps[stepIndex].path);
      this.onboardingService.setCurrentStep(this.steps[stepIndex].id);
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
    return this.onboardingService.isStepValid(step.id);
  }

  goBack(): void {
    const currentIndex = this.currentStepIndex();
    if (currentIndex > 0) {
      const prevStep = this.steps[currentIndex - 1];
      this.navigateToStep(currentIndex - 1);
    } else {
      this.router.navigate(['/onboarding/experience/select-type']);
    }
  }

  async saveAndExit(): Promise<void> {
    const result = await this.onboardingService.saveDraft();
    if (result) {
      this.navigateBack();
    }
  }

  async continue(): Promise<void> {
    const currentIndex = this.currentStepIndex();
    if (currentIndex === this.steps.length - 1) {
      // On confirm step - publish the experience
      await this.publish();
    } else if (currentIndex < this.steps.length - 1) {
      this.navigateToStep(currentIndex + 1);
    }
  }

  async publish(): Promise<void> {
    if (!this.onboardingService.isReadyToPublish()) {
      console.warn('Cannot publish: validation failed');
      return;
    }

    const result = await this.onboardingService.publish();
    if (result) {
      this.navigateBack();
    }
  }

  private navigateBack(): void {
    const returnUrl = this.onboardingService.returnUrl();
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
    } else {
      this.router.navigate(['/hub/services/experiences']);
    }
  }

  navigateToStep(index: number): void {
    const step = this.steps[index];
    const experienceId = this.onboardingService.experienceId();
    
    if (experienceId) {
      // Edit mode - include experience ID in route
      this.router.navigate(['/onboarding/experience/platform', experienceId, step.path]);
    } else {
      // Create mode
      this.router.navigate(['/onboarding/experience/platform', step.path]);
    }
  }

  // Check if we can proceed to the next step
  canContinue(): boolean {
    const currentIndex = this.currentStepIndex();
    // On confirm step, check if ready to publish
    if (currentIndex === this.steps.length - 1) {
      return this.onboardingService.isReadyToPublish();
    }
    // For other steps, just return true (validation happens per-step)
    return true;
  }

  // Get button text based on current step
  getContinueButtonText(): string {
    const currentIndex = this.currentStepIndex();
    if (currentIndex === this.steps.length - 1) {
      return 'Publish';
    }
    return 'Continue';
  }
}
