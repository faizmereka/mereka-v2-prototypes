import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StarRatingInputComponent } from '../star-rating-input/star-rating-input.component';

export interface ReviewDialogData {
  _id?: string;
  rating: number;
  content: string;
  photos: string[];
}

export interface ReviewSubmitData {
  rating: number;
  content: string;
  photos: string[];
}

/**
 * Review Dialog Component
 * Modal dialog for creating or editing booking reviews
 */
@Component({
  selector: 'app-review-dialog',
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

            <!-- Rating Section -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-neutral-700 mb-2">
                How would you rate this experience?
                <span class="text-red-500">*</span>
              </label>
              <app-star-rating-input
                [value]="rating()"
                (valueChange)="onRatingChange($event)"
                size="lg"
              />
            </div>

            <!-- Content Section -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-neutral-700 mb-2">
                Share your experience
                <span class="text-red-500">*</span>
              </label>
              <textarea
                class="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
                rows="5"
                [value]="content()"
                (input)="onContentChange($event)"
                placeholder="Tell others about your experience with this service..."
                maxlength="2000"
              ></textarea>
              <div class="flex items-center justify-between mt-1 text-sm">
                <span [class]="contentLengthClass()">
                  {{ contentValidationMessage() }}
                </span>
                <span class="text-neutral-400">{{ content().length }}/2000</span>
              </div>
            </div>

            <!-- Photos Section -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-neutral-700 mb-2">
                Add photos (optional)
              </label>
              <div class="flex gap-2 flex-wrap">
                @for (photo of photos(); track photo; let i = $index) {
                  <div class="relative group">
                    <img
                      [src]="photo"
                      alt="Review photo"
                      class="w-20 h-20 rounded-lg object-cover border border-neutral-200"
                    />
                    <button
                      type="button"
                      class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      (click)="removePhoto(i)"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                }
                @if (photos().length < 5) {
                  <label
                    class="w-20 h-20 border-2 border-dashed border-neutral-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      class="hidden"
                      (change)="onPhotoSelect($event)"
                      multiple
                    />
                    <svg class="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </label>
                }
              </div>
              <p class="text-sm text-neutral-500 mt-1">Max 5 photos</p>
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
export class ReviewDialogComponent {
  @Input() set isOpen(value: boolean) {
    this._isOpen.set(value);
  }
  @Input() set mode(value: 'create' | 'edit') {
    this._mode.set(value);
  }
  @Input() set existingReview(value: ReviewDialogData | undefined) {
    if (value) {
      this._rating.set(value.rating);
      this._content.set(value.content);
      this._photos.set([...value.photos]);
    } else {
      this.resetForm();
    }
  }

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<ReviewSubmitData>();

  private readonly _isOpen = signal(false);
  private readonly _mode = signal<'create' | 'edit'>('create');
  private readonly _rating = signal(0);
  private readonly _content = signal('');
  private readonly _photos = signal<string[]>([]);
  private readonly _submitting = signal(false);

  readonly isDialogOpen = this._isOpen.asReadonly();
  readonly dialogMode = this._mode.asReadonly();
  readonly rating = this._rating.asReadonly();
  readonly content = this._content.asReadonly();
  readonly photos = this._photos.asReadonly();
  readonly submitting = this._submitting.asReadonly();

  readonly isContentValid = computed(() => {
    const content = this._content();
    return content.length >= 25 && content.length <= 2000;
  });

  readonly isValid = computed(() => {
    return this._rating() >= 1 && this._rating() <= 5 && this.isContentValid();
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

  onRatingChange(rating: number): void {
    this._rating.set(rating);
  }

  onContentChange(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this._content.set(textarea.value);
  }

  onPhotoSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files) return;

    const currentPhotos = this._photos();
    const remainingSlots = 5 - currentPhotos.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    for (const file of filesToAdd) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        this._photos.update((photos) => [...photos, dataUrl]);
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    input.value = '';
  }

  removePhoto(index: number): void {
    this._photos.update((photos) => photos.filter((_, i) => i !== index));
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
      content: this._content(),
      photos: this._photos(),
    });
  }

  setSubmitting(value: boolean): void {
    this._submitting.set(value);
  }

  private resetForm(): void {
    this._rating.set(0);
    this._content.set('');
    this._photos.set([]);
    this._submitting.set(false);
  }
}
