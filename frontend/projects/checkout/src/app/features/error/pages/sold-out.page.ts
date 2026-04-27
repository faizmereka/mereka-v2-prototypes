import { Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-sold-out-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div class="max-w-md w-full text-center">
        <!-- Icon -->
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <svg class="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>

        <h1 class="text-2xl font-bold text-neutral-900 mb-2">Sold Out</h1>

        <p class="text-neutral-600 mb-8">
          Sorry, this slot is no longer available. Someone else may have booked the last spots.
          Please try a different time slot.
        </p>

        <!-- Action Buttons -->
        <div class="space-y-3">
          <button
            (click)="goBack()"
            class="block w-full py-3 bg-primary-600 text-white rounded-full font-medium
                   hover:bg-primary-700 transition-colors cursor-pointer"
          >
            Choose Another Slot
          </button>

          <a
            [href]="webUrl"
            class="block w-full py-3 border border-neutral-300 text-neutral-700 rounded-full font-medium
                   hover:bg-neutral-50 transition-colors"
          >
            Browse Other Experiences
          </a>
        </div>
      </div>
    </div>
  `,
})
export class SoldOutPage {
  private readonly platformId = inject(PLATFORM_ID);
  readonly webUrl = environment.appUrls.web;

  goBack(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.history.back();
    }
  }
}
