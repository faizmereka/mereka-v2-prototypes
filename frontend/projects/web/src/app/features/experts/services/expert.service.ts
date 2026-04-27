import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TransferState, makeStateKey } from '@angular/core';
import { Observable, firstValueFrom, catchError, of, tap, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  ExpertDetail,
  ExpertListItem,
  ExpertListResult,
  ExpertReviewItem,
  ExpertReviewsResult,
  ExpertServiceItem,
  ExpertFilters,
  ApiResponse,
  PaginatedResponse,
} from '../models';

// TransferState key factory
const makeExpertKey = (slug: string) => makeStateKey<ExpertDetail>(`expert-${slug}`);
const makeExpertsListKey = (filters: string) =>
  makeStateKey<ExpertListResult>(`experts-list-${filters}`);
const makeExpertNotFoundKey = (slug: string) => makeStateKey<boolean>(`expert-notfound-${slug}`);

/**
 * Expert Service - API Integration with SSR Support
 * Uses TransferState to transfer server-fetched data to the client
 */
@Injectable({ providedIn: 'root' })
export class ExpertService {
  private readonly http = inject(HttpClient);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = `${environment.apiUrl}/experts`;

  // State signals for detail
  private readonly _expert = signal<ExpertDetail | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // State signals for list
  private readonly _experts = signal<ExpertListItem[]>([]);
  private readonly _listLoading = signal(false);
  private readonly _pagination = signal({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  // State for services
  private readonly _services = signal<ExpertServiceItem[]>([]);
  private readonly _servicesLoading = signal(false);

  // State for reviews
  private readonly _reviews = signal<ExpertReviewItem[]>([]);
  private readonly _reviewsLoading = signal(false);
  private readonly _reviewStats = signal<{
    averageRating: number;
    totalReviews: number;
    distribution: { [key: number]: number };
  }>({ averageRating: 0, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  private readonly _reviewsPagination = signal({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  // Track if 404 was due to SSR (no auth) - client can retry with auth
  private readonly _notFoundDuringSsr = signal(false);
  private _currentSlug: string | null = null;

  // Public readonly signals - Detail
  readonly expert = this._expert.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly notFoundDuringSsr = this._notFoundDuringSsr.asReadonly();

  // Public readonly signals - List
  readonly experts = this._experts.asReadonly();
  readonly listLoading = this._listLoading.asReadonly();
  readonly pagination = this._pagination.asReadonly();

  // Public readonly signals - Services
  readonly services = this._services.asReadonly();
  readonly servicesLoading = this._servicesLoading.asReadonly();

  // Public readonly signals - Reviews
  readonly reviews = this._reviews.asReadonly();
  readonly reviewsLoading = this._reviewsLoading.asReadonly();
  readonly reviewStats = this._reviewStats.asReadonly();
  readonly reviewsPagination = this._reviewsPagination.asReadonly();

  // Computed values
  readonly hasExpert = computed(() => !!this._expert());
  readonly hasExperts = computed(() => this._experts().length > 0);
  readonly hasServices = computed(() => this._services().length > 0);
  readonly hasReviews = computed(() => this._reviews().length > 0);

  // Computed: Expert location text
  readonly locationText = computed(() => {
    const expert = this._expert();
    if (!expert?.location) return '';
    const parts = [expert.location.city, expert.location.country].filter(Boolean);
    return parts.join(', ');
  });

  // Computed: Expert languages text
  readonly languagesText = computed(() => {
    const expert = this._expert();
    if (!expert?.languages?.length) return '';
    return expert.languages.map((l) => l.language.name).join(', ');
  });

  /**
   * Fetch expert list with filters
   */
  getExperts(filters: ExpertFilters = {}): Observable<ExpertListResult | null> {
    const filterKey = JSON.stringify(filters);
    const stateKey = makeExpertsListKey(filterKey);

    // On browser, check if data was transferred from server
    if (isPlatformBrowser(this.platformId)) {
      const transferredData = this.transferState.get(stateKey, null);
      if (transferredData) {
        this.transferState.remove(stateKey);
        this._experts.set(transferredData.experts);
        this._pagination.set({
          total: transferredData.total,
          page: transferredData.page,
          limit: transferredData.limit,
          totalPages: transferredData.totalPages,
        });
        return of(transferredData);
      }
    }

    if (this._listLoading()) {
      return of(null);
    }

    this._listLoading.set(true);
    this._error.set(null);

    // Build params
    let params = new HttpParams();
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.focusArea) params = params.set('focusArea', filters.focusArea);
    if (filters.skill) params = params.set('skill', filters.skill);
    if (filters.city) params = params.set('city', filters.city);
    if (filters.country) params = params.set('country', filters.country);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.hubId) params = params.set('hubId', filters.hubId);

    return this.http
      .get<ApiResponse<ExpertListResult>>(this.apiUrl, { params })
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            this._error.set(response.error?.message || 'Failed to load experts');
            return null;
          }
          return response.data;
        }),
        tap((data) => {
          if (data) {
            this._experts.set(data.experts);
            this._pagination.set({
              total: data.total,
              page: data.page,
              limit: data.limit,
              totalPages: data.totalPages,
            });

            // On server, store data in TransferState for client
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(stateKey, data);
            }
          }
          this._listLoading.set(false);
        }),
        catchError((err) => {
          console.error('Error fetching experts:', err);
          this._error.set('Failed to load experts');
          this._listLoading.set(false);
          return of(null);
        })
      );
  }

  /**
   * Fetch expert detail by username/slug
   * Uses withCredentials to send auth cookies for owner access to incomplete profiles
   */
  getExpertBySlug(slug: string): Observable<ExpertDetail | null> {
    const stateKey = makeExpertKey(slug);
    const notFoundKey = makeExpertNotFoundKey(slug);
    this._currentSlug = slug;

    // If same slug already loaded and has data, return cached
    const currentExpert = this._expert();
    if (currentExpert?.username === slug) {
      return of(currentExpert);
    }

    // On browser, check if data was transferred from server
    if (isPlatformBrowser(this.platformId)) {
      const transferredData = this.transferState.get(stateKey, null);
      if (transferredData) {
        this.transferState.remove(stateKey);
        this._expert.set(transferredData);
        this._notFoundDuringSsr.set(false);
        return of(transferredData);
      }

      // Check if SSR returned 404 - client should retry with auth
      const wasNotFound = this.transferState.get(notFoundKey, false);
      if (wasNotFound) {
        this.transferState.remove(notFoundKey);
        this._notFoundDuringSsr.set(true);
        // Don't return cached 404 - let it fall through to fetch with auth
      }
    }

    if (this._loading()) {
      return of(null);
    }

    this._loading.set(true);
    this._error.set(null);

    return this.http
      .get<ApiResponse<ExpertDetail>>(`${this.apiUrl}/${slug}`, { withCredentials: true })
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            this._error.set(response.error?.message || 'Expert not found');
            this._expert.set(null);

            // On server, mark as not found so client can retry with auth
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(notFoundKey, true);
            }
            return null;
          }
          return response.data;
        }),
        tap((data) => {
          if (data) {
            this._expert.set(data);
            this._notFoundDuringSsr.set(false);

            // On server, store data in TransferState for client
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(stateKey, data);
            }
          }
          this._loading.set(false);
        }),
        catchError((err) => {
          console.error('Error fetching expert:', err);
          this._error.set('Failed to load expert');
          this._expert.set(null);
          this._loading.set(false);

          // On server 404, mark for client retry
          if (isPlatformServer(this.platformId) && err.status === 404) {
            this.transferState.set(notFoundKey, true);
          }
          return of(null);
        })
      );
  }

  /**
   * Retry fetching expert with authentication (called from client after SSR 404)
   */
  retryWithAuth(slug: string): Observable<ExpertDetail | null> {
    if (isPlatformServer(this.platformId)) {
      return of(null); // Only works on client
    }

    this._loading.set(true);
    this._error.set(null);
    this._notFoundDuringSsr.set(false);

    return this.http
      .get<ApiResponse<ExpertDetail>>(`${this.apiUrl}/${slug}`, { withCredentials: true })
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            this._error.set(response.error?.message || 'Expert not found');
            this._expert.set(null);
            return null;
          }
          return response.data;
        }),
        tap((data) => {
          if (data) {
            this._expert.set(data);
          }
          this._loading.set(false);
        }),
        catchError((err) => {
          console.error('Error fetching expert with auth:', err);
          this._error.set('Failed to load expert');
          this._expert.set(null);
          this._loading.set(false);
          return of(null);
        })
      );
  }

  /**
   * Fetch expert services (expertises & experiences)
   */
  async getExpertServices(
    slug: string,
    options: { limit?: number; type?: 'expertise' | 'experience' | 'all' } = {}
  ): Promise<ExpertServiceItem[]> {
    this._servicesLoading.set(true);

    try {
      let params = new HttpParams();
      if (options.limit) params = params.set('limit', options.limit.toString());
      if (options.type) params = params.set('type', options.type);

      const response = await firstValueFrom(
        this.http
          .get<ApiResponse<{ services: ExpertServiceItem[] }>>(
            `${this.apiUrl}/${slug}/services`,
            { params }
          )
          .pipe(
            catchError((err) => {
              console.error('Error fetching expert services:', err);
              return of({
                success: false,
                error: { code: 'FETCH_ERROR', message: 'Failed to fetch services' },
              } as ApiResponse<{ services: ExpertServiceItem[] }>);
            })
          )
      );

      if (!response.success || !response.data) {
        this._services.set([]);
        return [];
      }

      this._services.set(response.data.services);
      return response.data.services;
    } catch (err) {
      console.error('Error in getExpertServices:', err);
      this._services.set([]);
      return [];
    } finally {
      this._servicesLoading.set(false);
    }
  }

  /**
   * Fetch expert reviews
   */
  async getExpertReviews(
    slug: string,
    options: { page?: number; limit?: number; rating?: number } = {}
  ): Promise<ExpertReviewsResult | null> {
    this._reviewsLoading.set(true);

    try {
      let params = new HttpParams();
      if (options.page) params = params.set('page', options.page.toString());
      if (options.limit) params = params.set('limit', options.limit.toString());
      if (options.rating) params = params.set('rating', options.rating.toString());

      const response = await firstValueFrom(
        this.http
          .get<ApiResponse<ExpertReviewsResult>>(
            `${this.apiUrl}/${slug}/reviews`,
            { params }
          )
          .pipe(
            catchError((err) => {
              console.error('Error fetching expert reviews:', err);
              return of({
                success: false,
                error: { code: 'FETCH_ERROR', message: 'Failed to fetch reviews' },
              } as ApiResponse<ExpertReviewsResult>);
            })
          )
      );

      if (!response.success || !response.data) {
        this._reviews.set([]);
        this._reviewStats.set({ averageRating: 0, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
        return null;
      }

      this._reviews.set(response.data.reviews);
      this._reviewStats.set(response.data.stats);
      this._reviewsPagination.set({
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        totalPages: response.data.totalPages,
      });
      return response.data;
    } catch (err) {
      console.error('Error in getExpertReviews:', err);
      this._reviews.set([]);
      return null;
    } finally {
      this._reviewsLoading.set(false);
    }
  }

  // Clear state
  clear(): void {
    this._expert.set(null);
    this._experts.set([]);
    this._services.set([]);
    this._reviews.set([]);
    this._reviewStats.set({ averageRating: 0, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
    this._error.set(null);
    this._loading.set(false);
    this._listLoading.set(false);
    this._servicesLoading.set(false);
    this._reviewsLoading.set(false);
  }

  // Clear only detail state
  clearDetail(): void {
    this._expert.set(null);
    this._services.set([]);
    this._reviews.set([]);
    this._reviewStats.set({ averageRating: 0, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
    this._error.set(null);
    this._loading.set(false);
    this._servicesLoading.set(false);
    this._reviewsLoading.set(false);
    this._notFoundDuringSsr.set(false);
    this._currentSlug = null;
  }

  // Get current slug being fetched
  getCurrentSlug(): string | null {
    return this._currentSlug;
  }
}
