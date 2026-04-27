import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { StarRatingComponent } from '../star-rating/star-rating.component';

export interface ReviewCardData {
  _id: string;
  rating: number;
  content: string;
  photos?: string[];
  isEdited?: boolean;
  createdAt: string;
  reviewer: {
    name: string;
    avatar?: string;
  };
}

/**
 * Review Card Component
 * Displays a single review with expandable content and optional actions
 */
@Component({
  selector: 'app-review-card',
  standalone: true,
  imports: [CommonModule, DatePipe, StarRatingComponent],
  template: `
    <div class="bg-white rounded-lg border border-neutral-200 p-4">
      <!-- Header -->
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-3">
          <!-- Avatar -->
          <div
            class="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden"
          >
            @if (reviewData().reviewer.avatar) {
              <img
                [src]="reviewData().reviewer.avatar"
                [alt]="reviewData().reviewer.name"
                class="w-full h-full object-cover"
              />
            } @else {
              <span class="text-primary-600 font-medium text-sm">
                {{ initials() }}
              </span>
            }
          </div>
          <!-- Name and Date -->
          <div>
            <div class="font-medium text-neutral-900">{{ reviewData().reviewer.name }}</div>
            <div class="text-sm text-neutral-500">
              {{ reviewData().createdAt | date: 'MMM d, yyyy' }}
              @if (reviewData().isEdited) {
                <span class="text-neutral-400 ml-1">(Edited)</span>
              }
            </div>
          </div>
        </div>
        <!-- Rating -->
        <app-star-rating [rating]="reviewData().rating" size="sm" [showValue]="true" />
      </div>

      <!-- Content -->
      <div class="text-neutral-700">
        @if (isExpanded() || !needsTruncation()) {
          <p class="whitespace-pre-wrap">{{ reviewData().content }}</p>
        } @else {
          <p class="whitespace-pre-wrap">{{ truncatedContent() }}</p>
        }
        @if (needsTruncation()) {
          <button
            type="button"
            class="text-primary-600 hover:text-primary-700 text-sm font-medium mt-1"
            (click)="toggleExpand()"
          >
            {{ isExpanded() ? 'Show less' : 'Read more' }}
          </button>
        }
      </div>

      <!-- Photos -->
      @if (reviewData().photos && reviewData().photos!.length > 0) {
        <div class="flex gap-2 mt-3 flex-wrap">
          @for (photo of reviewData().photos; track photo) {
            <button
              type="button"
              class="w-16 h-16 rounded-lg overflow-hidden border border-neutral-200 hover:opacity-80 transition-opacity"
              (click)="openPhoto(photo)"
            >
              <img [src]="photo" alt="Review photo" class="w-full h-full object-cover" />
            </button>
          }
        </div>
      }

      <!-- Actions -->
      @if (showActions) {
        <div class="flex items-center gap-4 mt-4 pt-3 border-t border-neutral-100">
          @if (canEdit) {
            <button
              type="button"
              class="text-sm text-neutral-600 hover:text-primary-600 font-medium"
              (click)="onEdit()"
            >
              Edit
            </button>
          }
          <button
            type="button"
            class="text-sm text-neutral-600 hover:text-red-600 font-medium"
            (click)="onDelete()"
          >
            Delete
          </button>
        </div>
      }
    </div>
  `,
})
export class ReviewCardComponent {
  @Input() set review(value: ReviewCardData) {
    this._review.set(value);
  }
  @Input() showActions = false;
  @Input() canEdit = true;
  @Input() maxContentLength = 250;

  @Output() edit = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();
  @Output() photoClick = new EventEmitter<string>();

  private readonly _review = signal<ReviewCardData>({
    _id: '',
    rating: 0,
    content: '',
    photos: [],
    createdAt: '',
    reviewer: { name: '' },
  });

  private readonly _isExpanded = signal(false);

  readonly reviewData = this._review.asReadonly();
  readonly isExpanded = this._isExpanded.asReadonly();

  readonly initials = computed(() => {
    const name = this._review().reviewer.name;
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  readonly needsTruncation = computed(() => {
    return this._review().content.length > this.maxContentLength;
  });

  readonly truncatedContent = computed(() => {
    const content = this._review().content;
    if (content.length <= this.maxContentLength) return content;
    return content.slice(0, this.maxContentLength).trim() + '...';
  });

  toggleExpand(): void {
    this._isExpanded.update((v) => !v);
  }

  openPhoto(photo: string): void {
    this.photoClick.emit(photo);
  }

  onEdit(): void {
    this.edit.emit(this._review()._id);
  }

  onDelete(): void {
    this.delete.emit(this._review()._id);
  }
}
