import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { BookingDetail, BookingViewMode } from '../booking-detail.service';

@Component({
  selector: 'app-booking-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white border-b border-neutral-200 sticky top-0 z-10" data-testid="booking-detail-header">
      <div class="max-w-4xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <!-- Back Button -->
          <button
            (click)="goBack.emit()"
            class="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            data-testid="booking-back-btn"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span class="hidden sm:inline">Back</span>
          </button>

          <!-- Title -->
          <h1 class="text-lg font-semibold text-neutral-900" data-testid="booking-title">
            {{ booking.status === 'cancelled' ? 'Cancellation Details' : 'Booking Details' }}
          </h1>

          <!-- Print Button -->
          <button
            (click)="print.emit()"
            class="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            data-testid="booking-print-btn"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span class="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class BookingHeaderComponent {
  @Input({ required: true }) booking!: BookingDetail;
  @Input() mode: BookingViewMode = 'learner';
  @Output() goBack = new EventEmitter<void>();
  @Output() print = new EventEmitter<void>();
}
