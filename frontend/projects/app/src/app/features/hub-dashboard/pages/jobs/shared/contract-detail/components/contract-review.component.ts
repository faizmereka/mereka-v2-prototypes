import { Component, input, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '@mereka/ui';
import { environment } from '../../../../../../../../environments/environment';

export interface ContractReview {
  _id: string;
  rating: number;
  content: string;
  createdAt: string;
  isEdited: boolean;
  editedAt?: string;
  reviewer: {
    _id: string;
    name: string;
    profileImage?: string;
  };
  reviewerHub: {
    _id: string;
    name: string;
    logo?: string;
  };
  reply?: {
    content: string;
    createdAt: string;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

@Component({
  selector: 'app-contract-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white rounded-xl border border-neutral-200" data-testid="contract-review-section">
      <!-- Header -->
      <div class="p-6 border-b border-neutral-200">
        <h3 class="text-lg font-semibold text-neutral-900">Contract Review</h3>
        <p class="text-sm text-neutral-500 mt-1">
          Reviews help build trust and improve collaboration
        </p>
      </div>

      <!-- Content -->
      <div class="p-6">
        @if (isLoading()) {
          <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        } @else if (review()) {
          <!-- Existing Review -->
          <div data-testid="contract-existing-review">
            <!-- Reviewer Info -->
            <div class="flex items-start gap-4 mb-4">
              <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                @if (review()!.reviewer?.profileImage) {
                  <img
                    [src]="review()!.reviewer.profileImage"
                    [alt]="review()!.reviewer.name"
                    class="w-12 h-12 rounded-full object-cover"
                  />
                } @else {
                  <span class="text-primary font-medium">
                    {{ getInitials(review()!.reviewer?.name || 'R') }}
                  </span>
                }
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-semibold text-neutral-900">{{ review()!.reviewer?.name }}</p>
                    <p class="text-sm text-neutral-500">{{ review()!.reviewerHub?.name }}</p>
                  </div>
                  <p class="text-sm text-neutral-500">
                    {{ formatDate(review()!.createdAt) }}
                    @if (review()!.isEdited) {
                      <span class="text-neutral-400">(edited)</span>
                    }
                  </p>
                </div>
              </div>
            </div>

            <!-- Rating -->
            <div class="flex items-center gap-1 mb-3" data-testid="contract-review-rating">
              @for (star of [1, 2, 3, 4, 5]; track star) {
                <svg
                  class="w-5 h-5"
                  [class.text-yellow-400]="star <= review()!.rating"
                  [class.text-neutral-300]="star > review()!.rating"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              }
            </div>

            <!-- Review Content -->
            <p class="text-neutral-700 whitespace-pre-wrap" data-testid="contract-review-content">
              {{ review()!.content }}
            </p>

            <!-- Hub Reply -->
            @if (review()!.reply) {
              <div class="mt-6 p-4 bg-neutral-50 rounded-lg" data-testid="contract-review-reply">
                <p class="text-sm font-medium text-neutral-700 mb-2">Your Reply</p>
                <p class="text-neutral-600">{{ review()!.reply?.content }}</p>
                <p class="text-xs text-neutral-400 mt-2">{{ review()!.reply?.createdAt ? formatDate(review()!.reply!.createdAt) : '' }}</p>

                <!-- Reply Actions -->
                @if (canManageReply()) {
                  <div class="flex items-center gap-3 mt-3">
                    <button
                      (click)="startEditReply()"
                      class="text-sm text-primary hover:underline"
                      data-testid="contract-review-edit-reply-btn"
                    >
                      Edit Reply
                    </button>
                    <button
                      (click)="showDeleteConfirm.set(true)"
                      class="text-sm text-red-600 hover:underline"
                      data-testid="contract-review-delete-reply-btn"
                    >
                      Delete Reply
                    </button>
                  </div>
                }
              </div>
            } @else if (canManageReply()) {
              <!-- Reply Input -->
              @if (!showReplyForm()) {
                <button
                  (click)="showReplyForm.set(true)"
                  class="mt-4 text-primary hover:underline font-medium"
                  data-testid="contract-review-reply-btn"
                >
                  Reply to this review
                </button>
              } @else {
                <div class="mt-4 p-4 bg-neutral-50 rounded-lg">
                  <textarea
                    [(ngModel)]="replyContent"
                    class="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                    rows="3"
                    placeholder="Write your reply..."
                    maxlength="1000"
                    data-testid="contract-review-reply-input"
                  ></textarea>
                  <div class="flex items-center justify-between mt-2">
                    <span class="text-sm text-neutral-500">{{ replyContent.length }}/1000</span>
                    <div class="flex gap-2">
                      <button
                        (click)="cancelReply()"
                        class="px-3 py-1.5 text-neutral-600 hover:text-neutral-900"
                      >
                        Cancel
                      </button>
                      <button
                        (click)="submitReply()"
                        [disabled]="!replyContent.trim() || isSubmitting()"
                        class="px-4 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                        data-testid="contract-review-reply-submit"
                      >
                        @if (isSubmitting()) {
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
        } @else if (canLeaveReview()) {
          <!-- Leave Review Section -->
          <div data-testid="contract-leave-review-section">
            @if (!showReviewForm()) {
              <div class="text-center py-8">
                <svg class="w-12 h-12 mx-auto mb-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <h4 class="text-lg font-medium text-neutral-900 mb-2">Share Your Experience</h4>
                <p class="text-neutral-500 mb-4">
                  Leave a review about working with this {{ isExpert() ? 'client' : 'expert' }}
                </p>
                <button
                  (click)="showReviewForm.set(true)"
                  class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                  data-testid="contract-leave-review-btn"
                >
                  Leave a Review
                </button>
              </div>
            } @else {
              <!-- Review Form -->
              <div class="space-y-4">
                <h4 class="font-medium text-neutral-900">Rate Your Experience</h4>

                <!-- Star Rating -->
                <div class="flex items-center gap-2" data-testid="contract-review-rating-input">
                  @for (star of [1, 2, 3, 4, 5]; track star) {
                    <button
                      type="button"
                      (click)="setRating(star)"
                      class="focus:outline-none"
                    >
                      <svg
                        class="w-8 h-8 transition-colors"
                        [class.text-yellow-400]="star <= rating()"
                        [class.text-neutral-300]="star > rating()"
                        [class.hover:text-yellow-300]="star > rating()"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  }
                  @if (rating() > 0) {
                    <span class="ml-2 text-neutral-600">{{ getRatingLabel() }}</span>
                  }
                </div>

                <!-- Review Content -->
                <div>
                  <label class="block text-sm font-medium text-neutral-700 mb-1">
                    Your Review
                  </label>
                  <textarea
                    [(ngModel)]="reviewContent"
                    class="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                    rows="4"
                    placeholder="Share your experience working together..."
                    minlength="25"
                    maxlength="1000"
                    data-testid="contract-review-content-input"
                  ></textarea>
                  <div class="flex items-center justify-between mt-1">
                    <span class="text-xs text-neutral-500">Minimum 25 characters</span>
                    <span class="text-xs text-neutral-500">{{ reviewContent.length }}/1000</span>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center justify-end gap-3">
                  <button
                    (click)="cancelReview()"
                    class="px-4 py-2 text-neutral-600 hover:text-neutral-900"
                  >
                    Cancel
                  </button>
                  <button
                    (click)="submitReview()"
                    [disabled]="!isReviewValid() || isSubmitting()"
                    class="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    data-testid="contract-review-submit-btn"
                  >
                    @if (isSubmitting()) {
                      Submitting...
                    } @else {
                      Submit Review
                    }
                  </button>
                </div>
              </div>
            }
          </div>
        } @else {
          <!-- Cannot Review Yet -->
          <div class="text-center py-8">
            <svg class="w-12 h-12 mx-auto mb-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 class="text-lg font-medium text-neutral-900 mb-2">Review Not Available Yet</h4>
            <p class="text-neutral-500">
              You can leave a review once the contract is completed or a milestone has been released.
            </p>
          </div>
        }
      </div>
    </div>

    <!-- Delete Reply Confirmation -->
    @if (showDeleteConfirm()) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
          <h3 class="text-lg font-semibold text-neutral-900 mb-2">Delete Reply</h3>
          <p class="text-neutral-600 mb-6">Are you sure you want to delete your reply?</p>
          <div class="flex items-center justify-end gap-3">
            <button
              (click)="showDeleteConfirm.set(false)"
              class="px-4 py-2 text-neutral-700 hover:text-neutral-900"
            >
              Cancel
            </button>
            <button
              (click)="deleteReply()"
              [disabled]="isDeleting()"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ContractReviewComponent implements OnInit {
  readonly hubId = input.required<string>();
  readonly contractId = input.required<string>();
  readonly isExpert = input<boolean>(false);
  readonly contractStatus = input<string>('');
  readonly hasReleasedMilestone = input<boolean>(false);

  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly isDeleting = signal(false);
  readonly review = signal<ContractReview | null>(null);
  readonly myReview = signal<ContractReview | null>(null);

  readonly showReviewForm = signal(false);
  readonly showReplyForm = signal(false);
  readonly showDeleteConfirm = signal(false);

  readonly rating = signal(0);
  reviewContent = '';
  replyContent = '';

  ngOnInit(): void {
    void this.loadReview();
  }

  readonly canLeaveReview = computed(() => {
    // Can leave review if contract is completed or has released milestones, and we haven't already reviewed
    const status = this.contractStatus();
    const hasNotReviewed = !this.myReview();
    return hasNotReviewed && (status === 'completed' || this.hasReleasedMilestone());
  });

  readonly canManageReply = computed(() => {
    // Hub can reply if they are the recipient of the review (not the author)
    return !!this.review();
  });

  isReviewValid(): boolean {
    return this.rating() >= 1 && this.rating() <= 5 && this.reviewContent.length >= 25;
  }

  private async loadReview(): Promise<void> {
    this.isLoading.set(true);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<{ myReview: ContractReview | null; receivedReview: ContractReview | null }>>(
          `${environment.apiUrl}/hub/${this.hubId()}/contracts/${this.contractId()}/reviews`,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        // Show received review (the review about us)
        this.review.set(response.data.receivedReview);
        // Track if we already submitted our review
        this.myReview.set(response.data.myReview);
      }
    } catch {
      // No review exists, which is fine
    } finally {
      this.isLoading.set(false);
    }
  }

  setRating(value: number): void {
    this.rating.set(value);
  }

  getRatingLabel(): string {
    const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    return labels[this.rating()] || '';
  }

  cancelReview(): void {
    this.showReviewForm.set(false);
    this.rating.set(0);
    this.reviewContent = '';
  }

  async submitReview(): Promise<void> {
    if (!this.isReviewValid() || this.isSubmitting()) return;

    this.isSubmitting.set(true);

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<ContractReview>>(
          `${environment.apiUrl}/hub/${this.hubId()}/contracts/${this.contractId()}/reviews`,
          {
            rating: this.rating(),
            criteriaRatings: {
              quality: this.rating(),
              communication: this.rating(),
              professionalism: this.rating(),
              timeliness: this.rating(),
            },
            content: this.reviewContent,
          },
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        this.myReview.set(response.data);
        this.showReviewForm.set(false);
        this.rating.set(0);
        this.reviewContent = '';
        this.toast.success('Review submitted successfully');
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      this.toast.error('Failed to submit review');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  startEditReply(): void {
    if (this.review()?.reply) {
      this.replyContent = this.review()!.reply!.content;
      this.showReplyForm.set(true);
    }
  }

  cancelReply(): void {
    this.showReplyForm.set(false);
    this.replyContent = '';
  }

  async submitReply(): Promise<void> {
    // Note: Reply functionality requires backend support at /hub/:hubId/contracts/:contractId/reviews/:reviewId/reply
    if (!this.replyContent.trim() || this.isSubmitting()) return;

    this.isSubmitting.set(true);

    try {
      const reviewId = this.review()?._id;
      if (!reviewId) {
        this.toast.error('No review to reply to');
        return;
      }

      const hasExistingReply = !!this.review()?.reply;
      const method = hasExistingReply ? 'PUT' : 'POST';

      await firstValueFrom(
        this.http.request(
          method,
          `${environment.apiUrl}/hub/${this.hubId()}/contracts/${this.contractId()}/reviews/${reviewId}/reply`,
          {
            body: { content: this.replyContent.trim() },
            withCredentials: true,
          }
        )
      );

      this.toast.success(hasExistingReply ? 'Reply updated' : 'Reply submitted');
      this.showReplyForm.set(false);
      this.replyContent = '';
      await this.loadReview();
    } catch (error) {
      console.error('Failed to submit reply:', error);
      this.toast.error('Failed to submit reply');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async deleteReply(): Promise<void> {
    // Note: Reply functionality requires backend support
    this.isDeleting.set(true);

    try {
      const reviewId = this.review()?._id;
      if (!reviewId) {
        this.toast.error('No review to delete reply from');
        return;
      }

      await firstValueFrom(
        this.http.delete(
          `${environment.apiUrl}/hub/${this.hubId()}/contracts/${this.contractId()}/reviews/${reviewId}/reply`,
          { withCredentials: true }
        )
      );

      this.toast.success('Reply deleted');
      this.showDeleteConfirm.set(false);
      await this.loadReview();
    } catch (error) {
      console.error('Failed to delete reply:', error);
      this.toast.error('Failed to delete reply');
    } finally {
      this.isDeleting.set(false);
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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
