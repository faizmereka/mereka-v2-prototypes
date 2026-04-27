import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TransferState, makeStateKey } from '@angular/core';
import { Observable, firstValueFrom, catchError, of, tap, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  ExperienceDetail,
  ExperienceEvent,
  ExperienceListItem,
  FeaturedExperience,
  ExperienceSlotsResponse,
  ApiResponse,
  PaginatedResponse,
} from '../models/experience.model';

export interface ExperienceFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ExperienceReview {
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

export interface ExperienceReviewStats {
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

export interface ExperienceReviewsResult {
  reviews: ExperienceReview[];
  stats: ExperienceReviewStats;
  pagination: {
    cursor: string | null;
    hasMore: boolean;
  };
}

// TransferState key factory for experience data (uses slug as unique key)
const makeExperienceKey = (slug: string) => makeStateKey<ExperienceDetail>(`experience-${slug}`);

@Injectable({ providedIn: 'root' })
export class ExperienceService {
  private readonly http = inject(HttpClient);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = `${environment.apiUrl}/experiences`;

  // Signals for reactive state
  private readonly _experience = signal<ExperienceDetail | null>(null);
  private readonly _upcomingEvents = signal<ExperienceEvent[]>([]);
  private readonly _featuredExperiences = signal<FeaturedExperience[]>([]);
  private readonly _featuredLoading = signal(false);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // List state signals
  private readonly _experiences = signal<ExperienceListItem[]>([]);
  private readonly _listLoading = signal(false);
  private readonly _pagination = signal({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Reviews state signals
  private readonly _reviews = signal<ExperienceReview[]>([]);
  private readonly _reviewsLoading = signal(false);
  private readonly _reviewStats = signal<ExperienceReviewStats>({
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  private readonly _reviewsPagination = signal<{ cursor: string | null; hasMore: boolean }>({
    cursor: null,
    hasMore: false,
  });

  // Public readonly signals
  readonly experience = this._experience.asReadonly();
  readonly upcomingEvents = this._upcomingEvents.asReadonly();
  readonly featuredExperiences = this._featuredExperiences.asReadonly();
  readonly featuredLoading = this._featuredLoading.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // List readonly signals
  readonly experiences = this._experiences.asReadonly();
  readonly listLoading = this._listLoading.asReadonly();
  readonly pagination = this._pagination.asReadonly();
  readonly hasExperiences = computed(() => this._experiences().length > 0);

  // Reviews readonly signals
  readonly reviews = this._reviews.asReadonly();
  readonly reviewsLoading = this._reviewsLoading.asReadonly();
  readonly reviewStats = this._reviewStats.asReadonly();
  readonly reviewsPagination = this._reviewsPagination.asReadonly();
  readonly hasReviews = computed(() => this._reviews().length > 0);

  // Computed values for template convenience
  readonly hasExperience = computed(() => !!this._experience());
  readonly isPhysical = computed(
    () => this._experience()?.experienceType === 'Physical'
  );
  readonly isVirtual = computed(
    () => this._experience()?.experienceType === 'Virtual'
  );
  readonly hasLocation = computed(
    () => !!this._experience()?.location?.city
  );
  readonly hasUpcomingEvents = computed(
    () => this._upcomingEvents().length > 0
  );
  readonly lowestPrice = computed(() => {
    const tickets = this._experience()?.ticket || [];
    if (tickets.length === 0) return null;
    const prices = tickets.map((t) => t.ticketPrice);
    return Math.min(...prices);
  });
  readonly ticketCount = computed(
    () => this._experience()?.ticket?.length || 0
  );
  readonly hasFeaturedExperiences = computed(
    () => this._featuredExperiences().length > 0
  );

  /**
   * Fetch experience detail by slug
   * Uses TransferState to transfer server-fetched data to the client,
   * preventing duplicate API calls during hydration.
   */
  getExperienceBySlug(slug: string): Observable<ExperienceDetail | null> {
    const stateKey = makeExperienceKey(slug);

    // If same slug already loaded, return cached as Observable
    const currentExp = this._experience();
    if (currentExp?.slug === slug) {
      return of(currentExp);
    }

    // On browser, check if data was transferred from server
    if (isPlatformBrowser(this.platformId)) {
      const transferredData = this.transferState.get(stateKey, null);
      if (transferredData) {
        // Remove the key so it's not used again on navigation
        this.transferState.remove(stateKey);
        this._experience.set(transferredData);
        this._upcomingEvents.set(transferredData.upcomingEvents || []);
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
      .get<ApiResponse<ExperienceDetail>>(`${this.apiUrl}/${slug}`)
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            this._error.set(response.error?.message || 'Experience not found');
            this._experience.set(null);
            return null;
          }
          return response.data;
        }),
        tap((data) => {
          if (data) {
            this._experience.set(data);
            this._upcomingEvents.set(data.upcomingEvents || []);

            // On server, store data in TransferState for client
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(stateKey, data);
            }
          }
          this._loading.set(false);
        }),
        catchError((err) => {
          console.error('Error fetching experience:', err);
          this._error.set('Failed to load experience');
          this._experience.set(null);
          this._loading.set(false);
          return of(null);
        })
      );
  }

  /**
   * Fetch experience list with filters
   */
  getExperiences(filters: ExperienceFilters = {}): Observable<ExperienceListItem[]> {
    this._listLoading.set(true);

    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.search) params = params.set('search', filters.search);

    return this.http
      .get<{ success: boolean; data: ExperienceListItem[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
        this.apiUrl,
        { params }
      )
      .pipe(
        tap((response) => {
          if (response.success && response.data) {
            this._experiences.set(response.data);
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
          console.error('Error fetching experiences:', err);
          this._listLoading.set(false);
          return of([]);
        })
      );
  }

  /**
   * Fetch more upcoming events for an experience (pagination)
   */
  async loadMoreEvents(
    slug: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ExperienceEvent[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<PaginatedResponse<ExperienceEvent>>(
          `${this.apiUrl}/${slug}/events`,
          { params: { page, limit } }
        )
      );

      if (!response.success || !response.data) {
        return [];
      }

      // If page 1, replace events; otherwise append
      if (page === 1) {
        this._upcomingEvents.set(response.data);
      } else {
        this._upcomingEvents.update((current) => [...current, ...response.data!]);
      }

      return response.data;
    } catch (err) {
      console.error('Error loading more events:', err);
      return [];
    }
  }

  /**
   * Fetch featured experiences from same hub (lazy load)
   * Call this after initial page load for better performance
   */
  async getFeaturedExperiences(slug: string, limit: number = 4): Promise<FeaturedExperience[]> {
    this._featuredLoading.set(true);

    try {
      const response = await firstValueFrom(
        this.http
          .get<ApiResponse<FeaturedExperience[]>>(`${this.apiUrl}/${slug}/featured`, {
            params: { limit },
          })
          .pipe(
            catchError((err) => {
              console.error('Error fetching featured experiences:', err);
              return of({
                success: false,
                error: { code: 'FETCH_ERROR', message: 'Failed to fetch featured experiences' },
              } as ApiResponse<FeaturedExperience[]>);
            })
          )
      );

      if (!response.success || !response.data) {
        this._featuredExperiences.set([]);
        return [];
      }

      this._featuredExperiences.set(response.data);
      return response.data;
    } catch (err) {
      console.error('Error in getFeaturedExperiences:', err);
      this._featuredExperiences.set([]);
      return [];
    } finally {
      this._featuredLoading.set(false);
    }
  }

  /**
   * Clear current experience state
   */
  clearExperience(): void {
    this._experience.set(null);
    this._upcomingEvents.set([]);
    this._featuredExperiences.set([]);
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
   * Fetch experience reviews
   * @param experienceId - The experience's ObjectId (not slug)
   */
  async getExperienceReviews(
    experienceId: string,
    options: { limit?: number; cursor?: string; rating?: number } = {}
  ): Promise<ExperienceReviewsResult | null> {
    this._reviewsLoading.set(true);

    try {
      let params = new HttpParams();
      if (options.limit) params = params.set('limit', options.limit.toString());
      if (options.cursor) params = params.set('cursor', options.cursor);
      if (options.rating) params = params.set('rating', options.rating.toString());

      const response = await firstValueFrom(
        this.http
          .get<ApiResponse<ExperienceReviewsResult>>(
            `${environment.apiUrl}/experiences/${experienceId}/reviews`,
            { params }
          )
          .pipe(
            catchError((err) => {
              console.error('Error fetching experience reviews:', err);
              return of({
                success: false,
                error: { code: 'FETCH_ERROR', message: 'Failed to fetch reviews' },
              } as ApiResponse<ExperienceReviewsResult>);
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
      console.error('Error in getExperienceReviews:', err);
      this._reviews.set([]);
      return null;
    } finally {
      this._reviewsLoading.set(false);
    }
  }

  /**
   * Format duration from milliseconds to human readable
   */
  formatDuration(ms: number | undefined): string {
    if (!ms) return '';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);

    if (hours > 0 && minutes > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} min`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${minutes} min`;
    }
  }

  /**
   * Get location text (city, state, country)
   */
  getLocationText(): string {
    const location = this._experience()?.location;
    if (!location) return '';

    const parts = [location.city, location.state, location.country].filter(
      Boolean
    );
    return parts.join(', ');
  }

  /**
   * Fetch experience slots with ticket availability for booking widget
   * This is called on client-side only (not SSR) to get real-time availability
   */
  async getExperienceSlots(slug: string, limit: number = 100): Promise<ExperienceSlotsResponse | null> {
    try {
      const response = await firstValueFrom(
        this.http
          .get<ApiResponse<ExperienceSlotsResponse>>(`${this.apiUrl}/${slug}/slots`, {
            params: { limit },
          })
          .pipe(
            catchError((err) => {
              console.error('Error fetching experience slots:', err);
              return of({
                success: false,
                error: { code: 'FETCH_ERROR', message: 'Failed to fetch slots' },
              } as ApiResponse<ExperienceSlotsResponse>);
            })
          )
      );

      if (!response.success || !response.data) {
        return null;
      }

      return response.data;
    } catch (err) {
      console.error('Error in getExperienceSlots:', err);
      return null;
    }
  }
}
