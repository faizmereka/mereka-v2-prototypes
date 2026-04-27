import { Component, OnInit, OnDestroy, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs';
import { ToastService } from '@mereka/ui';
import { ExpertOnboardingService } from './services';
import type { ExpertOnboardingStep } from './models';

interface StepConfig {
  id: ExpertOnboardingStep;
  path: string;
  title: string;
  shortTitle: string;
}

@Component({
  selector: 'app-expert-onboarding',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="h-screen flex flex-col bg-neutral-50 overflow-hidden">
      <!-- Loading Overlay -->
      @if (onboarding.isLoading()) {
        <div class="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
          <div class="flex flex-col items-center gap-4">
            <div class="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-sm text-neutral-600">Loading your profile...</p>
          </div>
        </div>
      }

      <!-- Header with Step Navigation -->
      <header class="flex-shrink-0 bg-white border-b border-neutral-200">
        <div class="grid grid-cols-3 items-center px-6 py-4">
          <!-- Logo (Left) -->
          <div class="flex items-center">
            <a href="/" class="inline-block">
              <img src="/assets/images/mereka-logo.svg" alt="Mereka" class="h-8" />
            </a>
          </div>

          <!-- Step Navigation (Center - Desktop) -->
          <nav class="hidden lg:flex items-center justify-center gap-1">
            @for (step of steps; track step.id; let i = $index) {
              <button
                type="button"
                (click)="navigateToStep(step)"
                [disabled]="!canNavigateToStep(step)"
                class="px-4 py-2 text-sm font-medium rounded-full transition-colors"
                [class.bg-neutral-900]="isActiveStep(step)"
                [class.text-white]="isActiveStep(step)"
                [class.text-neutral-600]="!isActiveStep(step)"
                [class.hover:text-neutral-900]="!isActiveStep(step) && canNavigateToStep(step)"
                [class.hover:bg-neutral-100]="!isActiveStep(step) && canNavigateToStep(step)"
                [class.opacity-50]="!canNavigateToStep(step)"
                [class.cursor-not-allowed]="!canNavigateToStep(step)"
              >
                {{ step.shortTitle }}
              </button>
            }
          </nav>

          <!-- Mobile: Current Step Indicator (Center) -->
          <div class="lg:hidden flex justify-center text-sm text-neutral-600">
            Step {{ currentStepIndex() + 1 }} of {{ steps.length }}
          </div>

          <!-- Right side placeholder for balance -->
          <div class="hidden lg:block"></div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto">
        <div class="max-w-6xl mx-auto px-4 lg:px-8 py-8 lg:py-12">
          <!-- Progress Message -->
          <h1 class="text-2xl lg:text-3xl font-bold text-center text-neutral-900 mb-8">
            {{ progressMessage() }}
          </h1>

          <!-- Step Content -->
          <router-outlet></router-outlet>
        </div>
      </main>

      <!-- Footer -->
      <footer class="flex-shrink-0 bg-white border-t border-neutral-200 px-6 py-4">
        <div class="flex items-center justify-between max-w-6xl mx-auto">
          <button
            type="button"
            (click)="goBack()"
            [disabled]="currentStepIndex() === 0 || onboarding.isSaving()"
            class="px-8 py-3 text-sm font-semibold border border-neutral-200 rounded-full hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>

          <button
            type="button"
            (click)="saveAndExit()"
            [disabled]="onboarding.isSaving()"
            class="text-sm font-semibold text-neutral-700 hover:text-neutral-900 transition-colors disabled:opacity-50"
          >
            @if (onboarding.isSaving()) {
              <span class="flex items-center gap-2">
                <span class="w-4 h-4 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin"></span>
                Saving...
              </span>
            } @else {
              Save and Exit
            }
          </button>

          <button
            type="button"
            (click)="onContinueClick()"
            [disabled]="!canProceed() || onboarding.isSaving()"
            class="px-8 py-3 text-sm font-semibold text-white bg-neutral-900 rounded-full hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ getContinueButtonText() }}
          </button>
        </div>
      </footer>
    </div>
  `,
})
export class ExpertOnboardingComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly onboarding = inject(ExpertOnboardingService);

  private routerSubscription: any;

  readonly steps: StepConfig[] = [
    { id: 'your-profile', path: 'your-profile', title: 'Your Profile', shortTitle: 'Profile' },
    { id: 'your-skills', path: 'your-skills', title: 'Your Skills', shortTitle: 'Skills' },
    { id: 'your-background', path: 'your-background', title: 'Your Background', shortTitle: 'Background' },
    { id: 'confirmation', path: 'confirmation', title: 'Confirmation', shortTitle: 'Review' },
  ];

  readonly currentStepIndex = computed(() => {
    const current = this.onboarding.currentStep();
    return this.steps.findIndex((s) => s.id === current);
  });

  readonly currentStepConfig = computed(() => {
    const index = this.currentStepIndex();
    return index >= 0 ? this.steps[index] : null;
  });

  readonly progressMessage = computed(() => {
    const index = this.currentStepIndex();
    const messages = [
      "Let's set up your profile!",
      'Tell us about your skills',
      'Share your background',
      'Review and confirm',
    ];
    return messages[index] || messages[0];
  });

  getContinueButtonText(): string {
    const currentIndex = this.currentStepIndex();
    if (currentIndex === this.steps.length - 2) {
      return 'Review & Submit';
    }
    if (currentIndex === this.steps.length - 1) {
      return 'Complete Profile';
    }
    return 'Continue';
  }

  ngOnInit(): void {
    // Initialize the onboarding service
    this.onboarding.initialize();

    // Check for return URL in query params
    this.route.queryParams.subscribe((params) => {
      if (params['returnUrl']) {
        this.onboarding.setReturnUrl(params['returnUrl']);
      }
    });

    // Listen for route changes to sync step state
    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.syncStepFromUrl(event.url);
      });

    // Initial sync
    this.syncStepFromUrl(this.router.url);
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private syncStepFromUrl(url: string): void {
    for (const step of this.steps) {
      if (url.includes(step.path)) {
        this.onboarding.setCurrentStep(step.id);
        break;
      }
    }
  }

  isActiveStep(step: StepConfig): boolean {
    return this.onboarding.currentStep() === step.id;
  }

  isStepCompleted(step: StepConfig): boolean {
    const stepIndex = this.steps.findIndex((s) => s.id === step.id);
    const currentIndex = this.currentStepIndex();
    return stepIndex < currentIndex || this.onboarding.hasVisitedStep(step.id);
  }

  canNavigateToStep(step: StepConfig): boolean {
    const stepIndex = this.steps.findIndex((s) => s.id === step.id);
    const currentIndex = this.currentStepIndex();

    // Can always go back
    if (stepIndex <= currentIndex) return true;

    // Can go forward if current step is valid
    if (stepIndex === currentIndex + 1) {
      return this.onboarding.isStepValid(this.steps[currentIndex].id);
    }

    // Can jump to any visited step
    return this.onboarding.hasVisitedStep(step.id);
  }

  navigateToStep(step: StepConfig): void {
    if (this.canNavigateToStep(step)) {
      this.onboarding.setCurrentStep(step.id);
      this.router.navigate(['/onboarding/expert', step.path]);
    }
  }

  canProceed(): boolean {
    const current = this.onboarding.currentStep();
    return this.onboarding.isStepValid(current);
  }

  isLastStep(): boolean {
    const currentIndex = this.currentStepIndex();
    // Last step before confirmation (index 2 = background)
    return currentIndex === this.steps.length - 2;
  }

  isConfirmationStep(): boolean {
    return this.currentStepIndex() === this.steps.length - 1;
  }

  onContinueClick(): void {
    if (this.isConfirmationStep()) {
      this.completeProfile();
    } else if (this.isLastStep()) {
      this.goToConfirmation();
    } else {
      this.goNext();
    }
  }

  async completeProfile(): Promise<void> {
    const success = await this.onboarding.save();
    if (success) {
      this.toast.success('Profile completed successfully!');
      // Navigate to return URL or hub dashboard
      const returnUrl = this.onboarding.returnUrl();
      if (returnUrl) {
        this.router.navigateByUrl(returnUrl);
      } else {
        this.router.navigate(['/hub/overview']);
      }
    } else {
      const error = this.onboarding.error();
      this.toast.error(error || 'Failed to save profile. Please try again.');
    }
  }

  goNext(): void {
    if (!this.canProceed()) return;

    const currentIndex = this.currentStepIndex();
    if (currentIndex < this.steps.length - 1) {
      const nextStep = this.steps[currentIndex + 1];
      this.navigateToStep(nextStep);
    }
  }

  goBack(): void {
    const currentIndex = this.currentStepIndex();
    if (currentIndex > 0) {
      const prevStep = this.steps[currentIndex - 1];
      this.navigateToStep(prevStep);
    }
  }

  goToConfirmation(): void {
    const confirmationStep = this.steps.find((s) => s.id === 'confirmation');
    if (confirmationStep) {
      this.navigateToStep(confirmationStep);
    }
  }

  async saveAndExit(): Promise<void> {
    const success = await this.onboarding.save();

    if (success) {
      this.toast.success('Progress saved successfully!');
      // Navigate to return URL or hub dashboard
      const returnUrl = this.onboarding.returnUrl();
      if (returnUrl) {
        this.router.navigateByUrl(returnUrl);
      } else {
        this.router.navigate(['/hub/overview']);
      }
    } else {
      const error = this.onboarding.error();
      this.toast.error(error || 'Failed to save progress. Please try again.');
    }
  }
}
