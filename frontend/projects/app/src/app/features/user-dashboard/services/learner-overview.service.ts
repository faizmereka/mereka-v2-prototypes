import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

// ============================================================================
// Types
// ============================================================================

export interface OverviewStats {
  upcomingBookings: number;
  completedSessions: number;
  totalSpent: number;
  reviewsGiven: number;
}

export interface UpcomingBooking {
  id: string;
  serviceName: string;
  serviceSlug?: string;
  hubName: string;
  hubSlug?: string;
  date: string;
  time: string;
  locationType: 'Online' | 'Physical';
  location: string;
}

export interface OverviewUser {
  name: string;
  firstName: string;
  emailVerified: boolean;
  profileComplete: boolean;
}

export interface LearnerOverviewData {
  user: OverviewUser;
  stats: OverviewStats;
  upcomingBookings: UpcomingBooking[];
  currency: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Cache Configuration
// ============================================================================

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Learner Overview Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class LearnerOverviewService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/me/overview`;

  // Cache
  private cachedData: LearnerOverviewData | null = null;
  private cacheTimestamp = 0;

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _data = signal<LearnerOverviewData | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly data = this._data.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // ============================================================================
  // Computed Signals
  // ============================================================================

  readonly user = computed(() => this._data()?.user ?? null);
  readonly stats = computed(() => this._data()?.stats ?? null);
  readonly upcomingBookings = computed(() => this._data()?.upcomingBookings ?? []);
  readonly currency = computed(() => this._data()?.currency ?? 'RM');
  readonly hasData = computed(() => this._data() !== null);

  // Stat cards for display
  readonly statCards = computed(() => {
    const stats = this.stats();
    const currency = this.currency();
    if (!stats) return [];

    return [
      {
        label: 'Upcoming Bookings',
        value: stats.upcomingBookings,
        icon: 'calendar' as const,
      },
      {
        label: 'Completed Sessions',
        value: stats.completedSessions,
        icon: 'check' as const,
      },
      {
        label: 'Total Spent',
        value: `${currency} ${stats.totalSpent.toLocaleString()}`,
        icon: 'dollar' as const,
      },
      {
        label: 'Reviews Given',
        value: stats.reviewsGiven,
        icon: 'star' as const,
      },
    ];
  });

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Load overview data with caching
   * @param forceRefresh - If true, bypasses cache and fetches fresh data
   */
  async loadOverview(forceRefresh = false): Promise<void> {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && this.isCacheValid()) {
      this._data.set(this.cachedData);
      return;
    }

    if (this._loading()) {
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<LearnerOverviewData>>(this.apiUrl, {
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        this._data.set(response.data);
        this.updateCache(response.data);
      } else {
        this._error.set(response.error?.message ?? 'Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Failed to fetch overview:', error);
      this._error.set('Failed to load dashboard data');
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Refresh overview data (bypasses cache)
   */
  async refresh(): Promise<void> {
    await this.loadOverview(true);
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.cachedData = null;
    this.cacheTimestamp = 0;
    this._data.set(null);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private isCacheValid(): boolean {
    if (!this.cachedData) {
      return false;
    }
    return Date.now() - this.cacheTimestamp < CACHE_DURATION_MS;
  }

  private updateCache(data: LearnerOverviewData): void {
    this.cachedData = data;
    this.cacheTimestamp = Date.now();
  }
}
