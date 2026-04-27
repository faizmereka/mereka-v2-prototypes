import { Component, input, signal, inject, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ExpertiseService } from '../../services/expertise.service';
import { environment } from '../../../../../environments/environment';

export interface ReviewUser {
  name: string;
  profileUrl: string;
}

export interface Review {
  id: string;
  user: ReviewUser;
  rating: number;
  reviewDescription: string;
  photos: string[];
  createdAt: string;
}

export interface ReviewsMeta {
  average: number;
  total: number;
  totalPerRating: Record<string, number>;
}

export interface ReviewsData {
  meta: ReviewsMeta;
  reviews: Review[];
}

interface ApiReview {
  _id: string;
  rating: number;
  content: string;
  photos?: string[];
  createdAt: string;
  reviewer?: {
    _id: string;
    name: string;
    profileImage?: string;
  };
}

interface ApiResponse {
  success: boolean;
  data?: {
    reviews: ApiReview[];
    stats: {
      totalReviews: number;
      averageRating: number;
      ratingDistribution: Record<string, number>;
    };
    pagination: {
      cursor: string | null;
      hasMore: boolean;
    };
  };
}

type RatingFilter = 'All' | '5' | '4' | '3' | '2' | '1';

@Component({
  selector: 'app-expertise-reviews',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (hasReviews()) {
      <section class="py-12 bg-neutral-50" data-testid="expertise-reviews-section">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-neutral-900">Reviews</h2>
          </div>

          <!-- Reviews Summary & Filter -->
          <div class="flex flex-wrap items-center gap-3 mb-6">
            <!-- Summary -->
            <div class="flex items-center gap-2 text-neutral-900">
              <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span class="font-medium">
                {{ reviewsData().meta.average.toFixed(1) }}
                ({{ reviewsData().meta.total }})
              </span>
            </div>

            <!-- Filter Buttons -->
            <div class="flex flex-wrap gap-2">
              <button
                (click)="setFilter('All')"
                class="px-3 py-1.5 text-sm font-medium rounded-full border transition-colors"
                [class.bg-primary]="currentFilter() === 'All'"
                [class.text-white]="currentFilter() === 'All'"
                [class.border-primary]="currentFilter() === 'All'"
                [class.bg-white]="currentFilter() !== 'All'"
                [class.text-neutral-700]="currentFilter() !== 'All'"
                [class.border-neutral-300]="currentFilter() !== 'All'"
                [class.hover:border-neutral-400]="currentFilter() !== 'All'"
                data-testid="expertise-reviews-filter-all"
              >
                @if (currentFilter() === 'All') {
                  <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                }
                All
              </button>

              @for (filter of ratingFilters(); track filter.rating) {
                <button
                  (click)="setFilter(filter.rating)"
                  [disabled]="filter.count === 0"
                  class="px-3 py-1.5 text-sm font-medium rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  [class.bg-primary]="currentFilter() === filter.rating"
                  [class.text-white]="currentFilter() === filter.rating"
                  [class.border-primary]="currentFilter() === filter.rating"
                  [class.bg-white]="currentFilter() !== filter.rating"
                  [class.text-neutral-700]="currentFilter() !== filter.rating"
                  [class.border-neutral-300]="currentFilter() !== filter.rating"
                  [class.hover:border-neutral-400]="currentFilter() !== filter.rating && filter.count > 0"
                  [attr.data-testid]="'expertise-reviews-filter-' + filter.rating"
                >
                  @if (currentFilter() === filter.rating) {
                    <svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  }
                  {{ filter.rating }} ({{ filter.count }})
                </button>
              }
            </div>
          </div>

          <!-- Loading State -->
          @if (isLoading()) {
            <div class="flex items-center justify-center py-12">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          } @else {
            <!-- Reviews Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (review of filteredReviews(); track review.id) {
                <div class="bg-white rounded-xl border border-neutral-200 p-5" data-testid="expertise-review-item">
                  <!-- User Info -->
                  <div class="flex items-center gap-3 mb-3">
                    @if (review.user.profileUrl) {
                      <img
                        [src]="review.user.profileUrl"
                        [alt]="review.user.name"
                        class="w-10 h-10 rounded-full object-cover"
                      />
                    } @else {
                      <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                        {{ getInitials(review.user.name) }}
                      </div>
                    }
                    <div>
                      <h4 class="font-medium text-neutral-900">{{ review.user.name }}</h4>
                      <!-- Stars -->
                      <div class="flex gap-0.5">
                        @for (star of getStars(review.rating); track $index) {
                          <svg
                            class="w-4 h-4"
                            [class.text-yellow-400]="star === 1"
                            [class.text-neutral-200]="star === 0"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Review Text -->
                  <p class="text-neutral-600 text-sm line-clamp-4" data-testid="expertise-review-content">
                    {{ review.reviewDescription }}
                  </p>

                  <!-- Review Photos -->
                  @if (review.photos.length > 0) {
                    <div class="flex gap-2 mt-3">
                      @for (photo of review.photos.slice(0, 3); track $index) {
                        <img
                          [src]="photo"
                          alt="Review photo"
                          class="w-16 h-16 rounded-lg object-cover"
                        />
                      }
                      @if (review.photos.length > 3) {
                        <div class="w-16 h-16 rounded-lg bg-neutral-100 flex items-center justify-center text-sm text-neutral-500">
                          +{{ review.photos.length - 3 }}
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Empty State -->
            @if (filteredReviews().length === 0) {
              <div class="text-center py-8">
                <p class="text-neutral-500">No reviews found for this rating.</p>
              </div>
            }
          }
        </div>
      </section>
    }
  `,
})
export class ExpertiseReviewsComponent implements OnInit {
  readonly slug = input.required<string>();
  private readonly expertiseService = inject(ExpertiseService);
  private readonly http = inject(HttpClient);

  readonly currentFilter = signal<RatingFilter>('All');
  readonly isLoading = signal(false);
  private readonly _reviews = signal<Review[]>([]);
  private readonly _meta = signal<ReviewsMeta>({
    average: 0,
    total: 0,
    totalPerRating: {},
  });

  constructor() {
    // Effect to load reviews when expertise changes
    effect(() => {
      const exp = this.expertiseService.expertise();
      if (exp?._id) {
        void this.loadReviews(exp._id);
      }
    });
  }

  ngOnInit(): void {
    const exp = this.expertiseService.expertise();
    if (exp?._id) {
      void this.loadReviews(exp._id);
    }
  }

  private async loadReviews(expertiseId: string, rating?: number): Promise<void> {
    this.isLoading.set(true);

    try {
      let params = new HttpParams().set('page', '1').set('limit', '20');

      if (rating) {
        params = params.set('rating', rating.toString());
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse>(
          `${environment.apiUrl}/expertises/${expertiseId}/reviews`,
          { params }
        )
      );

      if (response.success && response.data) {
        // Transform API reviews to component format
        const reviews: Review[] = response.data.reviews.map((r) => ({
          id: r._id,
          user: {
            name: r.reviewer?.name || 'Anonymous',
            profileUrl: r.reviewer?.profileImage || '',
          },
          rating: r.rating,
          reviewDescription: r.content,
          photos: r.photos || [],
          createdAt: r.createdAt,
        }));

        this._reviews.set(reviews);

        // Update meta from API response stats
        this._meta.set({
          average: response.data.stats.averageRating,
          total: response.data.stats.totalReviews,
          totalPerRating: response.data.stats.ratingDistribution,
        });
      }
    } catch (error) {
      console.error('Failed to load expertise reviews:', error);
      // Fall back to expertise metadata
      const exp = this.expertiseService.expertise();
      this._meta.set({
        average: exp?.rating ?? 0,
        total: exp?.totalReviews ?? 0,
        totalPerRating: {},
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  // Computed reviews data combining loaded reviews with metadata
  readonly reviewsData = computed<ReviewsData>(() => {
    return {
      meta: this._meta(),
      reviews: this._reviews(),
    };
  });

  readonly hasReviews = computed(() => this._meta().total > 0 || this._reviews().length > 0);

  readonly ratingFilters = computed(() => {
    const perRating = this.reviewsData().meta.totalPerRating;
    return ['5', '4', '3', '2', '1'].map((r) => ({
      rating: r as RatingFilter,
      count: perRating[r] || 0,
    }));
  });

  readonly filteredReviews = computed(() => {
    const filter = this.currentFilter();
    const reviews = this.reviewsData().reviews;
    if (filter === 'All') return reviews;
    return reviews.filter((r) => r.rating === parseInt(filter, 10));
  });

  setFilter(filter: RatingFilter): void {
    this.currentFilter.set(filter);
    // Optionally reload reviews with filter from API
    const exp = this.expertiseService.expertise();
    if (exp?._id && filter !== 'All') {
      void this.loadReviews(exp._id, parseInt(filter, 10));
    } else if (exp?._id) {
      void this.loadReviews(exp._id);
    }
  }

  getStars(rating: number): number[] {
    return Array(5)
      .fill(0)
      .map((_, i) => (i < rating ? 1 : 0));
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
