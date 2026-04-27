import { Component, input, signal, inject, computed, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ExperienceService } from '../../services/experience.service';
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
  selector: 'app-experience-reviews',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experience-reviews.component.html',
})
export class ExperienceReviewsComponent implements OnInit {
  readonly slug = input.required<string>();
  private readonly experienceService = inject(ExperienceService);
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
    // Effect to load reviews when experience changes
    effect(() => {
      const exp = this.experienceService.experience();
      if (exp?._id) {
        void this.loadReviews(exp._id);
      }
    });
  }

  ngOnInit(): void {
    const exp = this.experienceService.experience();
    if (exp?._id) {
      void this.loadReviews(exp._id);
    }
  }

  private async loadReviews(experienceId: string, rating?: number): Promise<void> {
    this.isLoading.set(true);

    try {
      let params = new HttpParams()
        .set('page', '1')
        .set('limit', '20');

      if (rating) {
        params = params.set('rating', rating.toString());
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse>(
          `${environment.apiUrl}/experiences/${experienceId}/reviews`,
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
      console.error('Failed to load experience reviews:', error);
      // Fall back to experience metadata
      const exp = this.experienceService.experience();
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

  readonly hasReviews = computed(() => this.reviewsData().reviews.length > 0);

  readonly ratingFilters = computed(() => {
    const perRating = this.reviewsData().meta.totalPerRating;
    return ['5', '4', '3', '2', '1'].map((rating) => ({
      rating: rating as RatingFilter,
      count: perRating[rating] || 0,
    }));
  });

  readonly filteredReviews = computed(() => {
    const filter = this.currentFilter();
    const reviews = this.reviewsData().reviews;
    if (filter === 'All') return reviews;
    return reviews.filter((r) => r.rating === parseInt(filter));
  });

  setFilter(filter: RatingFilter): void {
    this.currentFilter.set(filter);
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
