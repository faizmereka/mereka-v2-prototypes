import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TransferState, makeStateKey } from '@angular/core';
import { Observable, firstValueFrom, catchError, of, tap, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  ExpertiseDetail,
  FeaturedExpertise,
  ExpertiseMode,
  ApiResponse,
  ExpertiseSlotsResponse,
  ExpertiseListItem,
  ExpertiseFilters,
} from '../models';

export interface ExpertiseReview {
  _id: string;
  rating: number;
  content: string;
  photos: string[];
  reviewer: {
    name: string;
    avatar?: string;
  };
  isEdited: boolean;
  createdAt: string;
}

export interface ExpertiseReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface ExpertiseReviewsResult {
  reviews: ExpertiseReview[];
  stats: ExpertiseReviewStats;
  pagination: {
    cursor: string | null;
    hasMore: boolean;
  };
}

// TransferState key factory for expertise data (uses slug as unique key)
const makeExpertiseKey = (slug: string) =>
  makeStateKey<ExpertiseDetail>(`expertise-${slug}`);

/**
 * Expertise Service - API Integration with SSR Support
 * Uses TransferState to transfer server-fetched data to the client
 */
@Injectable({ providedIn: 'root' })
export class ExpertiseService {
  private readonly http = inject(HttpClient);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = `${environment.apiUrl}/expertises`;

  // State signals
  private readonly _expertise = signal<ExpertiseDetail | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _featuredList = signal<FeaturedExpertise[]>([]);
  private readonly _featuredLoading = signal(false);

  // List state signals
  private readonly _expertises = signal<ExpertiseListItem[]>([]);
  private readonly _listLoading = signal(false);
  private readonly _pagination = signal({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Reviews state signals
  private readonly _reviews = signal<ExpertiseReview[]>([]);
  private readonly _reviewsLoading = signal(false);
  private readonly _reviewStats = signal<ExpertiseReviewStats>({
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  private readonly _reviewsPagination = signal<{ cursor: string | null; hasMore: boolean }>({
    cursor: null,
    hasMore: false,
  });

  // Public readonly signals
  readonly expertise = this._expertise.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly featuredList = this._featuredList.asReadonly();
  readonly featuredLoading = this._featuredLoading.asReadonly();

  // List readonly signals
  readonly expertises = this._expertises.asReadonly();
  readonly listLoading = this._listLoading.asReadonly();
  readonly pagination = this._pagination.asReadonly();
  readonly hasExpertises = computed(() => this._expertises().length > 0);

  // Reviews readonly signals
  readonly reviews = this._reviews.asReadonly();
  readonly reviewsLoading = this._reviewsLoading.asReadonly();
  readonly reviewStats = this._reviewStats.asReadonly();
  readonly reviewsPagination = this._reviewsPagination.asReadonly();
  readonly hasReviews = computed(() => this._reviews().length > 0);

  // Computed: Determine expertise mode
  readonly expertiseMode = computed<ExpertiseMode>(() => {
    const exp = this._expertise();
    if (!exp?.ticket?.length) return 'physical';

    const hasOnline = exp.ticket.some((t) => t.expertiseMode === 'online');
    const hasPhysical = exp.ticket.some((t) => t.expertiseMode === 'physical');

    if (hasOnline && hasPhysical) return 'hybrid';
    if (hasOnline) return 'online';
    return 'physical';
  });

  // Computed: Gallery images
  readonly galleryImages = computed<string[]>(() => {
    const exp = this._expertise();
    if (!exp) return [];
    const images = (exp.gallery || []).filter((img) => img !== '');
    if (exp.coverPhoto) images.unshift(exp.coverPhoto);
    return images;
  });

  // Computed: Lowest price
  readonly lowestPrice = computed<number | null>(() => {
    const exp = this._expertise();
    if (!exp?.ticket?.length) return null;
    return Math.min(...exp.ticket.map((t) => t.standardRate));
  });

  // Computed: Languages
  readonly languages = computed<string[]>(() => {
    const exp = this._expertise();
    if (!exp) return [];
    return [exp.primaryLanguage, ...(exp.secondaryLanguages || [])].filter(
      Boolean
    ) as string[];
  });

  // Computed: Has expertise
  readonly hasExpertise = computed(() => !!this._expertise());

  // Computed: Has featured
  readonly hasFeaturedExpertises = computed(
    () => this._featuredList().length > 0
  );

  /**
   * Fetch expertise detail by slug
   * Uses TransferState to transfer server-fetched data to the client
   */
  getExpertiseBySlug(slug: string): Observable<ExpertiseDetail | null> {
    const stateKey = makeExpertiseKey(slug);

    // If same slug already loaded, return cached as Observable
    const currentExp = this._expertise();
    if (currentExp?.slug === slug) {
      return of(currentExp);
    }

    // On browser, check if data was transferred from server
    if (isPlatformBrowser(this.platformId)) {
      const transferredData = this.transferState.get(stateKey, null);
      if (transferredData) {
        // Remove the key so it's not used again on navigation
        this.transferState.remove(stateKey);
        this._expertise.set(transferredData);
        return of(transferredData);
      }
    }

    // Prevent duplicate calls while loading
    if (this._loading()) {
      return of(null);
    }

    this._loading.set(true);
    this._error.set(null);

    return this.http
      .get<ApiResponse<ExpertiseDetail>>(`${this.apiUrl}/${slug}`)
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            this._error.set(response.error?.message || 'Expertise not found');
            this._expertise.set(null);
            return null;
          }
          return response.data;
        }),
        tap((data) => {
          if (data) {
            this._expertise.set(data);

            // On server, store data in TransferState for client
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(stateKey, data);
            }
          }
          this._loading.set(false);
        }),
        catchError((err) => {
          console.error('Error fetching expertise:', err);
          this._error.set('Failed to load expertise');
          this._expertise.set(null);
          this._loading.set(false);
          return of(null);
        })
      );
  }

  /**
   * Fetch expertise list with filters
   */
  getExpertises(filters: ExpertiseFilters = {}): Observable<ExpertiseListItem[]> {
    this._listLoading.set(true);

    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.search) params = params.set('search', filters.search);

    return this.http
      .get<{ success: boolean; data: ExpertiseListItem[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
        this.apiUrl,
        { params }
      )
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this._expertises.set(response.data);
            this._pagination.set({
              page: response.meta.page,
              limit: response.meta.limit,
              total: response.meta.total,
              totalPages: response.meta.totalPages,
            });
          }
          this._listLoading.set(false);
        }),
        map((response) => response.data || []),
        catchError((err) => {
          console.error('Error fetching expertises:', err);
          this._listLoading.set(false);
          return of([]);
        })
      );
  }

  /**
   * Fetch featured expertises from same hub (lazy load)
   */
  async getFeaturedExpertises(
    slug: string,
    limit: number = 4
  ): Promise<FeaturedExpertise[]> {
    this._featuredLoading.set(true);

    try {
      const response = await firstValueFrom(
        this.http
          .get<ApiResponse<FeaturedExpertise[]>>(
            `${this.apiUrl}/${slug}/featured`,
            {
              params: { limit },
            }
          )
          .pipe(
            catchError((err) => {
              console.error('Error fetching featured expertises:', err);
              return of({
                success: false,
                error: {
                  code: 'FETCH_ERROR',
                  message: 'Failed to fetch featured expertises',
                },
              } as ApiResponse<FeaturedExpertise[]>);
            })
          )
      );

      if (!response.success || !response.data) {
        this._featuredList.set([]);
        return [];
      }

      this._featuredList.set(response.data);
      return response.data;
    } catch (err) {
      console.error('Error in getFeaturedExpertises:', err);
      this._featuredList.set([]);
      return [];
    } finally {
      this._featuredLoading.set(false);
    }
  }

  // Format duration (session duration to readable)
  formatDuration(duration: number, unit?: string): string {
    if (!duration) return 'N/A';

    if (unit === 'hours') {
      if (duration === 1) return '1 hour';
      return `${duration} hours`;
    }

    // Default to minutes
    if (duration < 60) return `${duration} min`;
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${mins}min`;
  }

  // Get location text
  getLocationText(): string {
    const location = this._expertise()?.location;
    if (!location) return '';

    const parts = [location.city, location.state, location.country].filter(
      Boolean
    );
    return parts.join(', ');
  }

  // Clear state
  clear(): void {
    this._expertise.set(null);
    this._featuredList.set([]);
    this._reviews.set([]);
    this._reviewStats.set({
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
    this._reviewsPagination.set({ cursor: null, hasMore: false });
    this._error.set(null);
    this._loading.set(false);
    this._featuredLoading.set(false);
    this._reviewsLoading.set(false);
  }

  /**
   * Fetch expertise reviews
   * @param expertiseId - The expertise's ObjectId (not slug)
   */
  async getExpertiseReviews(
    expertiseId: string,
    options: { limit?: number; cursor?: string; rating?: number } = {}
  ): Promise<ExpertiseReviewsResult | null> {
    this._reviewsLoading.set(true);

    try {
      let params = new HttpParams();
      if (options.limit) params = params.set('limit', options.limit.toString());
      if (options.cursor) params = params.set('cursor', options.cursor);
      if (options.rating) params = params.set('rating', options.rating.toString());

      const response = await firstValueFrom(
        this.http
          .get<ApiResponse<ExpertiseReviewsResult>>(
            `${environment.apiUrl}/expertises/${expertiseId}/reviews`,
            { params }
          )
          .pipe(
            catchError((err) => {
              console.error('Error fetching expertise reviews:', err);
              return of({
                success: false,
                error: { code: 'FETCH_ERROR', message: 'Failed to fetch reviews' },
              } as ApiResponse<ExpertiseReviewsResult>);
            })
          )
      );

      if (!response.success || !response.data) {
        this._reviews.set([]);
        this._reviewStats.set({
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        });
        return null;
      }

      // If cursor provided, append to existing reviews; otherwise replace
      if (options.cursor) {
        this._reviews.update((current) => [...current, ...response.data!.reviews]);
      } else {
        this._reviews.set(response.data.reviews);
      }
      this._reviewStats.set(response.data.stats);
      this._reviewsPagination.set(response.data.pagination);

      return response.data;
    } catch (err) {
      console.error('Error in getExpertiseReviews:', err);
      this._reviews.set([]);
      return null;
    } finally {
      this._reviewsLoading.set(false);
    }
  }

  /**
   * Fetch available slots for booking
   * Uses the backend slots API which checks against existing bookings
   */
  async getExpertiseSlots(
    slug: string,
    ticketId?: string,
    daysAhead: number = 30
  ): Promise<ExpertiseSlotsResponse | null> {
    try {
      let url = `${this.apiUrl}/${slug}/slots?daysAhead=${daysAhead}`;
      if (ticketId) {
        url += `&ticketId=${ticketId}`;
      }

      const response = await firstValueFrom(
        this.http
          .get<ApiResponse<ExpertiseSlotsResponse>>(url)
          .pipe(
            catchError((err) => {
              console.error('Error fetching expertise slots:', err);
              return of({
                success: false,
                error: {
                  code: 'FETCH_ERROR',
                  message: 'Failed to fetch slots',
                },
              } as ApiResponse<ExpertiseSlotsResponse>);
            })
          )
      );

      if (!response.success || !response.data) {
        return null;
      }

      return response.data;
    } catch (err) {
      console.error('Error in getExpertiseSlots:', err);
      return null;
    }
  }
}
