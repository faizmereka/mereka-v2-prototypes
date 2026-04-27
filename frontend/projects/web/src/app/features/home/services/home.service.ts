import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TransferState, makeStateKey } from '@angular/core';
import { Observable, of, tap, map, catchError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  HomeData,
  HomeExpertiseItem,
  HomeExperienceItem,
  HomeReviewItem,
  ApiResponse,
} from '../models/home.model';

// TransferState keys
const HOME_DATA_KEY = makeStateKey<HomeData>('homeData');
const HOME_REVIEWS_KEY = makeStateKey<HomeReviewItem[]>('homeReviews');

@Injectable({ providedIn: 'root' })
export class HomeService {
  private readonly http = inject(HttpClient);
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = `${environment.apiUrl}/home`;

  // Signals for reactive state
  private readonly _expertises = signal<HomeExpertiseItem[]>([]);
  private readonly _experiences = signal<HomeExperienceItem[]>([]);
  private readonly _reviews = signal<HomeReviewItem[]>([]);
  private readonly _loading = signal(false);
  private readonly _reviewsLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _initialized = signal(false);

  // Public readonly signals
  readonly expertises = this._expertises.asReadonly();
  readonly experiences = this._experiences.asReadonly();
  readonly reviews = this._reviews.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly reviewsLoading = this._reviewsLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed values for template convenience
  readonly hasExpertises = computed(() => this._expertises().length > 0);
  readonly hasExperiences = computed(() => this._experiences().length > 0);
  readonly hasReviews = computed(() => this._reviews().length > 0);
  readonly hasData = computed(() => this.hasExpertises() || this.hasExperiences());

  /**
   * Fetch home page data (expertises + experiences)
   * Uses TransferState to transfer server-fetched data to the client,
   * preventing duplicate API calls during hydration.
   */
  getHomeData(): Observable<HomeData | null> {
    // If already initialized with data, return cached data
    if (this._initialized() && this.hasData()) {
      return of({
        expertises: this._expertises(),
        experiences: this._experiences(),
      });
    }

    // On browser, check if data was transferred from server
    if (isPlatformBrowser(this.platformId)) {
      const transferredData = this.transferState.get(HOME_DATA_KEY, null);
      if (transferredData) {
        // Remove the key so it's not used again on navigation
        this.transferState.remove(HOME_DATA_KEY);
        this._expertises.set(transferredData.expertises || []);
        this._experiences.set(transferredData.experiences || []);
        this._initialized.set(true);
        return of(transferredData);
      }
    }

    // Prevent duplicate calls while loading
    if (this._loading()) {
      return of(null);
    }

    this._loading.set(true);
    this._error.set(null);

    return this.http.get<ApiResponse<HomeData>>(this.apiUrl).pipe(
      map((response) => {
        if (!response.success || !response.data) {
          this._error.set(response.error?.message || 'Failed to load home data');
          this._expertises.set([]);
          this._experiences.set([]);
          return null;
        }
        return response.data;
      }),
      tap((data) => {
        if (data) {
          this._expertises.set(data.expertises || []);
          this._experiences.set(data.experiences || []);
          this._initialized.set(true);

          // On server, store data in TransferState for client
          if (isPlatformServer(this.platformId)) {
            this.transferState.set(HOME_DATA_KEY, data);
          }
        }
        this._loading.set(false);
      }),
      catchError((err) => {
        console.error('Error fetching home data:', err);
        this._error.set('Failed to load home data');
        this._expertises.set([]);
        this._experiences.set([]);
        this._loading.set(false);
        return of(null);
      })
    );
  }

  /**
   * Fetch featured reviews for home page
   * Uses TransferState to transfer server-fetched data to the client
   */
  getReviews(): Observable<HomeReviewItem[]> {
    // On browser, check if data was transferred from server
    if (isPlatformBrowser(this.platformId)) {
      const transferredData = this.transferState.get(HOME_REVIEWS_KEY, null);
      if (transferredData) {
        this.transferState.remove(HOME_REVIEWS_KEY);
        this._reviews.set(transferredData);
        return of(transferredData);
      }
    }

    // Return cached reviews if already loaded
    if (this._reviews().length > 0) {
      return of(this._reviews());
    }

    this._reviewsLoading.set(true);

    return this.http.get<ApiResponse<HomeReviewItem[]>>(`${this.apiUrl}/reviews`).pipe(
      map((response) => {
        if (!response.success || !response.data) {
          return [];
        }
        return response.data;
      }),
      tap((reviews) => {
        this._reviews.set(reviews);
        this._reviewsLoading.set(false);

        // On server, store data in TransferState for client
        if (isPlatformServer(this.platformId)) {
          this.transferState.set(HOME_REVIEWS_KEY, reviews);
        }
      }),
      catchError((err) => {
        console.error('Error fetching home reviews:', err);
        this._reviews.set([]);
        this._reviewsLoading.set(false);
        return of([]);
      })
    );
  }

  /**
   * Get lowest price from expertise tickets
   */
  getLowestExpertisePrice(expertise: HomeExpertiseItem): number | null {
    const tickets = expertise.ticket || [];
    if (tickets.length === 0) return null;
    const prices = tickets.map((t) => t.standardRate);
    return Math.min(...prices);
  }

  /**
   * Get lowest price from experience tickets
   */
  getLowestExperiencePrice(experience: HomeExperienceItem): number | null {
    const tickets = experience.ticket || [];
    if (tickets.length === 0) return null;
    const prices = tickets.map((t) => t.ticketPrice);
    return Math.min(...prices);
  }

  /**
   * Check if expertise has a free ticket
   */
  hasFreeTier(item: HomeExpertiseItem | HomeExperienceItem): boolean {
    const tickets = item.ticket || [];
    return tickets.some((t) => t.ticketType === 'Free');
  }

  /**
   * Get location text (city, country)
   */
  getLocationText(location?: { city?: string; country?: string }): string {
    if (!location) return '';
    const parts = [location.city, location.country].filter(Boolean);
    return parts.join(', ');
  }

  /**
   * Clear home data state
   */
  clearHomeData(): void {
    this._expertises.set([]);
    this._experiences.set([]);
    this._reviews.set([]);
    this._error.set(null);
    this._loading.set(false);
    this._reviewsLoading.set(false);
  }
}
