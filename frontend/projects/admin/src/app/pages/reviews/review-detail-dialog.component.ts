import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '../../shared/dialog';
import type { AdminReview, ModerationAction } from './reviews.service';

interface DialogData {
  review: AdminReview;
}

@Component({
  selector: 'app-review-detail-dialog',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  template: `
    <div class="max-h-[80vh] overflow-y-auto">
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900">Review Details</h2>
        <button
          class="text-gray-400 hover:text-gray-600 transition-colors"
          (click)="close()"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6">
        <!-- Review Type Badge -->
        <div class="flex items-center gap-3 mb-4">
          <span
            class="px-3 py-1 rounded-full text-sm font-medium"
            [class]="review.reviewType === 'booking' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'"
          >
            {{ review.reviewType === 'booking' ? 'Booking Review' : 'Contract Review' }}
          </span>
          <span
            class="px-3 py-1 rounded-full text-sm font-medium"
            [class]="getStatusClass(review.status)"
          >
            {{ review.status | titlecase }}
          </span>
          @if (review.isEdited) {
            <span class="text-sm text-gray-500">(Edited)</span>
          }
        </div>

        <!-- Reviewer Info -->
        <div class="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 class="text-sm font-medium text-gray-500 mb-3">
            {{ review.reviewType === 'booking' ? 'Reviewer' : 'Reviewing Hub' }}
          </h3>
          <div class="flex items-center gap-3">
            @if (review.reviewType === 'booking') {
              @if (review.reviewer?.avatar) {
                <img [src]="review.reviewer?.avatar" [alt]="review.reviewer?.name" class="w-12 h-12 rounded-full object-cover" />
              } @else {
                <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                  {{ review.reviewer?.name?.charAt(0)?.toUpperCase() || 'U' }}
                </div>
              }
              <div>
                <p class="font-medium text-gray-900">{{ review.reviewer?.name }}</p>
                <p class="text-sm text-gray-500">{{ review.reviewer?.email }}</p>
              </div>
            } @else {
              @if (review.reviewerHub?.logo) {
                <img [src]="review.reviewerHub?.logo" [alt]="review.reviewerHub?.name" class="w-12 h-12 rounded-lg object-cover" />
              } @else {
                <div class="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg">
                  {{ review.reviewerHub?.name?.charAt(0)?.toUpperCase() || 'H' }}
                </div>
              }
              <div>
                <p class="font-medium text-gray-900">{{ review.reviewerHub?.name }}</p>
              </div>
            }
          </div>
        </div>

        <!-- For Contract Reviews: Reviewee Hub -->
        @if (review.reviewType === 'contract' && review.revieweeHub) {
          <div class="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 class="text-sm font-medium text-gray-500 mb-3">Reviewed Hub</h3>
            <div class="flex items-center gap-3">
              @if (review.revieweeHub.logo) {
                <img [src]="review.revieweeHub.logo" [alt]="review.revieweeHub.name" class="w-12 h-12 rounded-lg object-cover" />
              } @else {
                <div class="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-lg">
                  {{ review.revieweeHub.name.charAt(0).toUpperCase() }}
                </div>
              }
              <div>
                <p class="font-medium text-gray-900">{{ review.revieweeHub.name }}</p>
              </div>
            </div>
          </div>
        }

        <!-- Context Info (Service/Job) -->
        <div class="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 class="text-sm font-medium text-gray-500 mb-3">
            {{ review.reviewType === 'booking' ? 'Service' : 'Job' }}
          </h3>
          @if (review.reviewType === 'booking') {
            @if (review.service) {
              <p class="font-medium text-gray-900">{{ review.service.name }}</p>
              <p class="text-sm text-gray-500 capitalize">{{ review.service.type }}</p>
            }
            @if (review.hub) {
              <p class="text-sm text-gray-500 mt-2">Hub: {{ review.hub.name }}</p>
            }
            @if (review.booking) {
              <div class="mt-2 pt-2 border-t border-gray-200">
                <p class="text-sm text-gray-500">
                  Booking Date: {{ review.booking.bookingDate | date:'MMM d, yyyy' }}
                </p>
                @if (review.booking.totalPaid) {
                  <p class="text-sm text-gray-500">
                    Amount: {{ review.booking.currency || 'MYR' }} {{ review.booking.totalPaid | number:'1.2-2' }}
                  </p>
                }
              </div>
            }
          } @else {
            @if (review.job) {
              <p class="font-medium text-gray-900">{{ review.job.title }}</p>
            }
            @if (review.contract) {
              <p class="text-sm text-gray-500 mt-1 capitalize">Contract Status: {{ review.contract.status }}</p>
            }
          }
        </div>

        <!-- Rating -->
        <div class="mb-6">
          <h3 class="text-sm font-medium text-gray-500 mb-2">Rating</h3>
          <div class="flex items-center gap-3">
            <span class="text-3xl font-bold text-gray-900">{{ review.rating }}</span>
            <div>
              <span class="text-2xl text-yellow-500">{{ formatStars(review.rating) }}</span>
              <p class="text-sm text-gray-500">{{ getRatingLabel(review.rating) }}</p>
            </div>
          </div>
        </div>

        <!-- Criteria Ratings (for contract reviews) -->
        @if (review.reviewType === 'contract' && review.criteriaRatings) {
          <div class="mb-6">
            <h3 class="text-sm font-medium text-gray-500 mb-3">Detailed Ratings</h3>
            <div class="grid grid-cols-2 gap-3">
              @for (criterion of criteriaList; track criterion.key) {
                <div class="bg-gray-50 rounded-lg p-3">
                  <p class="text-sm text-gray-600 mb-1">{{ criterion.label }}</p>
                  <div class="flex items-center gap-2">
                    <span class="text-yellow-500">{{ formatStars(review.criteriaRatings![criterion.key]) }}</span>
                    <span class="text-sm font-medium text-gray-900">{{ review.criteriaRatings![criterion.key] }}/5</span>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Review Content -->
        <div class="mb-6">
          <h3 class="text-sm font-medium text-gray-500 mb-2">Review Content</h3>
          <div class="bg-gray-50 rounded-lg p-4">
            <p class="text-gray-700 whitespace-pre-wrap">{{ review.content }}</p>
          </div>
        </div>

        <!-- Photos (for booking reviews) -->
        @if (review.photos && review.photos.length > 0) {
          <div class="mb-6">
            <h3 class="text-sm font-medium text-gray-500 mb-2">Photos</h3>
            <div class="flex flex-wrap gap-2">
              @for (photo of review.photos; track photo) {
                <img
                  [src]="photo"
                  alt="Review photo"
                  class="w-24 h-24 rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-90"
                />
              }
            </div>
          </div>
        }

        <!-- Timestamps -->
        <div class="text-sm text-gray-500 space-y-1 mb-6">
          <p>Created: {{ review.createdAt | date:'MMM d, yyyy h:mm a' }}</p>
          @if (review.updatedAt !== review.createdAt) {
            <p>Updated: {{ review.updatedAt | date:'MMM d, yyyy h:mm a' }}</p>
          }
          @if (review.moderatedAt) {
            <p class="text-orange-600">
              Moderated: {{ review.moderatedAt | date:'MMM d, yyyy h:mm a' }}
              @if (review.moderationReason) {
                - {{ review.moderationReason }}
              }
            </p>
          }
        </div>

        <!-- Moderation Actions -->
        @if (review.status !== 'deleted') {
          <div class="border-t border-gray-200 pt-6">
            <h3 class="text-sm font-medium text-gray-500 mb-3">Moderation Actions</h3>

            @if (showReasonInput()) {
              <div class="mb-4">
                <label class="text-sm text-gray-600 mb-1 block">Reason (optional)</label>
                <textarea
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                  rows="2"
                  [(ngModel)]="moderationReason"
                  placeholder="Enter reason for moderation..."
                ></textarea>
              </div>
            }

            <div class="flex gap-3">
              @if (review.status === 'active') {
                <button
                  class="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium"
                  (click)="toggleReason('hide')"
                >
                  Hide Review
                </button>
              }
              @if (review.status === 'hidden') {
                <button
                  class="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                  (click)="confirmAction('unhide')"
                >
                  Unhide Review
                </button>
              }
              <button
                class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                (click)="toggleReason('delete')"
              >
                Delete Review
              </button>

              @if (showReasonInput()) {
                <button
                  class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium ml-auto"
                  (click)="confirmAction(pendingAction()!)"
                >
                  Confirm
                </button>
                <button
                  class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  (click)="cancelAction()"
                >
                  Cancel
                </button>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background: white;
      border-radius: 12px;
      overflow: hidden;
    }
  `],
})
export class ReviewDetailDialogComponent {
  private readonly dialogRef = inject(DialogRef);
  private readonly data = inject<DialogData>(DIALOG_DATA);

  readonly review = this.data.review;

  moderationReason = '';
  pendingAction = signal<ModerationAction | null>(null);
  showReasonInput = signal(false);

  readonly criteriaList = [
    { key: 'quality' as const, label: 'Quality of Work' },
    { key: 'communication' as const, label: 'Communication' },
    { key: 'professionalism' as const, label: 'Professionalism' },
    { key: 'timeliness' as const, label: 'Timeliness' },
  ];

  close(): void {
    this.dialogRef.close();
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      hidden: 'bg-yellow-100 text-yellow-800',
      deleted: 'bg-red-100 text-red-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getRatingLabel(rating: number): string {
    const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    return labels[rating] || '';
  }

  formatStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  toggleReason(action: ModerationAction): void {
    if (this.pendingAction() === action) {
      this.cancelAction();
    } else {
      this.pendingAction.set(action);
      this.showReasonInput.set(true);
    }
  }

  cancelAction(): void {
    this.pendingAction.set(null);
    this.showReasonInput.set(false);
    this.moderationReason = '';
  }

  confirmAction(action: ModerationAction): void {
    this.dialogRef.close({
      action,
      reason: this.moderationReason || undefined,
    });
  }
}
