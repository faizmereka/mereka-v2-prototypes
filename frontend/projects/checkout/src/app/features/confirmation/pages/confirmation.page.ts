import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-confirmation-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div class="max-w-md w-full text-center">
        <!-- Success Icon -->
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 class="text-2xl font-bold text-neutral-900 mb-2">Booking Confirmed!</h1>

        <p class="text-neutral-600 mb-8">
          Your booking has been successfully placed.
          @if (bookingId()) {
            <br/>
            <span class="text-sm text-neutral-500">Reference: {{ bookingId() }}</span>
          }
        </p>

        <!-- Action Buttons -->
        <div class="space-y-3">
          <a
            [href]="appUrl + '/dashboard/bookings'"
            class="block w-full py-3 bg-primary-600 text-white rounded-full font-medium
                   hover:bg-primary-700 transition-colors"
          >
            View My Bookings
          </a>

          <a
            [href]="webUrl"
            class="block w-full py-3 border border-neutral-300 text-neutral-700 rounded-full font-medium
                   hover:bg-neutral-50 transition-colors"
          >
            Continue Browsing
          </a>
        </div>

        <!-- Email Notice -->
        <p class="mt-8 text-sm text-neutral-500">
          A confirmation email has been sent to your registered email address.
        </p>
      </div>
    </div>
  `,
})
export class ConfirmationPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);

  readonly bookingId = signal<string>('');
  readonly appUrl = environment.appUrls.app;
  readonly webUrl = environment.appUrls.web;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const id = this.route.snapshot.paramMap.get('bookingId');
      if (id) {
        this.bookingId.set(id);
      }
    }
  }
}
