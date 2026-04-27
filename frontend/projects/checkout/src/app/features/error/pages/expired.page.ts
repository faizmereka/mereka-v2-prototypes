import { Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-expired-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div class="max-w-md w-full text-center">
        <!-- Icon -->
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
          <svg class="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 class="text-2xl font-bold text-neutral-900 mb-2">Session Expired</h1>

        <p class="text-neutral-600 mb-8">
          Your checkout session has expired. Don't worry, no payment was taken.
          Please try booking again.
        </p>

        <!-- Action Buttons -->
        <div class="space-y-3">
          <button
            (click)="goBack()"
            class="block w-full py-3 bg-primary-600 text-white rounded-full font-medium
                   hover:bg-primary-700 transition-colors cursor-pointer"
          >
            Try Again
          </button>

          <a
            [href]="webUrl"
            class="block w-full py-3 border border-neutral-300 text-neutral-700 rounded-full font-medium
                   hover:bg-neutral-50 transition-colors"
          >
            Browse Experiences
          </a>
        </div>
      </div>
    </div>
  `,
})
export class ExpiredPage {
  private readonly platformId = inject(PLATFORM_ID);
  readonly webUrl = environment.appUrls.web;

  goBack(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.history.back();
    }
  }
}
