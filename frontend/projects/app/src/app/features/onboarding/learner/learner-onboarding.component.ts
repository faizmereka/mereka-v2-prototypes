import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import {
  UiFormPageComponent,
  UiFormPageHeaderComponent,
  UiFormPageBodyComponent,
  UiFormPageFooterComponent,
  UiButtonComponent,
} from '@mereka/ui';
import { environment } from '../../../../environments/environment';

interface OnboardingStep {
  saveProfile?: () => Promise<void>;
  isFormValid?: () => boolean;
  isSaving?: () => boolean;
  validateForm?: () => boolean;
}

@Component({
  selector: 'app-learner-onboarding',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    UiFormPageComponent,
    UiFormPageHeaderComponent,
    UiFormPageBodyComponent,
    UiFormPageFooterComponent,
    UiButtonComponent,
  ],
  template: `
    <ui-form-page>
      <ui-form-page-header>
        <a logo [href]="webUrl" class="flex items-center">
          <img src="assets/images/logo.svg" alt="Mereka" class="h-8" />
        </a>
      </ui-form-page-header>

      <ui-form-page-body>
        <router-outlet (activate)="onActivate($event)"></router-outlet>
      </ui-form-page-body>

      <ui-form-page-footer>
        <button
          left
          type="button"
          class="px-6 py-2.5 border border-neutral-300 rounded-full text-neutral-700 font-medium hover:bg-neutral-50 transition-colors"
        >
          Back
        </button>
        <ui-button
          [loading]="isSaving()"
          (click)="onContinue()"
        >
          Continue
        </ui-button>
      </ui-form-page-footer>
    </ui-form-page>
  `,
})
export class LearnerOnboardingComponent {
  private readonly router = inject(Router);
  private activeStep: OnboardingStep | null = null;

  readonly webUrl = environment.webUrl;
  isSaving = signal(false);
  canContinue = signal(false);

  onActivate(component: OnboardingStep): void {
    this.activeStep = component;
    // Update canContinue based on the active step's form validity
    if (component.isFormValid) {
      // Check periodically for form validity changes
      this.updateCanContinue();
    }
  }

  private updateCanContinue(): void {
    if (this.activeStep?.isFormValid) {
      this.canContinue.set(this.activeStep.isFormValid());
    }
  }

  async onContinue(): Promise<void> {
    if (!this.activeStep?.saveProfile) return;

    // Validate form first - this will show errors
    if (this.activeStep.validateForm) {
      const isValid = this.activeStep.validateForm();
      if (!isValid) return;
    }

    this.isSaving.set(true);
    try {
      await this.activeStep.saveProfile();
      // Navigate to hub onboarding after profile completion
      this.router.navigate(['/onboarding/hub/form']);
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      this.isSaving.set(false);
    }
  }
}

