import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthStateService } from '../../../core/services/auth-state.service';

// ============================================================================
// Types
// ============================================================================

export type ReviewType = 'booking' | 'contract';
export type ReviewServiceType = 'experience' | 'expertise';
export type ReviewStatus = 'active' | 'hidden' | 'deleted';
export type ReviewFilter = 'all' | 'notReplied' | 'replied';

export interface CriteriaRatings {
  quality: number;
  communication: number;
  professionalism: number;
  timeliness: number;
}

export interface HubReplyData {
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface HubBookingReview {
  _id: string;
  bookingId: string;
  serviceName: string;
  serviceType: ReviewServiceType;
  serviceId: string;
  rating: number;
  content: string;
  photos: string[];
  reviewer: {
    name: string;
    avatar?: string;
  };
  hubReply?: HubReplyData;
  isEdited: boolean;
  createdAt: string;
}

export interface HubContractReview {
  _id: string;
  reviewType: 'contract';
  rating: number;
  criteriaRatings: CriteriaRatings;
  content: string;
  status: ReviewStatus;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  reviewerHub: {
    _id: string;
    name: string;
    logo?: string;
  };
  revieweeHub: {
    _id: string;
    name: string;
    logo?: string;
  };
  job: {
    _id: string;
    title: string;
  };
  contract: {
    _id: string;
    status: string;
  };
}

export type HubReview = HubBookingReview | HubContractReview;

export interface ReviewStats {
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

export interface ReviewsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Contract review specific types
export interface ContractReviewStatus {
  canReview: boolean;
  hasReviewed: boolean;
  myReview?: HubContractReview;
  theirReview?: HubContractReview;
}

export interface CreateContractReviewInput {
  rating: number;
  criteriaRatings: CriteriaRatings;
  content: string;
}

export interface UpdateContractReviewInput {
  rating?: number;
  criteriaRatings?: Partial<CriteriaRatings>;
  content?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: ReviewsPagination;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_PAGINATION: ReviewsPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

const DEFAULT_STATS: ReviewStats = {
  averageRating: 0,
  totalReviews: 0,
  ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

// ============================================================================
// Hub Review Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class HubReviewService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);

  private getApiUrl(hubId: string): string {
    return `${environment.apiUrl}/hub/${hubId}`;
  }

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _reviews = signal<HubBookingReview[]>([]);
  private readonly _pagination = signal<ReviewsPagination>(DEFAULT_PAGINATION);
  private readonly _stats = signal<ReviewStats>(DEFAULT_STATS);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Filters
  private readonly _reviewType = signal<'all' | 'booking' | 'contract'>('all');
  private readonly _serviceType = signal<ReviewServiceType | 'all'>('all');
  private readonly _replyFilter = signal<ReviewFilter>('all');

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly reviews = this._reviews.asReadonly();
  readonly pagination = this._pagination.asReadonly();
  readonly stats = this._stats.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly reviewType = this._reviewType.asReadonly();
  readonly serviceType = this._serviceType.asReadonly();
  readonly replyFilter = this._replyFilter.asReadonly();

  // ============================================================================
  // Computed Signals
  // ============================================================================

  readonly hasReviews = computed(() => this._reviews().length > 0);
  readonly totalReviews = computed(() => this._pagination().total);
  readonly currentPage = computed(() => this._pagination().page);
  readonly totalPages = computed(() => this._pagination().totalPages);

  readonly bookingReviews = computed(() => this._reviews());

  // Contract reviews are loaded separately via getHubContractReviews()
  private readonly _contractReviews = signal<HubContractReview[]>([]);
  readonly contractReviews = this._contractReviews.asReadonly();

  // ============================================================================
  // Filter Methods
  // ============================================================================

  setReviewType(type: 'all' | 'booking' | 'contract'): void {
    this._reviewType.set(type);
    this._pagination.update((p) => ({ ...p, page: 1 }));
  }

  setServiceType(type: ReviewServiceType | 'all'): void {
    this._serviceType.set(type);
    this._pagination.update((p) => ({ ...p, page: 1 }));
  }

  setReplyFilter(filter: ReviewFilter): void {
    this._replyFilter.set(filter);
    this._pagination.update((p) => ({ ...p, page: 1 }));
  }

  // ============================================================================
  // Hub Reviews (received reviews)
  // ============================================================================

  /**
   * Load all reviews received by the hub
   */
  async loadHubReviews(options?: { page?: number; limit?: number }): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      this._error.set('No hub selected');
      return;
    }

    if (this._loading()) {
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      let params = new HttpParams()
        .set('page', (options?.page ?? this._pagination().page).toString())
        .set('limit', (options?.limit ?? this._pagination().limit).toString());

      const type = this._reviewType();
      if (type !== 'all') {
        params = params.set('type', type);
      }

      const serviceType = this._serviceType();
      if (serviceType !== 'all') {
        params = params.set('serviceType', serviceType);
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse<HubBookingReview[]>>(
          `${this.getApiUrl(hubId)}/reviews`,
          { params, withCredentials: true }
        )
      );

      if (response.success && response.data) {
        this._reviews.set(response.data);
        if (response.meta) {
          this._pagination.set(response.meta);
        }
      } else {
        this._error.set(response.error?.message ?? 'Failed to load reviews');
      }
    } catch (error) {
      console.error('Failed to fetch hub reviews:', error);
      this._error.set('Failed to load reviews');
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Load review statistics for the hub
   */
  async loadStats(): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return;

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<ReviewStats>>(
          `${this.getApiUrl(hubId)}/reviews/stats`,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        this._stats.set(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch review stats:', error);
    }
  }

  /**
   * Load next page
   */
  async loadNextPage(): Promise<void> {
    const pagination = this._pagination();
    if (pagination.page >= pagination.totalPages) {
      return;
    }
    await this.loadHubReviews({ page: pagination.page + 1 });
  }

  // ============================================================================
  // Hub Reply Methods (for Booking Reviews)
  // ============================================================================

  /**
   * Add a hub reply to a booking review
   */
  async addHubReply(bookingId: string, content: string): Promise<boolean> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return false;

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<{ hubReply: { content: string; createdAt: string } }>>(
          `${environment.apiUrl}/hub/${hubId}/bookings/${bookingId}/reply`,
          { content },
          { withCredentials: true }
        )
      );

      if (response.success) {
        // Reload reviews to reflect the change
        await this.loadHubReviews();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add hub reply:', error);
      return false;
    }
  }

  /**
   * Update an existing hub reply
   */
  async updateHubReply(bookingId: string, content: string): Promise<boolean> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return false;

    try {
      const response = await firstValueFrom(
        this.http.put<ApiResponse<{ hubReply: { content: string; createdAt: string; updatedAt: string } }>>(
          `${environment.apiUrl}/hub/${hubId}/bookings/${bookingId}/reply`,
          { content },
          { withCredentials: true }
        )
      );

      if (response.success) {
        await this.loadHubReviews();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update hub reply:', error);
      return false;
    }
  }

  /**
   * Delete a hub reply
   */
  async deleteHubReply(bookingId: string): Promise<boolean> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return false;

    try {
      const response = await firstValueFrom(
        this.http.delete<ApiResponse<{ message: string }>>(
          `${environment.apiUrl}/hub/${hubId}/bookings/${bookingId}/reply`,
          { withCredentials: true }
        )
      );

      if (response.success) {
        await this.loadHubReviews();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete hub reply:', error);
      return false;
    }
  }

  // ============================================================================
  // Contract Review Methods
  // ============================================================================

  /**
   * Get contract review status (can review, has reviewed, reviews)
   */
  async getContractReviewStatus(contractId: string): Promise<ContractReviewStatus | null> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return null;

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<ContractReviewStatus>>(
          `${this.getApiUrl(hubId)}/contracts/${contractId}/reviews/status`,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch contract review status:', error);
      return null;
    }
  }

  /**
   * Get all reviews for a contract
   */
  async getContractReviews(contractId: string): Promise<HubContractReview[]> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return [];

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<HubContractReview[]>>(
          `${this.getApiUrl(hubId)}/contracts/${contractId}/reviews`,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch contract reviews:', error);
      return [];
    }
  }

  /**
   * Create a contract review
   */
  async createContractReview(
    contractId: string,
    data: CreateContractReviewInput
  ): Promise<HubContractReview | null> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      this._error.set('No hub selected');
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<HubContractReview>>(
          `${this.getApiUrl(hubId)}/contracts/${contractId}/reviews`,
          data,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        return response.data;
      }

      this._error.set(response.error?.message ?? 'Failed to create review');
      return null;
    } catch (error) {
      console.error('Failed to create contract review:', error);
      this._error.set('Failed to create review');
      return null;
    }
  }

  /**
   * Update a contract review
   */
  async updateContractReview(
    contractId: string,
    reviewId: string,
    data: UpdateContractReviewInput
  ): Promise<HubContractReview | null> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      this._error.set('No hub selected');
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.http.put<ApiResponse<HubContractReview>>(
          `${this.getApiUrl(hubId)}/contracts/${contractId}/reviews/${reviewId}`,
          data,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        return response.data;
      }

      this._error.set(response.error?.message ?? 'Failed to update review');
      return null;
    } catch (error) {
      console.error('Failed to update contract review:', error);
      this._error.set('Failed to update review');
      return null;
    }
  }

  // ============================================================================
  // Hub's Contract Reviews List
  // ============================================================================

  /**
   * Get all contract reviews for the hub (as reviewer or reviewee)
   */
  async getHubContractReviews(options?: {
    page?: number;
    limit?: number;
    asReviewer?: boolean;
  }): Promise<{ reviews: HubContractReview[]; pagination: ReviewsPagination }> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      return { reviews: [], pagination: DEFAULT_PAGINATION };
    }

    this._loading.set(true);

    try {
      let params = new HttpParams()
        .set('page', (options?.page ?? 1).toString())
        .set('limit', (options?.limit ?? 20).toString());

      if (options?.asReviewer !== undefined) {
        params = params.set('asReviewer', options.asReviewer.toString());
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse<HubContractReview[]>>(
          `${this.getApiUrl(hubId)}/contract-reviews`,
          { params, withCredentials: true }
        )
      );

      const reviews = response.data ?? [];
      this._contractReviews.set(reviews);

      return {
        reviews,
        pagination: response.meta ?? DEFAULT_PAGINATION,
      };
    } catch (error) {
      console.error('Failed to fetch hub contract reviews:', error);
      return { reviews: [], pagination: DEFAULT_PAGINATION };
    } finally {
      this._loading.set(false);
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if a review can still be edited (within 30 days)
   */
  canEditReview(createdAt: string): boolean {
    const createdDate = new Date(createdAt);
    const now = new Date();
    const daysSinceCreated = Math.floor(
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceCreated <= 30;
  }

  /**
   * Calculate average criteria rating
   */
  getAverageCriteriaRating(criteriaRatings: CriteriaRatings): number {
    const values = Object.values(criteriaRatings);
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round((sum / values.length) * 10) / 10;
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Reset state (on hub change)
   */
  reset(): void {
    this._reviews.set([]);
    this._pagination.set(DEFAULT_PAGINATION);
    this._stats.set(DEFAULT_STATS);
    this._error.set(null);
    this._reviewType.set('all');
    this._serviceType.set('all');
    this._replyFilter.set('all');
  }
}
