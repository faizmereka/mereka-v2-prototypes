import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StarRatingComponent } from '../star-rating/star-rating.component';

export interface ReviewStatsData {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

/**
 * Review Stats Component
 * Displays review statistics with rating distribution
 */
@Component({
  selector: 'app-review-stats',
  standalone: true,
  imports: [CommonModule, StarRatingComponent],
  template: `
    <div class="bg-white rounded-lg border border-neutral-200 p-6">
      <div class="flex flex-col md:flex-row gap-6">
        <!-- Average Rating -->
        <div class="flex-shrink-0 text-center md:text-left md:pr-6 md:border-r md:border-neutral-200">
          <div class="text-4xl font-bold text-neutral-900">{{ formattedAverage() }}</div>
          <div class="text-sm text-neutral-500 mb-2">out of 5</div>
          <app-star-rating [rating]="statsData().averageRating" size="md" />
          <div class="text-sm text-neutral-600 mt-2">
            Based on {{ statsData().totalReviews }} {{ statsData().totalReviews === 1 ? 'review' : 'reviews' }}
          </div>
        </div>

        <!-- Rating Distribution -->
        <div class="flex-1">
          @for (bar of distributionBars(); track bar.rating) {
            <div class="flex items-center gap-3 mb-2">
              <div class="flex items-center gap-1 w-12 flex-shrink-0">
                <span class="text-sm text-neutral-600">{{ bar.rating }}</span>
                <svg class="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
              </div>
              <div class="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-yellow-400 rounded-full transition-all duration-300"
                  [style.width.%]="bar.percentage"
                ></div>
              </div>
              <span class="text-sm text-neutral-500 w-10 text-right">{{ bar.count }}</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class ReviewStatsComponent {
  @Input() set stats(value: ReviewStatsData) {
    this._stats.set(value);
  }

  private readonly _stats = signal<ReviewStatsData>({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });

  readonly statsData = this._stats.asReadonly();

  readonly formattedAverage = computed(() => {
    return this._stats().averageRating.toFixed(1);
  });

  readonly distributionBars = computed(() => {
    const stats = this._stats();
    const total = stats.totalReviews || 1; // Avoid division by zero
    const distribution = stats.ratingDistribution;

    // Return bars from 5 to 1 (highest first)
    return [5, 4, 3, 2, 1].map((rating) => {
      const count = distribution[rating as 1 | 2 | 3 | 4 | 5] || 0;
      return {
        rating,
        count,
        percentage: (count / total) * 100,
      };
    });
  });
}
