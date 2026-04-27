import { Component, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BookingDetailService, type BookingDetail, type BookingViewMode } from '../booking-detail.service';

@Component({
  selector: 'app-booking-actions',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="bg-white rounded-xl border border-neutral-200 p-6" data-testid="booking-actions">
      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <!-- Transaction History Link -->
        <a
          [routerLink]="mode === 'hub' ? ['/hub/settings/transactions'] : ['/dashboard/transactions']"
          class="text-primary hover:underline text-sm"
          data-testid="booking-transaction-history-link"
        >
          View Transaction History
        </a>

        <!-- Message Button (Hub mode) -->
        @if (mode === 'hub' && booking.status !== 'cancelled') {
          <button
            (click)="messageBooker()"
            class="text-primary hover:underline text-sm"
            data-testid="booking-message-btn"
          >
            Message Booker
          </button>
        }

        <!-- Cancel Booking Button -->
        @if (canCancel) {
          <button
            (click)="openCancelDialog()"
            class="text-red-600 hover:underline text-sm"
            data-testid="booking-cancel-btn"
          >
            Cancel Booking
          </button>
        }

        <!-- Help Link -->
        <a
          href="https://help.mereka.io/hc/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-neutral-600 hover:text-neutral-900 text-sm"
          data-testid="booking-help-link"
        >
          Help Center
        </a>
      </div>
    </div>

    <!-- Cancel Booking Dialog -->
    @if (showCancelDialog()) {
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="closeCancelDialog()"
      >
        <div
          class="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
          (click)="$event.stopPropagation()"
        >
          <h3 class="text-lg font-semibold text-neutral-900 mb-2">Cancel Booking</h3>
          <p class="text-neutral-600 mb-4">
            Are you sure you want to cancel this booking? Please select a reason below.
          </p>

          <!-- Cancellation Reasons -->
          <div class="space-y-2 mb-4">
            @for (reason of getCurrentReasons(); track reason) {
              <label class="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-50">
                <input
                  type="radio"
                  name="cancelReason"
                  [value]="reason"
                  [(ngModel)]="selectedReason"
                  class="w-4 h-4 text-primary"
                />
                <span class="text-neutral-700">{{ reason }}</span>
              </label>
            }
          </div>

          <!-- Custom Reason Input -->
          @if (selectedReason === 'Other') {
            <div class="mb-4">
              <textarea
                [(ngModel)]="customReason"
                class="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                rows="3"
                placeholder="Please describe your reason..."
              ></textarea>
            </div>
          }

          <!-- Cancellation Policy Notice -->
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
            <p class="text-sm text-yellow-800">
              @if (mode === 'hub') {
                <strong>Note:</strong> Cancelling this booking will notify the learner and process any applicable refunds.
              } @else {
                <strong>Cancellation Policy:</strong> Refund amounts may vary based on how close the cancellation is to the booking date.
              }
              <a
                href="https://help.mereka.io/hc/policies/mereka-cancellation-policy"
                target="_blank"
                class="underline"
              >
                Learn more
              </a>
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3">
            <button
              (click)="closeCancelDialog()"
              class="px-4 py-2 text-neutral-700 hover:text-neutral-900 font-medium"
            >
              Keep Booking
            </button>
            <button
              (click)="confirmCancel()"
              [disabled]="!canSubmitCancel() || isCancelling()"
              class="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (isCancelling()) {
                Cancelling...
              } @else {
                Cancel Booking
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class BookingActionsComponent {
  @Input({ required: true }) booking!: BookingDetail;
  @Input() mode: BookingViewMode = 'learner';
  @Input() canCancel = false;
  @Output() cancel = new EventEmitter<void>();

  private readonly bookingService = inject(BookingDetailService);

  readonly showCancelDialog = signal(false);
  readonly isCancelling = signal(false);
  selectedReason = '';
  customReason = '';

  private readonly learnerReasons = [
    'My schedule has changed',
    'I am unfit to attend',
    'I am no longer interested',
    'I found a better option',
    'Other',
  ];

  private readonly hubReasons = [
    'Service is no longer available',
    'Unable to fulfill booking',
    'Issue with booking details',
    'Weather or safety concerns',
    'Other',
  ];

  getCurrentReasons(): string[] {
    return this.mode === 'hub' ? this.hubReasons : this.learnerReasons;
  }

  openCancelDialog(): void {
    this.selectedReason = '';
    this.customReason = '';
    this.showCancelDialog.set(true);
  }

  closeCancelDialog(): void {
    this.showCancelDialog.set(false);
  }

  canSubmitCancel(): boolean {
    if (!this.selectedReason) return false;
    if (this.selectedReason === 'Other' && !this.customReason.trim()) return false;
    return true;
  }

  async confirmCancel(): Promise<void> {
    if (!this.canSubmitCancel() || this.isCancelling()) return;

    const reason = this.selectedReason === 'Other' ? this.customReason.trim() : this.selectedReason;

    this.isCancelling.set(true);
    const success = await this.bookingService.cancelBooking(this.booking._id, reason);
    this.isCancelling.set(false);

    if (success) {
      this.closeCancelDialog();
      this.cancel.emit();
    }
  }

  messageBooker(): void {
    // Navigate to chat with booker
    // TODO: Implement proper chat navigation
    console.log('Message booker:', this.booking.bookerEmail);
  }
}
