import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TransferState, makeStateKey } from '@angular/core';
import { Observable, firstValueFrom, catchError, of, tap, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  HubDetail,
  HubListItem,
  HubListResult,
  HubExpertItem,
  HubServiceItem,
  HubFilters,
  ApiResponse,
} from '../models';

export interface HubReview {
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
  reply?: {
    content: string;
    createdAt: string;
  };
}

// TransferState key factory
const makeHubKey = (slug: string) => makeStateKey<HubDetail>(`hub-${slug}`);
const makeHubsListKey = (filters: string) =>
  makeStateKey<HubListResult>(`hubs-list-${filters}`);
const makeHubNotFoundKey = (slug: string) => makeStateKey<boolean>(`hub-notfound-${slug}`);

/**
 * Hub Service - API Integration with SSR Support
 * Uses TransferState to transfer server-fetched data to the client
 */
@Injectable({ providedIn: 'root' })
export class HubService {
  private readonly http = inject(HttpClient);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = `${environment.apiUrl}/hubs`;

  // State signals for detail
  private readonly _hub = signal<HubDetail | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // State signals for list
  private readonly _hubs = signal<HubListItem[]>([]);
  private readonly _listLoading = signal(false);
  private readonly _pagination = signal({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });

  // State for experts
  private readonly _experts = signal<HubExpertItem[]>([]);
  private readonly _expertsLoading = signal(false);

  // State for services
  private readonly _services = signal<HubServiceItem[]>([]);
  private readonly _servicesLoading = signal(false);

  // State for reviews
  private readonly _reviews = signal<HubReview[]>([]);
  private readonly _reviewsLoading = signal(false);

  // Track if 404 was due to SSR (no auth) - client can retry with auth
  private readonly _notFoundDuringSsr = signal(false);
  private _currentSlug: string | null = null;

  // Public readonly signals - Detail
  readonly hub = this._hub.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly notFoundDuringSsr = this._notFoundDuringSsr.asReadonly();

  // Public readonly signals - List
  readonly hubs = this._hubs.asReadonly();
  readonly listLoading = this._listLoading.asReadonly();
  readonly pagination = this._pagination.asReadonly();

  // Public readonly signals - Experts
  readonly experts = this._experts.asReadonly();
  readonly expertsLoading = this._expertsLoading.asReadonly();

  // Public readonly signals - Services
  readonly services = this._services.asReadonly();
  readonly servicesLoading = this._servicesLoading.asReadonly();

  // Public readonly signals - Reviews
  readonly reviews = this._reviews.asReadonly();
  readonly reviewsLoading = this._reviewsLoading.asReadonly();

  // Computed values
  readonly hasHub = computed(() => !!this._hub());
  readonly hasHubs = computed(() => this._hubs().length > 0);
  readonly hasExperts = computed(() => this._experts().length > 0);
  readonly hasServices = computed(() => this._services().length > 0);

  // Computed: Hub location text
  readonly locationText = computed(() => {
    const hub = this._hub();
    if (!hub?.location) return '';
    const parts = [hub.location.city, hub.location.country].filter(Boolean);
    return parts.join(', ');
  });

  // Computed: Full address text
  readonly fullAddressText = computed(() => {
    const hub = this._hub();
    if (!hub?.location) return '';
    if (!hub.displayFullAddress) return this.locationText();
    const parts = [
      hub.location.address,
      hub.location.city,
      hub.location.state,
      hub.location.postcode,
      hub.location.country,
    ].filter(Boolean);
    return parts.join(', ');
  });

  /**
   * Fetch hub list with filters
   */
  getHubs(filters: HubFilters = {}): Observable<HubListResult | null> {
    const filterKey = JSON.stringify(filters);
    const stateKey = makeHubsListKey(filterKey);

    // On browser, check if data was transferred from server
    if (isPlatformBrowser(this.platformId)) {
      const transferredData = this.transferState.get(stateKey, null);
      if (transferredData) {
        this.transferState.remove(stateKey);
        this._hubs.set(transferredData.hubs);
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
    if (filters.companyType) params = params.set('companyType', filters.companyType);
    if (filters.city) params = params.set('city', filters.city);
    if (filters.country) params = params.set('country', filters.country);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.featured !== undefined) params = params.set('featured', filters.featured.toString());

    return this.http
      .get<ApiResponse<HubListResult>>(this.apiUrl, { params })
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            this._error.set(response.error?.message || 'Failed to load hubs');
            return null;
          }
          return response.data;
        }),
        tap((data) => {
          if (data) {
            this._hubs.set(data.hubs);
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
          console.error('Error fetching hubs:', err);
          this._error.set('Failed to load hubs');
          this._listLoading.set(false);
          return of(null);
        })
      );
  }

  /**
   * Fetch hub detail by slug
   * Uses withCredentials to send auth cookies for owner access to draft hubs
   */
  getHubBySlug(slug: string): Observable<HubDetail | null> {
    const stateKey = makeHubKey(slug);
    const notFoundKey = makeHubNotFoundKey(slug);
    this._currentSlug = slug;

    // If same slug already loaded and has data, return cached
    const currentHub = this._hub();
    if (currentHub?.slug === slug) {
      return of(currentHub);
    }

    // On browser, check if data was transferred from server
    if (isPlatformBrowser(this.platformId)) {
      const transferredData = this.transferState.get(stateKey, null);
      if (transferredData) {
        this.transferState.remove(stateKey);
        this._hub.set(transferredData);
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
      .get<ApiResponse<HubDetail>>(`${this.apiUrl}/${slug}`, { withCredentials: true })
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            this._error.set(response.error?.message || 'Hub not found');
            this._hub.set(null);

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
            this._hub.set(data);
            this._notFoundDuringSsr.set(false);

            // On server, store data in TransferState for client
            if (isPlatformServer(this.platformId)) {
              this.transferState.set(stateKey, data);
            }
          }
          this._loading.set(false);
        }),
        catchError((err) => {
          console.error('Error fetching hub:', err);
          this._error.set('Failed to load hub');
          this._hub.set(null);
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
   * Retry fetching hub with authentication (called from client after SSR 404)
   */
  retryWithAuth(slug: string): Observable<HubDetail | null> {
    if (isPlatformServer(this.platformId)) {
      return of(null); // Only works on client
    }

    this._loading.set(true);
    this._error.set(null);
    this._notFoundDuringSsr.set(false);

    return this.http
      .get<ApiResponse<HubDetail>>(`${this.apiUrl}/${slug}`, { withCredentials: true })
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            this._error.set(response.error?.message || 'Hub not found');
            this._hub.set(null);
            return null;
          }
          return response.data;
        }),
        tap((data) => {
          if (data) {
            this._hub.set(data);
          }
          this._loading.set(false);
        }),
        catchError((err) => {
          console.error('Error fetching hub with auth:', err);
          this._error.set('Failed to load hub');
          this._hub.set(null);
          this._loading.set(false);
          return of(null);
        })
      );
  }

  /**
   * Fetch hub experts
   */
  async getHubExperts(slug: string, limit: number = 10): Promise<HubExpertItem[]> {
    this._expertsLoading.set(true);

    try {
      const params = new HttpParams().set('limit', limit.toString());

      const response = await firstValueFrom(
        this.http
          .get<ApiResponse<{ experts: HubExpertItem[] }>>(
            `${this.apiUrl}/${slug}/experts`,
            { params }
          )
          .pipe(
            catchError((err) => {
              console.error('Error fetching hub experts:', err);
              return of({
                success: false,
                error: { code: 'FETCH_ERROR', message: 'Failed to fetch experts' },
              } as ApiResponse<{ experts: HubExpertItem[] }>);
            })
          )
      );

      if (!response.success || !response.data) {
        this._experts.set([]);
        return [];
      }

      this._experts.set(response.data.experts);
      return response.data.experts;
    } catch (err) {
      console.error('Error in getHubExperts:', err);
      this._experts.set([]);
      return [];
    } finally {
      this._expertsLoading.set(false);
    }
  }

  /**
   * Fetch hub services (expertises & experiences)
   */
  async getHubServices(
    slug: string,
    options: { limit?: number; type?: 'expertise' | 'experience' | 'all' } = {}
  ): Promise<HubServiceItem[]> {
    this._servicesLoading.set(true);

    try {
      let params = new HttpParams();
      if (options.limit) params = params.set('limit', options.limit.toString());
      if (options.type) params = params.set('type', options.type);

      const response = await firstValueFrom(
        this.http
          .get<ApiResponse<{ services: HubServiceItem[] }>>(
            `${this.apiUrl}/${slug}/services`,
            { params }
          )
          .pipe(
            catchError((err) => {
              console.error('Error fetching hub services:', err);
              return of({
                success: false,
                error: { code: 'FETCH_ERROR', message: 'Failed to fetch services' },
              } as ApiResponse<{ services: HubServiceItem[] }>);
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
      console.error('Error in getHubServices:', err);
      this._services.set([]);
      return [];
    } finally {
      this._servicesLoading.set(false);
    }
  }

  /**
   * Fetch hub reviews
   * @param hubId - The hub's ObjectId (not slug)
   */
  async getHubReviews(hubId: string, limit: number = 20): Promise<HubReview[]> {
    this._reviewsLoading.set(true);

    try {
      const params = new HttpParams().set('limit', limit.toString());

      const response = await firstValueFrom(
        this.http
          .get<ApiResponse<{ reviews: HubReview[] }>>(
            `${environment.apiUrl}/hubs/${hubId}/reviews`,
            { params }
          )
          .pipe(
            catchError((err) => {
              console.error('Error fetching hub reviews:', err);
              return of({
                success: false,
                error: { code: 'FETCH_ERROR', message: 'Failed to fetch reviews' },
              } as ApiResponse<{ reviews: HubReview[] }>);
            })
          )
      );

      if (!response.success || !response.data) {
        this._reviews.set([]);
        return [];
      }

      this._reviews.set(response.data.reviews);
      return response.data.reviews;
    } catch (err) {
      console.error('Error in getHubReviews:', err);
      this._reviews.set([]);
      return [];
    } finally {
      this._reviewsLoading.set(false);
    }
  }

  // Format operating hours for display
  formatOperatingHours(hours: HubDetail['operatingHours']): string[] {
    if (!hours) return [];

    const days = [
      { key: 'monday', label: 'Monday' },
      { key: 'tuesday', label: 'Tuesday' },
      { key: 'wednesday', label: 'Wednesday' },
      { key: 'thursday', label: 'Thursday' },
      { key: 'friday', label: 'Friday' },
      { key: 'saturday', label: 'Saturday' },
      { key: 'sunday', label: 'Sunday' },
    ];

    return days.map((day) => {
      const dayHours = hours[day.key as keyof typeof hours];
      if (!dayHours || dayHours.isClosed) {
        return `${day.label}: Closed`;
      }
      return `${day.label}: ${dayHours.open || '09:00'} - ${dayHours.close || '17:00'}`;
    });
  }

  // Clear state
  clear(): void {
    this._hub.set(null);
    this._hubs.set([]);
    this._experts.set([]);
    this._services.set([]);
    this._error.set(null);
    this._loading.set(false);
    this._listLoading.set(false);
    this._expertsLoading.set(false);
    this._servicesLoading.set(false);
  }

  // Clear only detail state
  clearDetail(): void {
    this._hub.set(null);
    this._experts.set([]);
    this._services.set([]);
    this._reviews.set([]);
    this._error.set(null);
    this._loading.set(false);
    this._expertsLoading.set(false);
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
