import { Component, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingDetailService, type BookingDetail, type ReviewInput, type BookingViewMode } from '../booking-detail.service';
import { StarRatingInputComponent } from '../../../../../shared/components/review';

@Component({
  selector: 'app-booking-review',
  standalone: true,
  imports: [CommonModule, FormsModule, StarRatingInputComponent],
  template: `
    <div class="bg-white rounded-xl border border-neutral-200 p-6">
      <h3 class="text-lg font-semibold text-neutral-900 mb-4">
        {{ mode === 'hub' ? 'Learner Review' : 'Your Review' }}
      </h3>

      <!-- Loading State -->
      @if (isLoadingReview()) {
        <div class="flex items-center justify-center py-8" data-testid="booking-review-loading">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }

      <!-- Existing Review -->
      @else if (booking.review) {
        <div data-testid="booking-existing-review">
          <!-- Review Header with Actions (learner mode only) -->
          <div class="flex items-start justify-between mb-4">
            <div>
              <!-- Star Rating -->
              <div class="flex items-center gap-1" data-testid="booking-review-rating">
                @for (star of [1,2,3,4,5]; track star) {
                  <svg
                    class="w-5 h-5"
                    [class.text-yellow-400]="star <= booking.review!.rating"
                    [class.text-neutral-300]="star > booking.review!.rating"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    [attr.data-testid]="'star-' + star"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                }
              </div>
              <p class="text-sm text-neutral-500 mt-1">
                {{ formatDate(booking.review.createdAt) }}
              </p>
            </div>

            <!-- Actions Menu (Learner mode only) -->
            @if (mode === 'learner') {
              <div class="relative" data-testid="booking-review-actions-menu">
                <button
                  (click)="toggleMenu()"
                  class="p-2 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100 transition-colors"
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>

                @if (showMenu()) {
                  <div class="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-10">
                    <button
                      (click)="openEditDialog()"
                      class="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                      data-testid="booking-edit-review-btn"
                    >
                      Edit Review
                    </button>
                    <button
                      (click)="openDeleteConfirm()"
                      class="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      data-testid="booking-delete-review-btn"
                    >
                      Delete Review
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Review Content -->
          <p class="text-neutral-700 whitespace-pre-wrap" data-testid="booking-review-content">
            {{ booking.review.content }}
          </p>

          <!-- Review Photos -->
          @if (booking.review.photos && booking.review.photos.length > 0) {
            <div class="flex flex-wrap gap-2 mt-4" data-testid="booking-review-photos">
              @for (photo of booking.review.photos; track photo) {
                <img
                  [src]="photo"
                  alt="Review photo"
                  class="w-20 h-20 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  (click)="openPhotoPreview(photo)"
                />
              }
            </div>
          }

          <!-- Hub Reply Section -->
          @if (booking.review.hubReply) {
            <div class="mt-4 p-4 bg-neutral-50 rounded-lg" data-testid="booking-hub-reply">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  @if (booking.hub?.logo) {
                    <img [src]="booking.hub.logo" [alt]="booking.hub?.name || 'Hub'" class="w-6 h-6 rounded-full" />
                  } @else {
                    <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                      {{ (booking.hub?.name || 'H').charAt(0) }}
                    </div>
                  }
                  <span class="font-medium text-neutral-900">{{ mode === 'hub' ? 'Your Reply' : (booking.hub?.name || 'Hub') }}</span>
                </div>

                <!-- Hub Reply Actions (Hub mode only) -->
                @if (mode === 'hub') {
                  <div class="flex items-center gap-2">
                    <button
                      (click)="editHubReply()"
                      class="text-sm text-primary hover:underline"
                      data-testid="booking-edit-reply-btn"
                    >
                      Edit
                    </button>
                    <button
                      (click)="showDeleteReplyConfirm.set(true)"
                      class="text-sm text-red-600 hover:underline"
                      data-testid="booking-delete-reply-btn"
                    >
                      Delete
                    </button>
                  </div>
                }
              </div>
              <p class="text-neutral-700" data-testid="booking-hub-reply-content">
                {{ booking.review.hubReply.content }}
              </p>
              <p class="text-sm text-neutral-500 mt-2">
                {{ formatDate(booking.review.hubReply.createdAt) }}
              </p>
            </div>
          } @else if (mode === 'hub') {
            <!-- Hub Reply Input (Hub mode only, no existing reply) -->
            @if (!showReplyInput()) {
              <button
                (click)="showReplyInput.set(true)"
                class="mt-4 text-sm text-primary hover:underline"
                data-testid="booking-reply-btn"
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
                  data-testid="booking-reply-input"
                ></textarea>
                <div class="flex items-center justify-between mt-2">
                  <span class="text-sm text-neutral-500">{{ replyContent.length }}/500</span>
                  <div class="flex gap-2">
                    <button
                      (click)="cancelHubReply()"
                      class="px-3 py-1 text-sm text-neutral-600 hover:text-neutral-900"
                    >
                      Cancel
                    </button>
                    <button
                      (click)="submitHubReply()"
                      [disabled]="!replyContent.trim() || isSubmittingReply()"
                      class="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                      data-testid="booking-reply-submit"
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

      <!-- No Review - Show Leave Review Button (Learner mode only) -->
      @else if (canReview && mode === 'learner') {
        <div class="text-center py-4" data-testid="booking-no-review">
          <p class="text-neutral-600 mb-4">Share your experience with others</p>
          <button
            (click)="openCreateDialog()"
            class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            data-testid="booking-leave-review-btn"
          >
            Leave a Review
          </button>
        </div>
      }

      <!-- No Review Message (Hub mode) -->
      @else if (mode === 'hub' && !booking.review) {
        <div class="text-center py-4 text-neutral-500">
          <p>No review submitted yet for this booking.</p>
        </div>
      }

      <!-- Cannot Review Message (Learner mode) -->
      @else if (mode === 'learner') {
        <div class="text-center py-4 text-neutral-500">
          @if (booking.status === 'cancelled') {
            <p>Reviews are not available for cancelled bookings.</p>
          } @else if (isFutureBooking()) {
            <p>You can leave a review after attending this booking.</p>
          }
        </div>
      }
    </div>

    <!-- Review Dialog (Learner mode only) -->
    @if (showReviewDialog() && mode === 'learner') {
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="closeDialog($event)"
        data-testid="booking-review-dialog"
      >
        <div
          class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          (click)="$event.stopPropagation()"
        >
          <div class="p-6">
            <!-- Header -->
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-semibold text-neutral-900">
                {{ dialogMode() === 'create' ? 'Write a Review' : 'Edit Review' }}
              </h2>
              <button
                (click)="closeReviewDialog()"
                class="text-neutral-400 hover:text-neutral-600"
                data-testid="booking-review-dialog-close"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Service Info -->
            <div class="mb-6 p-4 bg-neutral-50 rounded-lg">
              <p class="text-sm text-neutral-600 mb-2">How was your experience with:</p>
              <div class="flex items-center gap-3">
                @if (booking.serviceCover) {
                  <img [src]="booking.serviceCover" [alt]="booking.serviceTitle" class="w-12 h-12 rounded-lg object-cover" />
                }
                <span class="font-medium text-neutral-900">{{ booking.serviceTitle }}</span>
              </div>
            </div>

            <!-- Rating Input -->
            <div class="mb-6" data-testid="booking-review-rating-input">
              <label class="block text-sm font-medium text-neutral-700 mb-2">
                Your Rating <span class="text-red-500">*</span>
              </label>
              <app-star-rating-input
                [value]="rating()"
                (valueChange)="onRatingChange($event)"
                size="lg"
              />
            </div>

            <!-- Content Input -->
            <div class="mb-6" data-testid="booking-review-content-input">
              <label class="block text-sm font-medium text-neutral-700 mb-2">
                Your Review <span class="text-red-500">*</span>
              </label>
              <textarea
                class="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                rows="4"
                [ngModel]="content()"
                (ngModelChange)="content.set($event)"
                placeholder="Share your experience..."
                maxlength="1000"
              ></textarea>
              <div class="flex items-center justify-between mt-1 text-sm">
                <span [class]="contentValidClass()">
                  {{ contentValidationMessage() }}
                </span>
                <span class="text-neutral-400">{{ content().length }}/1000</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
              <button
                (click)="closeReviewDialog()"
                class="px-4 py-2 text-neutral-700 hover:text-neutral-900 font-medium"
                data-testid="booking-review-cancel-btn"
              >
                Cancel
              </button>
              <button
                (click)="submitReview()"
                [disabled]="!isValid() || isSubmitting()"
                class="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                data-testid="booking-review-submit-btn"
              >
                @if (isSubmitting()) {
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                } @else {
                  {{ dialogMode() === 'create' ? 'Submit Review' : 'Save Changes' }}
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Delete Review Confirmation Dialog (Learner mode) -->
    @if (showDeleteConfirm() && mode === 'learner') {
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="closeDeleteConfirm()"
      >
        <div
          class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
          (click)="$event.stopPropagation()"
        >
          <h3 class="text-lg font-semibold text-neutral-900 mb-2">Delete Review</h3>
          <p class="text-neutral-600 mb-6">
            Are you sure you want to delete your review? This action cannot be undone.
          </p>
          <div class="flex items-center justify-end gap-3">
            <button
              (click)="closeDeleteConfirm()"
              class="px-4 py-2 text-neutral-700 hover:text-neutral-900 font-medium"
            >
              Cancel
            </button>
            <button
              (click)="deleteReview()"
              [disabled]="isSubmitting()"
              class="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              @if (isSubmitting()) {
                Deleting...
              } @else {
                Delete
              }
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Delete Hub Reply Confirmation Dialog (Hub mode) -->
    @if (showDeleteReplyConfirm() && mode === 'hub') {
      <div
        class="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
        (click)="showDeleteReplyConfirm.set(false)"
      >
        <div
          class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
          (click)="$event.stopPropagation()"
        >
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
              (click)="deleteHubReply()"
              [disabled]="isDeletingReply()"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              @if (isDeletingReply()) {
                Deleting...
              } @else {
                Delete
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class BookingReviewComponent {
  @Input({ required: true }) booking!: BookingDetail;
  @Input() mode: BookingViewMode = 'learner';
  @Input() canReview = false;
  @Output() reviewSubmitted = new EventEmitter<void>();

  private readonly bookingService = inject(BookingDetailService);

  // UI State
  readonly showMenu = signal(false);
  readonly showReviewDialog = signal(false);
  readonly showDeleteConfirm = signal(false);
  readonly dialogMode = signal<'create' | 'edit'>('create');
  readonly isLoadingReview = signal(false);
  readonly isSubmitting = signal(false);

  // Hub Reply State
  readonly showReplyInput = signal(false);
  readonly isSubmittingReply = signal(false);
  readonly showDeleteReplyConfirm = signal(false);
  readonly isDeletingReply = signal(false);
  replyContent = '';

  // Form State
  readonly rating = signal(0);
  readonly content = signal('');

  // Computed
  readonly isValid = computed(() => {
    return this.rating() >= 1 && this.rating() <= 5 && this.content().length >= 25 && this.content().length <= 1000;
  });

  readonly contentValidClass = computed(() => {
    if (this.content().length < 25) return 'text-red-500';
    return 'text-green-500';
  });

  readonly contentValidationMessage = computed(() => {
    if (this.content().length < 25) {
      return `Minimum 25 characters (${25 - this.content().length} more needed)`;
    }
    return 'Looks good!';
  });

  isFutureBooking(): boolean {
    return new Date(this.booking.bookingStartDate) > new Date();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  toggleMenu(): void {
    this.showMenu.update((v) => !v);
  }

  openCreateDialog(): void {
    this.dialogMode.set('create');
    this.rating.set(0);
    this.content.set('');
    this.showReviewDialog.set(true);
  }

  openEditDialog(): void {
    this.showMenu.set(false);
    this.dialogMode.set('edit');
    if (this.booking.review) {
      this.rating.set(this.booking.review.rating);
      this.content.set(this.booking.review.content);
    }
    this.showReviewDialog.set(true);
  }

  closeReviewDialog(): void {
    this.showReviewDialog.set(false);
    this.rating.set(0);
    this.content.set('');
  }

  closeDialog(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeReviewDialog();
    }
  }

  openDeleteConfirm(): void {
    this.showMenu.set(false);
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm.set(false);
  }

  onRatingChange(rating: number): void {
    this.rating.set(rating);
  }

  async submitReview(): Promise<void> {
    if (!this.isValid() || this.isSubmitting()) return;

    this.isSubmitting.set(true);

    const reviewData: ReviewInput = {
      rating: this.rating(),
      content: this.content(),
    };

    let success = false;
    if (this.dialogMode() === 'create') {
      success = await this.bookingService.submitReview(this.booking._id, reviewData);
    } else {
      success = await this.bookingService.updateReview(this.booking._id, reviewData);
    }

    this.isSubmitting.set(false);

    if (success) {
      this.closeReviewDialog();
      this.reviewSubmitted.emit();
    }
  }

  async deleteReview(): Promise<void> {
    if (this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const success = await this.bookingService.deleteReview(this.booking._id);
    this.isSubmitting.set(false);

    if (success) {
      this.closeDeleteConfirm();
      this.reviewSubmitted.emit();
    }
  }

  // ============================================================================
  // Hub Reply Methods
  // ============================================================================

  editHubReply(): void {
    if (this.booking.review?.hubReply) {
      this.replyContent = this.booking.review.hubReply.content;
      this.showReplyInput.set(true);
    }
  }

  cancelHubReply(): void {
    this.replyContent = '';
    this.showReplyInput.set(false);
  }

  async submitHubReply(): Promise<void> {
    if (!this.replyContent.trim() || this.isSubmittingReply()) return;

    this.isSubmittingReply.set(true);

    const hasExistingReply = !!this.booking.review?.hubReply;
    let success = false;

    if (hasExistingReply) {
      success = await this.bookingService.updateHubReply(this.booking._id, {
        content: this.replyContent.trim(),
      });
    } else {
      success = await this.bookingService.submitHubReply(this.booking._id, {
        content: this.replyContent.trim(),
      });
    }

    this.isSubmittingReply.set(false);

    if (success) {
      this.showReplyInput.set(false);
      this.replyContent = '';
      this.reviewSubmitted.emit();
    }
  }

  async deleteHubReply(): Promise<void> {
    if (this.isDeletingReply()) return;

    this.isDeletingReply.set(true);
    const success = await this.bookingService.deleteHubReply(this.booking._id);
    this.isDeletingReply.set(false);

    if (success) {
      this.showDeleteReplyConfirm.set(false);
      this.reviewSubmitted.emit();
    }
  }

  openPhotoPreview(photo: string): void {
    window.open(photo, '_blank');
  }
}
