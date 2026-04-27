import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StarRatingInputComponent } from '../star-rating-input/star-rating-input.component';
import type { CriteriaRatings } from '../criteria-rating/criteria-rating.component';

export interface ContractReviewDialogData {
  _id?: string;
  rating: number;
  criteriaRatings: CriteriaRatings;
  content: string;
}

export interface ContractReviewSubmitData {
  rating: number;
  criteriaRatings: CriteriaRatings;
  content: string;
}

export interface RevieweeHub {
  _id: string;
  name: string;
  logo?: string;
}

/**
 * Contract Review Dialog Component
 * Modal dialog for creating or editing contract reviews with criteria ratings
 */
@Component({
  selector: 'app-contract-review-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, StarRatingInputComponent],
  template: `
    @if (isDialogOpen()) {
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        (click)="onBackdropClick($event)"
      >
        <!-- Dialog -->
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
                type="button"
                class="text-neutral-400 hover:text-neutral-600 transition-colors"
                (click)="onClose()"
              >
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Reviewee Info -->
            @if (hubData()) {
              <div class="mb-6 p-4 bg-neutral-50 rounded-lg">
                <p class="text-sm text-neutral-600 mb-2">How was your experience working with:</p>
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center overflow-hidden">
                    @if (hubData()!.logo) {
                      <img [src]="hubData()!.logo" [alt]="hubData()!.name" class="w-full h-full object-cover" />
                    } @else {
                      <span class="text-primary-600 font-semibold text-lg">
                        {{ hubData()!.name.charAt(0) }}
                      </span>
                    }
                  </div>
                  <span class="font-medium text-neutral-900">{{ hubData()!.name }}</span>
                </div>
              </div>
            }

            <!-- Overall Rating -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-neutral-700 mb-2">
                Overall Rating
                <span class="text-red-500">*</span>
              </label>
              <app-star-rating-input
                [value]="rating()"
                (valueChange)="onRatingChange($event)"
                size="lg"
              />
            </div>

            <!-- Criteria Ratings -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-neutral-700 mb-3">
                Detailed Ratings
                <span class="text-red-500">*</span>
              </label>
              <div class="space-y-4 bg-neutral-50 rounded-lg p-4">
                @for (criterion of criteriaList; track criterion.key) {
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-neutral-700">{{ criterion.label }}</span>
                    <app-star-rating-input
                      [value]="getCriteriaValue(criterion.key)"
                      (valueChange)="onCriteriaChange(criterion.key, $event)"
                      size="sm"
                      [showLabel]="false"
                    />
                  </div>
                }
              </div>
            </div>

            <!-- Content Section -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-neutral-700 mb-2">
                Your feedback
                <span class="text-red-500">*</span>
              </label>
              <textarea
                class="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                rows="4"
                [value]="content()"
                (input)="onContentChange($event)"
                placeholder="Share your experience working with this hub..."
                maxlength="1000"
              ></textarea>
              <div class="flex items-center justify-between mt-1 text-sm">
                <span [class]="contentLengthClass()">
                  {{ contentValidationMessage() }}
                </span>
                <span class="text-neutral-400">{{ content().length }}/1000</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
              <button
                type="button"
                class="px-4 py-2 text-neutral-700 hover:text-neutral-900 font-medium transition-colors"
                (click)="onClose()"
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                [disabled]="!isValid() || submitting()"
                (click)="onSubmit()"
              >
                @if (submitting()) {
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Submitting...</span>
                } @else {
                  <span>{{ dialogMode() === 'create' ? 'Submit Review' : 'Save Changes' }}</span>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class ContractReviewDialogComponent {
  @Input() set isOpen(value: boolean) {
    this._isOpen.set(value);
  }
  @Input() set mode(value: 'create' | 'edit') {
    this._mode.set(value);
  }
  @Input() set revieweeHub(value: RevieweeHub | undefined) {
    this._revieweeHub.set(value);
  }
  @Input() set existingReview(value: ContractReviewDialogData | undefined) {
    if (value) {
      this._rating.set(value.rating);
      this._criteriaRatings.set({ ...value.criteriaRatings });
      this._content.set(value.content);
    } else {
      this.resetForm();
    }
  }

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<ContractReviewSubmitData>();

  private readonly _isOpen = signal(false);
  private readonly _mode = signal<'create' | 'edit'>('create');
  private readonly _revieweeHub = signal<RevieweeHub | undefined>(undefined);
  private readonly _rating = signal(0);
  private readonly _criteriaRatings = signal<CriteriaRatings>({
    quality: 0,
    communication: 0,
    professionalism: 0,
    timeliness: 0,
  });
  private readonly _content = signal('');
  private readonly _submitting = signal(false);

  readonly isDialogOpen = this._isOpen.asReadonly();
  readonly dialogMode = this._mode.asReadonly();
  readonly hubData = this._revieweeHub.asReadonly();
  readonly rating = this._rating.asReadonly();
  readonly criteriaRatings = this._criteriaRatings.asReadonly();
  readonly content = this._content.asReadonly();
  readonly submitting = this._submitting.asReadonly();

  readonly criteriaList = [
    { key: 'quality' as const, label: 'Quality of Work' },
    { key: 'communication' as const, label: 'Communication' },
    { key: 'professionalism' as const, label: 'Professionalism' },
    { key: 'timeliness' as const, label: 'Timeliness' },
  ];

  readonly isContentValid = computed(() => {
    const content = this._content();
    return content.length >= 25 && content.length <= 1000;
  });

  readonly areCriteriaValid = computed(() => {
    const ratings = this._criteriaRatings();
    return Object.values(ratings).every((v) => v >= 1 && v <= 5);
  });

  readonly isValid = computed(() => {
    return (
      this._rating() >= 1 &&
      this._rating() <= 5 &&
      this.areCriteriaValid() &&
      this.isContentValid()
    );
  });

  readonly contentLengthClass = computed(() => {
    const content = this._content();
    if (content.length < 25) return 'text-red-500';
    return 'text-neutral-500';
  });

  readonly contentValidationMessage = computed(() => {
    const content = this._content();
    if (content.length < 25) {
      return `Minimum 25 characters (${25 - content.length} more needed)`;
    }
    return 'Looks good!';
  });

  getCriteriaValue(key: keyof CriteriaRatings): number {
    return this._criteriaRatings()[key];
  }

  onRatingChange(rating: number): void {
    this._rating.set(rating);
  }

  onCriteriaChange(key: keyof CriteriaRatings, value: number): void {
    this._criteriaRatings.update((ratings) => ({
      ...ratings,
      [key]: value,
    }));
  }

  onContentChange(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this._content.set(textarea.value);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }

  onSubmit(): void {
    if (!this.isValid() || this._submitting()) return;

    this._submitting.set(true);

    this.submit.emit({
      rating: this._rating(),
      criteriaRatings: this._criteriaRatings(),
      content: this._content(),
    });
  }

  setSubmitting(value: boolean): void {
    this._submitting.set(value);
  }

  private resetForm(): void {
    this._rating.set(0);
    this._criteriaRatings.set({
      quality: 0,
      communication: 0,
      professionalism: 0,
      timeliness: 0,
    });
    this._content.set('');
    this._submitting.set(false);
  }
}
