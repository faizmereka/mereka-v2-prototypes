import { Component, computed, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ExpertiseOnboardingService, type OnboardingStep } from './services/expertise-onboarding.service';
import { environment } from '../../../../environments/environment';

interface Step {
  id: OnboardingStep;
  label: string;
  path: string;
}

@Component({
  selector: 'app-expertise-onboarding',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './expertise-onboarding.component.html',
})
export class ExpertiseOnboardingComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly onboardingService = inject(ExpertiseOnboardingService);
  private readonly destroy$ = new Subject<void>();

  readonly webUrl = environment.webUrl;

  readonly steps: Step[] = [
    { id: 'your-expertise', label: 'Your Expertise', path: 'your-expertise' },
    { id: 'availability-rates', label: 'Availability & Rates', path: 'availability-rates' },
    { id: 'booking-details', label: 'Booking Details', path: 'booking-details' },
    { id: 'confirmation', label: 'Confirmation', path: 'confirmation' },
  ];

  readonly currentStepIndex = signal(0);
  readonly currentPath = signal('your-expertise');

  // Expose service state
  readonly isLoading = this.onboardingService.isLoading;
  readonly isSaving = this.onboardingService.isSaving;
  readonly isEditMode = this.onboardingService.isEditMode;
  readonly error = this.onboardingService.error;

  readonly progressMessage = computed(() => {
    const index = this.currentStepIndex();
    const messages = [
      "Let's Get Started!",
      'Set your availability & rates',
      'Add your booking details',
      'Almost there!',
    ];
    return messages[index] || messages[0];
  });

  ngOnInit(): void {
    // Check for edit mode (expertise ID in route)
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(async (params) => {
      const expertiseId = params['id'];
      if (expertiseId) {
        // Edit mode - load from API
        const loaded = await this.onboardingService.loadExpertise(expertiseId);
        if (!loaded) {
          console.error('Failed to load expertise:', expertiseId);
          this.router.navigate(['/hub/services/expertise']);
        }
      } else {
        // Create mode - reset forms
        this.onboardingService.reset();
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

  isConfirmStep(): boolean {
    return this.currentPath() === 'confirmation';
  }

  isPublishDisabled(): boolean {
    if (this.isConfirmStep()) {
      return !this.onboardingService.isReadyToPublish() || this.isSaving();
    }
    return false;
  }

  goBack(): void {
    const currentIndex = this.currentStepIndex();
    if (currentIndex > 0) {
      this.navigateToStep(currentIndex - 1);
    } else {
      // Go back to hub services
      this.router.navigate(['/hub/services/expertise']);
    }
  }

  async saveAndExit(): Promise<void> {
    // Save as draft via API and navigate away
    const savedId = await this.onboardingService.saveAsDraft();
    if (savedId) {
      this.router.navigate(['/hub/services/expertise']);
    }
  }

  continue(): void {
    const currentIndex = this.currentStepIndex();

    if (currentIndex === this.steps.length - 1) {
      // On confirm step - publish via API
      this.publish();
    } else if (currentIndex < this.steps.length - 1) {
      this.navigateToStep(currentIndex + 1);
    }
  }

  async publish(): Promise<void> {
    if (!this.onboardingService.isReadyToPublish()) {
      console.warn('Cannot publish: validation failed');
      return;
    }

    const success = await this.onboardingService.publish();
    if (success) {
      this.onboardingService.reset();
      this.router.navigate(['/hub/services/expertise']);
    } else {
      console.error('Failed to publish expertise:', this.error());
    }
  }

  navigateToStep(index: number): void {
    const step = this.steps[index];
    const expertiseId = this.onboardingService.expertiseId();

    if (expertiseId) {
      // Edit mode - include expertise ID in route
      this.router.navigate(['/onboarding/expertise', expertiseId, step.path]);
    } else {
      // Create mode
      this.router.navigate(['/onboarding/expertise', step.path]);
    }
  }

  getContinueButtonText(): string {
    const currentIndex = this.currentStepIndex();
    if (currentIndex === this.steps.length - 1) {
      return this.isSaving() ? 'Publishing...' : 'Publish';
    }
    return 'Continue';
  }
}
