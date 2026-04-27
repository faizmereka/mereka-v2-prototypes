import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// ============================================================================
// Types
// ============================================================================

export type ReviewServiceType = 'experience' | 'expertise';

export interface BookingReview {
  _id: string;
  bookingId: string;
  serviceId: string;
  serviceType: ReviewServiceType;
  hubId: string;
  reviewerId: string;
  rating: number;
  content: string;
  photos: string[];
  status: 'active' | 'hidden' | 'deleted';
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingReviewInput {
  bookingId: string;
  rating: number;
  content: string;
  photos?: string[];
}

export interface UpdateBookingReviewInput {
  rating?: number;
  content?: string;
  photos?: string[];
}

export interface ReviewListItem {
  _id: string;
  rating: number;
  content: string;
  photos: string[];
  isEdited: boolean;
  createdAt: string;
  service: {
    _id: string;
    name: string;
    slug: string;
    type: ReviewServiceType;
  };
  hub: {
    _id: string;
    name: string;
    logo?: string;
  };
  booking: {
    _id: string;
    date: string;
    status: string;
  };
}

export interface ToReviewItem {
  _id: string;
  bookingId: string;
  serviceId: string;
  serviceType: ReviewServiceType;
  serviceName: string;
  serviceSlug: string;
  coverPhoto?: string;
  hub: {
    _id: string;
    name: string;
    logo?: string;
  };
  bookingDate: string;
  completedAt: string;
}

export interface ReviewWithReplyItem {
  _id: string;
  rating: number;
  content: string;
  photos: string[];
  isEdited: boolean;
  createdAt: string;
  service: {
    _id: string;
    name: string;
    slug: string;
    type: ReviewServiceType;
    coverPhoto?: string;
  };
  hub: {
    _id: string;
    name: string;
    logo?: string;
  };
  hubReply: {
    content: string;
    createdAt: string;
    updatedAt?: string;
  };
}

export interface ReviewsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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
// Review Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = environment.apiUrl;

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _myReviews = signal<ReviewListItem[]>([]);
  private readonly _bookingsToReview = signal<ToReviewItem[]>([]);
  private readonly _reviewsWithReplies = signal<ReviewWithReplyItem[]>([]);
  private readonly _pagination = signal<ReviewsPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  private readonly _toReviewPagination = signal<ReviewsPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  private readonly _repliesPagination = signal<ReviewsPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly myReviews = this._myReviews.asReadonly();
  readonly bookingsToReview = this._bookingsToReview.asReadonly();
  readonly reviewsWithReplies = this._reviewsWithReplies.asReadonly();
  readonly pagination = this._pagination.asReadonly();
  readonly toReviewPagination = this._toReviewPagination.asReadonly();
  readonly repliesPagination = this._repliesPagination.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // ============================================================================
  // Booking Review Methods
  // ============================================================================

  /**
   * Get review for a specific booking
   */
  async getBookingReview(bookingId: string): Promise<BookingReview | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<BookingReview>>(
          `${this.apiUrl}/learner/bookings/${bookingId}/review`,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      // 404 means no review exists
      return null;
    }
  }

  /**
   * Create a review for a booking
   */
  async createBookingReview(data: CreateBookingReviewInput): Promise<BookingReview | null> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<BookingReview>>(
          `${this.apiUrl}/learner/bookings/${data.bookingId}/review`,
          {
            rating: data.rating,
            content: data.content,
            photos: data.photos ?? [],
          },
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        return response.data;
      }

      this._error.set(response.error?.message ?? 'Failed to create review');
      return null;
    } catch (error) {
      console.error('Failed to create review:', error);
      this._error.set('Failed to create review');
      return null;
    }
  }

  /**
   * Update an existing review
   */
  async updateBookingReview(
    bookingId: string,
    data: UpdateBookingReviewInput
  ): Promise<BookingReview | null> {
    try {
      const response = await firstValueFrom(
        this.http.put<ApiResponse<BookingReview>>(
          `${this.apiUrl}/learner/bookings/${bookingId}/review`,
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
      console.error('Failed to update review:', error);
      this._error.set('Failed to update review');
      return null;
    }
  }

  /**
   * Delete a review
   */
  async deleteBookingReview(bookingId: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.delete<ApiResponse<void>>(
          `${this.apiUrl}/learner/bookings/${bookingId}/review`,
          { withCredentials: true }
        )
      );

      return response.success;
    } catch (error) {
      console.error('Failed to delete review:', error);
      this._error.set('Failed to delete review');
      return false;
    }
  }

  // ============================================================================
  // My Reviews List
  // ============================================================================

  /**
   * Load all reviews written by the current user
   */
  async loadMyReviews(options?: { page?: number; limit?: number }): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const params = new HttpParams()
        .set('page', (options?.page ?? this._pagination().page).toString())
        .set('limit', (options?.limit ?? this._pagination().limit).toString());

      const response = await firstValueFrom(
        this.http.get<ApiResponse<ReviewListItem[]>>(
          `${this.apiUrl}/learner/reviews`,
          { params, withCredentials: true }
        )
      );

      if (response.success && response.data) {
        this._myReviews.set(response.data);
        if (response.meta) {
          this._pagination.set(response.meta);
        }
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

  /**
   * Load next page of reviews
   */
  async loadNextPage(): Promise<void> {
    const pagination = this._pagination();
    if (pagination.page >= pagination.totalPages) {
      return;
    }
    await this.loadMyReviews({ page: pagination.page + 1 });
  }

  /**
   * Load completed bookings that haven't been reviewed yet
   */
  async loadBookingsToReview(options?: { page?: number; limit?: number }): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const params = new HttpParams()
        .set('page', (options?.page ?? this._toReviewPagination().page).toString())
        .set('limit', (options?.limit ?? this._toReviewPagination().limit).toString());

      const response = await firstValueFrom(
        this.http.get<ApiResponse<ToReviewItem[]>>(
          `${this.apiUrl}/learner/bookings/to-review`,
          { params, withCredentials: true }
        )
      );

      if (response.success && response.data) {
        this._bookingsToReview.set(response.data);
        if (response.meta) {
          this._toReviewPagination.set(response.meta);
        }
      } else {
        this._error.set(response.error?.message ?? 'Failed to load bookings to review');
      }
    } catch (error) {
      console.error('Failed to fetch bookings to review:', error);
      this._error.set('Failed to load bookings to review');
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Load reviews that have received hub replies
   */
  async loadReviewsWithReplies(options?: { page?: number; limit?: number }): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const params = new HttpParams()
        .set('page', (options?.page ?? this._repliesPagination().page).toString())
        .set('limit', (options?.limit ?? this._repliesPagination().limit).toString());

      const response = await firstValueFrom(
        this.http.get<ApiResponse<ReviewWithReplyItem[]>>(
          `${this.apiUrl}/learner/reviews/with-replies`,
          { params, withCredentials: true }
        )
      );

      if (response.success && response.data) {
        this._reviewsWithReplies.set(response.data);
        if (response.meta) {
          this._repliesPagination.set(response.meta);
        }
      } else {
        this._error.set(response.error?.message ?? 'Failed to load reviews with replies');
      }
    } catch (error) {
      console.error('Failed to fetch reviews with replies:', error);
      this._error.set('Failed to load reviews with replies');
    } finally {
      this._loading.set(false);
    }
  }

  // ============================================================================
  // Public Reviews (for experience/expertise detail pages)
  // ============================================================================

  /**
   * Get public reviews for an experience
   */
  async getExperienceReviews(
    experienceId: string,
    options?: { page?: number; limit?: number; rating?: number }
  ): Promise<{ reviews: BookingReview[]; pagination: ReviewsPagination }> {
    try {
      let params = new HttpParams()
        .set('page', (options?.page ?? 1).toString())
        .set('limit', (options?.limit ?? 10).toString());

      if (options?.rating) {
        params = params.set('rating', options.rating.toString());
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse<BookingReview[]>>(
          `${this.apiUrl}/experiences/${experienceId}/reviews`,
          { params, withCredentials: true }
        )
      );

      return {
        reviews: response.data ?? [],
        pagination: response.meta ?? { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    } catch (error) {
      console.error('Failed to fetch experience reviews:', error);
      return { reviews: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }
  }

  /**
   * Get public reviews for an expertise
   */
  async getExpertiseReviews(
    expertiseId: string,
    options?: { page?: number; limit?: number; rating?: number }
  ): Promise<{ reviews: BookingReview[]; pagination: ReviewsPagination }> {
    try {
      let params = new HttpParams()
        .set('page', (options?.page ?? 1).toString())
        .set('limit', (options?.limit ?? 10).toString());

      if (options?.rating) {
        params = params.set('rating', options.rating.toString());
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse<BookingReview[]>>(
          `${this.apiUrl}/expertises/${expertiseId}/reviews`,
          { params, withCredentials: true }
        )
      );

      return {
        reviews: response.data ?? [],
        pagination: response.meta ?? { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    } catch (error) {
      console.error('Failed to fetch expertise reviews:', error);
      return { reviews: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }
  }

  /**
   * Get public reviews for a hub
   */
  async getHubReviews(
    hubId: string,
    options?: { page?: number; limit?: number; rating?: number; serviceType?: ReviewServiceType }
  ): Promise<{ reviews: BookingReview[]; pagination: ReviewsPagination }> {
    try {
      let params = new HttpParams()
        .set('page', (options?.page ?? 1).toString())
        .set('limit', (options?.limit ?? 10).toString());

      if (options?.rating) {
        params = params.set('rating', options.rating.toString());
      }
      if (options?.serviceType) {
        params = params.set('serviceType', options.serviceType);
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse<BookingReview[]>>(
          `${this.apiUrl}/hubs/${hubId}/reviews`,
          { params, withCredentials: true }
        )
      );

      return {
        reviews: response.data ?? [],
        pagination: response.meta ?? { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    } catch (error) {
      console.error('Failed to fetch hub reviews:', error);
      return { reviews: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
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
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }
}
