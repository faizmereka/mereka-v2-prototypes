import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// ============================================================================
// Types
// ============================================================================

export type ReviewType = 'booking' | 'contract';
export type ReviewStatus = 'active' | 'hidden' | 'deleted';
export type ReviewServiceType = 'experience' | 'expertise';
export type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';
export type ModerationAction = 'hide' | 'unhide' | 'delete';

export interface CriteriaRatings {
  quality: number;
  communication: number;
  professionalism: number;
  timeliness: number;
}

export interface AdminReview {
  _id: string;
  reviewType: ReviewType;
  rating: number;
  content: string;
  status: ReviewStatus;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;

  // For booking reviews
  photos?: string[];
  serviceType?: ReviewServiceType;
  reviewer?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  service?: {
    _id: string;
    name: string;
    type: ReviewServiceType;
    slug?: string;
  };
  hub?: {
    _id: string;
    name: string;
    logo?: string;
  };
  booking?: {
    _id: string;
    bookingDate?: string;
    status?: string;
    totalPaid?: number;
    currency?: string;
  };

  // For contract reviews
  criteriaRatings?: CriteriaRatings;
  reviewerHub?: {
    _id: string;
    name: string;
    logo?: string;
  };
  revieweeHub?: {
    _id: string;
    name: string;
    logo?: string;
  };
  job?: {
    _id: string;
    title: string;
  };
  contract?: {
    _id: string;
    status?: string;
  };

  // Moderation
  moderatedBy?: string;
  moderatedAt?: string;
  moderationReason?: string;
}

export interface ReviewStats {
  totals: {
    bookingReviews: number;
    contractReviews: number;
    totalReviews: number;
  };
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  byStatus: {
    active: number;
    hidden: number;
    deleted: number;
  };
  byMonth: Array<{
    month: string;
    count: number;
    avgRating: number;
  }>;
}

export interface ReviewTrends {
  period: 'week' | 'month' | 'year';
  trends: Array<{
    date: string;
    bookingReviews: number;
    contractReviews: number;
    total: number;
    avgRating: number;
  }>;
}

export interface ReviewFilters {
  type: 'all' | 'booking' | 'contract';
  status: 'all' | ReviewStatus;
  rating: number | null;
  serviceType: ReviewServiceType | null;
  hubId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  search: string;
  sort: SortOption;
}

export interface ReviewsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ModerationInput {
  action: ModerationAction;
  reason?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

interface ReviewsListResponse {
  reviews: AdminReview[];
  pagination: ReviewsPagination;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_FILTERS: ReviewFilters = {
  type: 'all',
  status: 'all',
  rating: null,
  serviceType: null,
  hubId: null,
  dateFrom: null,
  dateTo: null,
  search: '',
  sort: 'newest',
};

const DEFAULT_PAGINATION: ReviewsPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

const DEFAULT_STATS: ReviewStats = {
  totals: { bookingReviews: 0, contractReviews: 0, totalReviews: 0 },
  averageRating: 0,
  ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  byStatus: { active: 0, hidden: 0, deleted: 0 },
  byMonth: [],
};

// ============================================================================
// Admin Review Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class AdminReviewService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/admin/reviews`;

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _reviews = signal<AdminReview[]>([]);
  private readonly _pagination = signal<ReviewsPagination>(DEFAULT_PAGINATION);
  private readonly _stats = signal<ReviewStats>(DEFAULT_STATS);
  private readonly _trends = signal<ReviewTrends | null>(null);
  private readonly _filters = signal<ReviewFilters>(DEFAULT_FILTERS);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly reviews = this._reviews.asReadonly();
  readonly pagination = this._pagination.asReadonly();
  readonly stats = this._stats.asReadonly();
  readonly trends = this._trends.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // ============================================================================
  // Computed Signals
  // ============================================================================

  readonly hasReviews = computed(() => this._reviews().length > 0);
  readonly totalReviews = computed(() => this._pagination().total);
  readonly currentPage = computed(() => this._pagination().page);
  readonly totalPages = computed(() => this._pagination().totalPages);

  readonly activeTab = computed(() => this._filters().type);

  readonly bookingReviews = computed(() =>
    this._reviews().filter((r) => r.reviewType === 'booking')
  );

  readonly contractReviews = computed(() =>
    this._reviews().filter((r) => r.reviewType === 'contract')
  );

  // ============================================================================
  // Filter Methods
  // ============================================================================

  updateFilters(updates: Partial<ReviewFilters>): void {
    this._filters.update((filters) => ({ ...filters, ...updates }));
    this._pagination.update((p) => ({ ...p, page: 1 }));
  }

  resetFilters(): void {
    this._filters.set(DEFAULT_FILTERS);
    this._pagination.update((p) => ({ ...p, page: 1 }));
  }

  setTab(type: 'all' | 'booking' | 'contract'): void {
    this.updateFilters({ type });
  }

  // ============================================================================
  // Data Fetching
  // ============================================================================

  async loadReviews(): Promise<void> {
    if (this._loading()) return;

    this._loading.set(true);
    this._error.set(null);

    try {
      const filters = this._filters();
      const pagination = this._pagination();

      let params = new HttpParams()
        .set('page', pagination.page.toString())
        .set('limit', pagination.limit.toString())
        .set('sort', filters.sort);

      if (filters.status !== 'all') {
        params = params.set('status', filters.status);
      }
      if (filters.rating) {
        params = params.set('rating', filters.rating.toString());
      }
      if (filters.serviceType) {
        params = params.set('serviceType', filters.serviceType);
      }
      if (filters.hubId) {
        params = params.set('hubId', filters.hubId);
      }
      if (filters.dateFrom) {
        params = params.set('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params = params.set('dateTo', filters.dateTo);
      }
      if (filters.search) {
        params = params.set('search', filters.search);
      }

      // Determine endpoint based on type filter
      let endpoint = this.apiUrl;
      if (filters.type === 'booking') {
        endpoint = `${this.apiUrl}/bookings`;
      } else if (filters.type === 'contract') {
        endpoint = `${this.apiUrl}/contracts`;
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse<ReviewsListResponse>>(endpoint, {
          params,
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        this._reviews.set(response.data.reviews);
        this._pagination.set(response.data.pagination);
      } else {
        this._error.set(response.error?.message ?? 'Failed to load reviews');
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      this._error.set('Failed to load reviews');
    } finally {
      this._loading.set(false);
    }
  }

  async loadStats(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<ReviewStats>>(`${this.apiUrl}/stats`, {
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        this._stats.set(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch review stats:', error);
    }
  }

  async loadTrends(period: 'week' | 'month' | 'year' = 'month'): Promise<void> {
    try {
      const params = new HttpParams().set('period', period);
      const response = await firstValueFrom(
        this.http.get<ApiResponse<ReviewTrends>>(`${this.apiUrl}/trends`, {
          params,
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        this._trends.set(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch review trends:', error);
    }
  }

  async loadNextPage(): Promise<void> {
    const pagination = this._pagination();
    if (pagination.page >= pagination.totalPages) {
      return;
    }
    this._pagination.update((p) => ({ ...p, page: p.page + 1 }));
    await this.loadReviews();
  }

  async goToPage(page: number): Promise<void> {
    if (page < 1 || page > this._pagination().totalPages) {
      return;
    }
    this._pagination.update((p) => ({ ...p, page }));
    await this.loadReviews();
  }

  // ============================================================================
  // Review Detail
  // ============================================================================

  async getReviewById(reviewId: string, type?: ReviewType): Promise<AdminReview | null> {
    try {
      let params = new HttpParams();
      if (type) {
        params = params.set('type', type);
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse<AdminReview>>(`${this.apiUrl}/${reviewId}`, {
          params,
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch review:', error);
      return null;
    }
  }

  // ============================================================================
  // Moderation
  // ============================================================================

  async moderateReview(reviewId: string, input: ModerationInput): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.patch<ApiResponse<void>>(`${this.apiUrl}/${reviewId}/moderate`, input, {
          withCredentials: true,
        })
      );

      if (response.success) {
        // Update local state
        this._reviews.update((reviews) =>
          reviews.map((review) =>
            review._id === reviewId
              ? {
                  ...review,
                  status: input.action === 'hide' ? 'hidden' : input.action === 'unhide' ? 'active' : 'deleted',
                  moderationReason: input.reason,
                  moderatedAt: new Date().toISOString(),
                }
              : review
          )
        );
        return true;
      }

      this._error.set(response.error?.message ?? 'Failed to moderate review');
      return false;
    } catch (error) {
      console.error('Failed to moderate review:', error);
      this._error.set('Failed to moderate review');
      return false;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  clearError(): void {
    this._error.set(null);
  }

  reset(): void {
    this._reviews.set([]);
    this._pagination.set(DEFAULT_PAGINATION);
    this._filters.set(DEFAULT_FILTERS);
    this._error.set(null);
  }

  getStatusBadgeClass(status: ReviewStatus): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'hidden':
        return 'bg-yellow-100 text-yellow-800';
      case 'deleted':
        return 'bg-red-100 text-red-800';
    }
  }

  getRatingLabel(rating: number): string {
    const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    return labels[rating] || '';
  }
}
