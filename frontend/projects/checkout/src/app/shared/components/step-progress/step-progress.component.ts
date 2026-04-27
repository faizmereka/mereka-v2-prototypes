import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';

export type CheckoutStep = 1 | 2 | 3;

@Component({
  selector: 'app-step-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="sticky top-0 z-50 bg-white border-b border-neutral-200">
      <div class="max-w-4xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <!-- Logo -->
          <a [href]="webUrl" class="flex-shrink-0">
            <img src="/assets/images/mereka-logo.svg" alt="Mereka" class="h-8 w-auto" />
          </a>

          <!-- Steps -->
          <div class="flex items-center gap-4 md:gap-6">
            <!-- Step 1 -->
            <button
              class="flex items-center gap-2"
              [class.cursor-pointer]="canGoToStep(1)"
              [disabled]="!canGoToStep(1)"
            >
              @if (currentStep() > 1) {
                <span class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </span>
              } @else {
                <span
                  class="w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium"
                  [class.bg-black]="currentStep() === 1"
                  [class.text-white]="currentStep() === 1"
                  [class.bg-neutral-200]="currentStep() !== 1"
                  [class.text-neutral-500]="currentStep() !== 1"
                >1</span>
              }
              <span
                class="hidden sm:block text-sm"
                [class.font-medium]="currentStep() === 1"
                [class.text-neutral-500]="currentStep() !== 1"
              >Slot & Tickets</span>
            </button>

            <!-- Step 2 -->
            <button
              class="flex items-center gap-2"
              [class.cursor-pointer]="canGoToStep(2)"
              [disabled]="!canGoToStep(2)"
            >
              @if (currentStep() > 2) {
                <span class="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </span>
              } @else {
                <span
                  class="w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium"
                  [class.bg-black]="currentStep() === 2"
                  [class.text-white]="currentStep() === 2"
                  [class.bg-neutral-200]="currentStep() !== 2"
                  [class.text-neutral-500]="currentStep() !== 2"
                >2</span>
              }
              <span
                class="hidden sm:block text-sm"
                [class.font-medium]="currentStep() === 2"
                [class.text-neutral-500]="currentStep() !== 2"
              >Your Details</span>
            </button>

            <!-- Step 3 -->
            <button
              class="flex items-center gap-2"
              [disabled]="!canGoToStep(3)"
            >
              <span
                class="w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium"
                [class.bg-black]="currentStep() === 3"
                [class.text-white]="currentStep() === 3"
                [class.bg-neutral-200]="currentStep() !== 3"
                [class.text-neutral-500]="currentStep() !== 3"
              >3</span>
              <span
                class="hidden sm:block text-sm"
                [class.font-medium]="currentStep() === 3"
                [class.text-neutral-500]="currentStep() !== 3"
              >Payment</span>
            </button>
          </div>

          <!-- Spacer for balance -->
          <div class="w-8"></div>
        </div>
      </div>
    </header>
  `,
})
export class StepProgressComponent {
  readonly currentStep = input<CheckoutStep>(1);
  readonly completedSteps = input<CheckoutStep[]>([]);
  readonly webUrl = environment.appUrls.web;

  canGoToStep(step: CheckoutStep): boolean {
    const current = this.currentStep();
    const completed = this.completedSteps();
    return step <= current || completed.includes(step);
  }
}
