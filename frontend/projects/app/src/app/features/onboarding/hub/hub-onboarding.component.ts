import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import {
  UiButtonComponent,
  UiFormPageComponent,
  UiFormPageHeaderComponent,
  UiFormPageBodyComponent,
  UiFormPageFooterComponent,
  IconComponent,
} from '@mereka/ui';
import { environment } from '../../../../environments/environment';

interface OnboardingStep {
  saveProfile?: () => Promise<void>;
  isFormValid?: () => boolean;
  isSaving?: () => boolean;
  validateForm?: () => boolean;
}

interface Step {
  path: string;
  showBack: boolean;
  showFooter: boolean;
  showSaveExit: boolean;
  showStepper: boolean;
  nextText: string;
}

interface StepperItem {
  path: string;
  label: string;
  stepIndex: number;
}

@Component({
  selector: 'app-hub-onboarding',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    UiButtonComponent,
    UiFormPageComponent,
    UiFormPageHeaderComponent,
    UiFormPageBodyComponent,
    UiFormPageFooterComponent,
    IconComponent,
  ],
  template: `
    <ui-form-page>
      <ui-form-page-header>
        <a logo [href]="webUrl" class="flex items-center">
          <img src="assets/images/logo.svg" alt="Mereka" class="h-8" />
        </a>

        <!-- Stepper Navigation -->
        @if (showStepper()) {
          <nav stepper class="flex items-center gap-2">
            @for (item of stepperItems; track item.path) {
              <button
                type="button"
                (click)="navigateToStep(item.path)"
                class="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                [class.bg-primary]="isCurrentStepperItem(item.path)"
                [class.text-white]="isCurrentStepperItem(item.path)"
                [class.bg-amber-100]="!isCurrentStepperItem(item.path) && isStepIncomplete(item.stepIndex)"
                [class.text-amber-700]="!isCurrentStepperItem(item.path) && isStepIncomplete(item.stepIndex)"
                [class.text-neutral-600]="!isCurrentStepperItem(item.path) && !isStepIncomplete(item.stepIndex)"
                [class.hover:bg-neutral-100]="!isCurrentStepperItem(item.path)"
              >
                @if (!isCurrentStepperItem(item.path) && isStepIncomplete(item.stepIndex)) {
                  <ui-icon name="error" class="w-4 h-4"></ui-icon>
                }
                {{ item.label }}
              </button>
            }
          </nav>
        }

        </ui-form-page-header>

      <ui-form-page-body>
        <router-outlet (activate)="onActivate($event)"></router-outlet>
      </ui-form-page-body>

      @if (showFooter()) {
        <ui-form-page-footer>
          @if (showBackButton()) {
            <button
              left
              type="button"
              (click)="goBack()"
              class="px-6 py-2.5 border border-neutral-300 rounded-full text-neutral-700 font-medium hover:bg-neutral-50 transition-colors"
            >
              Back
            </button>
          }
          <ui-button [loading]="isSaving()" (click)="goNext()">{{ nextButtonText() }}</ui-button>
        </ui-form-page-footer>
      }
    </ui-form-page>
  `,
})
export class HubOnboardingComponent {
  readonly webUrl = environment.webUrl;
  currentStep = signal(0);
  currentPath = signal('');
  isSaving = signal(false);
  private activeStep: OnboardingStep | null = null;

  private steps: Step[] = [
    { path: 'form', showBack: true, showFooter: true, showSaveExit: false, showStepper: false, nextText: 'Continue' },
    { path: 'pricing', showBack: true, showFooter: false, showSaveExit: false, showStepper: false, nextText: '' },
    { path: 'payment-loader', showBack: false, showFooter: false, showSaveExit: false, showStepper: false, nextText: '' },
    { path: 'setup', showBack: false, showFooter: false, showSaveExit: false, showStepper: false, nextText: '' },
    // profile, about, details have their own footers in component templates
    { path: 'profile', showBack: false, showFooter: false, showSaveExit: true, showStepper: true, nextText: 'Continue' },
    { path: 'about', showBack: true, showFooter: false, showSaveExit: true, showStepper: true, nextText: 'Continue' },
    { path: 'details', showBack: true, showFooter: false, showSaveExit: true, showStepper: true, nextText: 'Continue' },
    { path: 'confirm', showBack: false, showFooter: false, showSaveExit: false, showStepper: true, nextText: '' },
  ];

  stepperItems: StepperItem[] = [
    { path: 'profile', label: 'Your Business', stepIndex: 4 },
    { path: 'about', label: 'About Business', stepIndex: 5 },
    { path: 'details', label: 'Business Details', stepIndex: 6 },
    { path: 'confirm', label: 'Confirmation', stepIndex: 7 },
  ];

  showBackButton = computed(() => {
    const step = this.steps[this.currentStep()];
    return step?.showBack ?? false;
  });

  showFooter = computed(() => {
    const step = this.steps[this.currentStep()];
    return step?.showFooter ?? true;
  });

  showSaveExit = computed(() => {
    const step = this.steps[this.currentStep()];
    return step?.showSaveExit ?? false;
  });

  showStepper = computed(() => {
    const step = this.steps[this.currentStep()];
    return step?.showStepper ?? false;
  });

  nextButtonText = computed(() => {
    const step = this.steps[this.currentStep()];
    return step?.nextText ?? 'Continue';
  });

  isCurrentStepperItem(path: string): boolean {
    return this.currentPath() === path;
  }

  isStepIncomplete(stepIndex: number): boolean {
    // For now, mark steps after current as incomplete (showing warning)
    // You can implement actual form validation logic here
    return stepIndex > this.currentStep();
  }

  navigateToStep(path: string): void {
    this.router.navigate(['/onboarding/hub', path]);
  }

  onActivate(component: OnboardingStep): void {
    this.activeStep = component;
  }

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects;
        const stepIndex = this.steps.findIndex((s) => url.includes(s.path));
        if (stepIndex >= 0) {
          this.currentStep.set(stepIndex);
          this.currentPath.set(this.steps[stepIndex].path);
        }
      });
  }

  goBack(): void {
    const currentPath = this.steps[this.currentStep()].path;

    // Special case: form goes back to welcome page
    if (currentPath === 'form') {
      this.router.navigate(['/welcome/hub']);
      return;
    }

    // Define the back navigation flow
    const backNavigation: Record<string, string> = {
      pricing: 'form',
      profile: 'setup',
      about: 'profile',
      details: 'about',
      confirm: 'details',
    };

    const backPath = backNavigation[currentPath];
    if (backPath) {
      this.router.navigate(['/onboarding/hub', backPath]);
    }
  }

  async goNext(): Promise<void> {
    const currentPath = this.steps[this.currentStep()].path;

    // If the active step has a saveProfile method, validate and save first
    if (this.activeStep?.saveProfile) {
      // Validate form first
      if (this.activeStep.validateForm) {
        const isValid = this.activeStep.validateForm();
        if (!isValid) return;
      }

      this.isSaving.set(true);
      try {
        await this.activeStep.saveProfile();
      } catch (error) {
        console.error('Error saving:', error);
        this.isSaving.set(false);
        return; // Don't navigate if save fails
      }
      this.isSaving.set(false);
    }

    // Define the forward navigation flow
    const forwardNavigation: Record<string, string | null> = {
      form: 'pricing', // Goes to pricing selection
      pricing: 'payment-loader',
      setup: 'profile',
      profile: 'about',
      about: 'details',
      details: 'confirm',
      confirm: null, // Submit - goes to dashboard
    };

    const nextPath = forwardNavigation[currentPath];

    if (nextPath === null) {
      // Submit and go to hub dashboard
      this.router.navigate(['/hub']);
    } else if (nextPath) {
      this.router.navigate(['/onboarding/hub', nextPath]);
    }
  }

  saveAndExit(): void {
    // Save to localStorage is already handled by each form component
    // Redirect to hub dashboard
    this.router.navigate(['/hub']);
  }
}
