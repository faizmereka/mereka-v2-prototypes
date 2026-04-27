import { Component, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../../../environments/environment';
import { ToastService } from '@mereka/ui';
import { AuthStateService } from '../../../../../../core/services/auth-state.service';

export interface HubBookingDetail {
  _id: string;
  serviceId: string;
  serviceType: 'experience' | 'expertise';
  serviceTitle: string;
  serviceCover?: string;
  bookingStartDate: string;
  bookingEndDate: string;
  status: string;
  bookerName: string;
  bookerEmail: string;
  bookerPhone?: string;
  selectedTickets: Array<{
    ticketName: string;
    quantity: number;
    totalPrice: number;
    guests?: Array<{ name: string; email: string; phone?: string }>;
  }>;
  totalCost: number;
  totalAmount: number;
  currency: string;
  hubPayout?: number;
  serviceFee?: number;
  cancelledBy?: string;
  cancellationReason?: string;
  review?: {
    _id: string;
    rating: number;
    content: string;
    createdAt: string;
    hubReply?: {
      content: string;
      createdAt: string;
    };
  };
}

@Component({
  selector: 'app-hub-booking-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="onBackdropClick($event)"
        data-testid="hub-booking-detail"
      >
        <div
          class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-6 border-b border-neutral-200">
            <h2 class="text-xl font-semibold text-neutral-900">Booking Details</h2>
            <button
              (click)="close.emit()"
              class="text-neutral-400 hover:text-neutral-600"
              data-testid="hub-booking-close-btn"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-6 space-y-6">
            <!-- Loading -->
            @if (isLoading()) {
              <div class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            } @else if (booking()) {
              <!-- Booking Info -->
              <div data-testid="hub-booking-info">
                <div class="flex items-center gap-2 mb-2">
                  <span
                    class="px-2 py-1 rounded text-xs font-medium"
                    [ngClass]="getStatusClass()"
                    data-testid="hub-booking-status"
                  >
                    {{ booking()!.status | uppercase }}
                  </span>
                </div>

                <p class="text-lg font-medium text-neutral-900" data-testid="hub-booking-datetime">
                  {{ formatDate(booking()!.bookingStartDate) }}
                </p>
                <p class="text-neutral-600">
                  {{ formatTime(booking()!.bookingStartDate) }} - {{ formatTime(booking()!.bookingEndDate) }}
                </p>

                <h3 class="mt-4 text-xl font-semibold text-neutral-900" data-testid="hub-booking-service">
                  {{ booking()!.serviceTitle }}
                </h3>
              </div>

              <!-- Booker Info -->
              <div class="bg-neutral-50 rounded-lg p-4" data-testid="hub-booking-booker-info">
                <h4 class="text-sm font-semibold text-neutral-500 uppercase mb-3">Booked By</h4>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {{ getInitials(booking()!.bookerName) }}
                  </div>
                  <div>
                    <p class="font-medium text-neutral-900">{{ booking()!.bookerName }}</p>
                    <p class="text-sm text-neutral-500">{{ booking()!.bookerEmail }}</p>
                    @if (booking()!.bookerPhone) {
                      <p class="text-sm text-neutral-500">{{ booking()!.bookerPhone }}</p>
                    }
                  </div>
                </div>
              </div>

              <!-- Participants -->
              <div data-testid="hub-booking-participants-list">
                <h4 class="text-sm font-semibold text-neutral-500 uppercase mb-3">Participants</h4>
                <div class="space-y-2">
                  @for (ticket of booking()!.selectedTickets; track $index) {
                    @if (ticket.guests && ticket.guests.length > 0) {
                      @for (guest of ticket.guests; track $index) {
                        <div
                          class="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                          [attr.data-testid]="'hub-booking-participant-' + $index"
                        >
                          <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 text-sm font-medium">
                              {{ getInitials(guest.name) }}
                            </div>
                            <div>
                              <p class="font-medium text-neutral-900">{{ guest.name }}</p>
                              <p class="text-sm text-neutral-500">{{ guest.email }}</p>
                            </div>
                          </div>
                          <span class="text-sm text-neutral-500">{{ ticket.ticketName }}</span>
                        </div>
                      }
                    } @else {
                      <div class="p-3 bg-neutral-50 rounded-lg">
                        <p class="text-neutral-700">{{ ticket.quantity }} x {{ ticket.ticketName }}</p>
                      </div>
                    }
                  }
                </div>
              </div>

              <!-- Payment Details -->
              <div data-testid="hub-booking-payment-details">
                <h4 class="text-sm font-semibold text-neutral-500 uppercase mb-3">Payment Details</h4>
                <div class="space-y-2">
                  <div class="flex justify-between text-neutral-700">
                    <span>Total Booking</span>
                    <span>{{ formatCurrency(booking()!.totalAmount) }}</span>
                  </div>
                  @if (booking()!.serviceFee) {
                    <div class="flex justify-between text-neutral-700">
                      <span>Platform Fee</span>
                      <span class="text-red-600">-{{ formatCurrency(booking()!.serviceFee ?? 0) }}</span>
                    </div>
                  }
                  <div class="flex justify-between pt-2 border-t border-neutral-200" data-testid="hub-booking-payout-amount">
                    <span class="font-semibold text-neutral-900">Your Payout</span>
                    <span class="font-semibold text-green-600">{{ formatCurrency(booking()!.hubPayout || booking()!.totalAmount) }}</span>
                  </div>
                </div>
              </div>

              <!-- Learner Review -->
              @if (booking()!.review) {
                <div class="bg-neutral-50 rounded-lg p-4" data-testid="hub-booking-learner-review">
                  <h4 class="text-sm font-semibold text-neutral-500 uppercase mb-3">Learner Review</h4>

                  <!-- Rating -->
                  <div class="flex items-center gap-1 mb-2" data-testid="hub-booking-learner-review-rating">
                    @for (star of [1,2,3,4,5]; track star) {
                      <svg
                        class="w-5 h-5"
                        [class.text-yellow-400]="star <= booking()!.review!.rating"
                        [class.text-neutral-300]="star > booking()!.review!.rating"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    }
                  </div>

                  <!-- Content -->
                  <p class="text-neutral-700" data-testid="hub-booking-learner-review-content">
                    {{ booking()!.review!.content }}
                  </p>
                  <p class="text-sm text-neutral-500 mt-2">
                    {{ formatDate(booking()!.review!.createdAt) }}
                  </p>

                  <!-- Hub Reply -->
                  @if (booking()!.review!.hubReply) {
                    <div class="mt-4 p-3 bg-white rounded-lg border border-neutral-200" data-testid="hub-booking-existing-reply">
                      <p class="text-sm font-medium text-neutral-900 mb-1">Your Reply</p>
                      <p class="text-neutral-700">{{ booking()!.review!.hubReply!.content }}</p>
                      <div class="flex items-center gap-2 mt-2">
                        <button
                          (click)="editReply()"
                          class="text-sm text-primary hover:underline"
                          data-testid="hub-booking-edit-reply-btn"
                        >
                          Edit
                        </button>
                        <button
                          (click)="showDeleteReplyConfirm.set(true)"
                          class="text-sm text-red-600 hover:underline"
                          data-testid="hub-booking-delete-reply-btn"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  } @else {
                    <!-- Reply Input -->
                    @if (!showReplyInput()) {
                      <button
                        (click)="showReplyInput.set(true)"
                        class="mt-4 text-sm text-primary hover:underline"
                        data-testid="hub-booking-reply-btn"
                      >
                        Reply to this review
                      </button>
                    } @else {
                      <div class="mt-4">
                        <textarea
                          [(ngModel)]="replyContent"
                          class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                          rows="3"
                          placeholder="Write your reply..."
                          maxlength="500"
                          data-testid="hub-booking-reply-input"
                        ></textarea>
                        <div class="flex items-center justify-between mt-2">
                          <span class="text-sm text-neutral-500">{{ replyContent.length }}/500</span>
                          <div class="flex gap-2">
                            <button
                              (click)="cancelReply()"
                              class="px-3 py-1 text-sm text-neutral-600 hover:text-neutral-900"
                            >
                              Cancel
                            </button>
                            <button
                              (click)="submitReply()"
                              [disabled]="!replyContent.trim() || isSubmittingReply()"
                              class="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                              data-testid="hub-booking-reply-submit"
                            >
                              @if (isSubmittingReply()) {
                                Submitting...
                              } @else {
                                Submit Reply
                              }
                            </button>
                          </div>
                        </div>
                      </div>
                    }
                  }
                </div>
              }
            }
          </div>

          <!-- Footer Actions -->
          @if (booking() && booking()!.status !== 'cancelled') {
            <div class="p-6 border-t border-neutral-200 flex items-center gap-3">
              <button
                (click)="messageBooker()"
                class="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50"
                data-testid="hub-booking-message-btn"
              >
                Message Booker
              </button>
              <button
                (click)="showCancelConfirm.set(true)"
                class="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                data-testid="hub-booking-cancel-btn"
              >
                Cancel Booking
              </button>
            </div>
          }
        </div>
      </div>
    }

    <!-- Delete Reply Confirmation -->
    @if (showDeleteReplyConfirm()) {
      <div class="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
          <h3 class="text-lg font-semibold text-neutral-900 mb-2">Delete Reply</h3>
          <p class="text-neutral-600 mb-6">Are you sure you want to delete your reply?</p>
          <div class="flex items-center justify-end gap-3">
            <button
              (click)="showDeleteReplyConfirm.set(false)"
              class="px-4 py-2 text-neutral-700 hover:text-neutral-900"
            >
              Cancel
            </button>
            <button
              (click)="deleteReply()"
              [disabled]="isDeletingReply()"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Cancel Booking Confirmation -->
    @if (showCancelConfirm()) {
      <div class="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
          <h3 class="text-lg font-semibold text-neutral-900 mb-2">Cancel Booking</h3>
          <p class="text-neutral-600 mb-4">Are you sure you want to cancel this booking?</p>
          <textarea
            [(ngModel)]="cancelReason"
            class="w-full px-3 py-2 border border-neutral-300 rounded-lg resize-none mb-4"
            rows="3"
            placeholder="Reason for cancellation..."
          ></textarea>
          <div class="flex items-center justify-end gap-3">
            <button
              (click)="showCancelConfirm.set(false)"
              class="px-4 py-2 text-neutral-700 hover:text-neutral-900"
            >
              Keep Booking
            </button>
            <button
              (click)="cancelBooking()"
              [disabled]="!cancelReason.trim() || isCancelling()"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Cancel Booking
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class HubBookingDetailModalComponent {
  @Input() bookingId: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() bookingCancelled = new EventEmitter<void>();

  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly authState = inject(AuthStateService);

  private getApiUrl(): string {
    const hubId = this.authState.selectedHub()?.id;
    return `${environment.apiUrl}/hub/${hubId}/bookings`;
  }

  readonly isOpen = signal(false);
  readonly isLoading = signal(false);
  readonly booking = signal<HubBookingDetail | null>(null);

  readonly showReplyInput = signal(false);
  readonly isSubmittingReply = signal(false);
  readonly showDeleteReplyConfirm = signal(false);
  readonly isDeletingReply = signal(false);

  readonly showCancelConfirm = signal(false);
  readonly isCancelling = signal(false);

  replyContent = '';
  cancelReason = '';

  open(bookingId: string): void {
    this.bookingId = bookingId;
    this.isOpen.set(true);
    void this.loadBooking();
  }

  async loadBooking(): Promise<void> {
    if (!this.bookingId) return;

    this.isLoading.set(true);
    try {
      const response = await firstValueFrom(
        this.http.get<{ success: boolean; data: HubBookingDetail }>(
          `${this.getApiUrl()}/${this.bookingId}`,
          { withCredentials: true }
        )
      );

      if (response.success) {
        this.booking.set(response.data);
      }
    } catch (error) {
      console.error('Failed to load booking:', error);
      this.toast.error('Failed to load booking details');
    } finally {
      this.isLoading.set(false);
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
      this.isOpen.set(false);
    }
  }

  getStatusClass(): string {
    const status = this.booking()?.status;
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  formatCurrency(amount: number): string {
    const currency = this.booking()?.currency || 'MYR';
    return `${currency} ${amount.toFixed(2)}`;
  }

  editReply(): void {
    if (this.booking()?.review?.hubReply) {
      this.replyContent = this.booking()!.review!.hubReply!.content;
      this.showReplyInput.set(true);
    }
  }

  cancelReply(): void {
    this.replyContent = '';
    this.showReplyInput.set(false);
  }

  async submitReply(): Promise<void> {
    if (!this.replyContent.trim() || !this.bookingId || !this.booking()?.review) return;

    this.isSubmittingReply.set(true);
    try {
      const hasExistingReply = !!this.booking()?.review?.hubReply;
      const method = hasExistingReply ? 'PUT' : 'POST';

      await firstValueFrom(
        this.http.request(method, `${this.getApiUrl()}/${this.bookingId}/reply`, {
          body: { content: this.replyContent.trim() },
          withCredentials: true,
        })
      );

      this.toast.success(hasExistingReply ? 'Reply updated' : 'Reply submitted');
      this.showReplyInput.set(false);
      this.replyContent = '';
      await this.loadBooking();
    } catch (error) {
      console.error('Failed to submit reply:', error);
      this.toast.error('Failed to submit reply');
    } finally {
      this.isSubmittingReply.set(false);
    }
  }

  async deleteReply(): Promise<void> {
    if (!this.bookingId) return;

    this.isDeletingReply.set(true);
    try {
      await firstValueFrom(
        this.http.delete(`${this.getApiUrl()}/${this.bookingId}/reply`, {
          withCredentials: true,
        })
      );

      this.toast.success('Reply deleted');
      this.showDeleteReplyConfirm.set(false);
      await this.loadBooking();
    } catch (error) {
      console.error('Failed to delete reply:', error);
      this.toast.error('Failed to delete reply');
    } finally {
      this.isDeletingReply.set(false);
    }
  }

  async cancelBooking(): Promise<void> {
    if (!this.cancelReason.trim() || !this.bookingId) return;

    this.isCancelling.set(true);
    try {
      await firstValueFrom(
        this.http.post(
          `${this.getApiUrl()}/${this.bookingId}/cancel`,
          { reason: this.cancelReason.trim() },
          { withCredentials: true }
        )
      );

      this.toast.success('Booking cancelled');
      this.showCancelConfirm.set(false);
      this.bookingCancelled.emit();
      await this.loadBooking();
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      this.toast.error('Failed to cancel booking');
    } finally {
      this.isCancelling.set(false);
    }
  }

  messageBooker(): void {
    // TODO: Navigate to chat with booker
    console.log('Message booker');
  }
}
