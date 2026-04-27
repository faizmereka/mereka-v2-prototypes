import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-checkout-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="sticky top-0 z-50 bg-white border-b border-neutral-200">
      <div class="max-w-6xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <!-- Back Button -->
          <button
            type="button"
            (click)="backClick.emit()"
            class="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span class="text-sm font-medium">Back</span>
          </button>

          <!-- Title -->
          <h1 class="text-lg font-semibold text-neutral-900 truncate max-w-md text-center">
            {{ title() || 'Checkout' }}
          </h1>

          <!-- Timer Slot -->
          <div class="min-w-[100px] flex justify-end">
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    </header>
  `,
})
export class CheckoutHeaderComponent {
  readonly title = input<string>('');
  readonly backClick = output<void>();
}
