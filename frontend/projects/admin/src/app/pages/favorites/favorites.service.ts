import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

// ============================================================================
// Types
// ============================================================================

export type FavoriteableType = 'expert' | 'hub' | 'expertise' | 'experience';
export type PeriodFilter = '7d' | '30d' | '90d' | '12m';

export interface FavoriteOverviewStats {
  total: number;
  activeUsers: number;
  thisMonth: number;
  avgPerUser: number;
  trend: number;
  byType: {
    expert: number;
    hub: number;
    expertise: number;
    experience: number;
  };
  periodComparison: {
    previous: number;
    current: number;
    change: number;
  };
}

export interface TopFavoritedContent {
  _id: string;
  type: FavoriteableType;
  title: string;
  hubName?: string;
  coverPhoto?: string;
  favoriteCount: number;
  recentCount: number;
  createdAt: string;
}

export interface UserEngagement {
  _id: string;
  name: string;
  email: string;
  profilePhoto?: string;
  favoriteCount: number;
  lastFavorited: string;
  topTypes: FavoriteableType[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Admin Favorites Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/analytics/favorites`;

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _stats = signal<FavoriteOverviewStats | null>(null);
  private readonly _topContent = signal<TopFavoritedContent[]>([]);
  private readonly _userEngagement = signal<UserEngagement[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _selectedPeriod = signal<PeriodFilter>('30d');

  // Pagination
  private readonly _contentPage = signal(1);
  private readonly _contentTotalPages = signal(1);
  private readonly _userPage = signal(1);
  private readonly _userTotalPages = signal(1);

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly stats = this._stats.asReadonly();
  readonly topContent = this._topContent.asReadonly();
  readonly userEngagement = this._userEngagement.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly selectedPeriod = this._selectedPeriod.asReadonly();
  readonly contentPage = this._contentPage.asReadonly();
  readonly contentTotalPages = this._contentTotalPages.asReadonly();
  readonly userPage = this._userPage.asReadonly();
  readonly userTotalPages = this._userTotalPages.asReadonly();

  // ============================================================================
  // Computed Signals
  // ============================================================================

  readonly hasData = computed(() => this._stats() !== null);
  readonly totalFavorites = computed(() => this._stats()?.total ?? 0);
  readonly activeUsers = computed(() => this._stats()?.activeUsers ?? 0);
  readonly thisMonthFavorites = computed(() => this._stats()?.thisMonth ?? 0);
  readonly avgPerUser = computed(() => this._stats()?.avgPerUser ?? 0);
  readonly favoritesTrend = computed(() => this._stats()?.trend ?? 0);
  readonly countByType = computed(() => {
    const stats = this._stats();
    if (!stats) return { expert: 0, hub: 0, expertise: 0, experience: 0 };
    return stats.byType;
  });

  readonly hasMoreContent = computed(() => this._contentPage() < this._contentTotalPages());
  readonly hasMoreUsers = computed(() => this._userPage() < this._userTotalPages());

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Load all favorites analytics data
   */
  loadAnalytics(): void {
    this._loading.set(true);
    this._error.set(null);

    // Load all data in parallel
    Promise.all([
      this.fetchOverview(),
      this.fetchTopContent(1),
      this.fetchUserEngagement(1),
    ])
      .catch((err) => {
        console.error('Error loading favorites analytics:', err);
        this._error.set('Failed to load favorites analytics');
      })
      .finally(() => {
        this._loading.set(false);
      });
  }

  /**
   * Set period filter and reload data
   */
  setPeriod(period: PeriodFilter): void {
    this._selectedPeriod.set(period);
    this.loadAnalytics();
  }

  /**
   * Load more top content
   */
  loadMoreContent(): void {
    if (!this.hasMoreContent() || this._loading()) return;
    this.fetchTopContent(this._contentPage() + 1);
  }

  /**
   * Load more user engagement data
   */
  loadMoreUsers(): void {
    if (!this.hasMoreUsers() || this._loading()) return;
    this.fetchUserEngagement(this._userPage() + 1);
  }

  /**
   * Export favorites data as CSV
   */
  exportCsv(): Observable<Blob> {
    const period = this._selectedPeriod();
    return this.http.get(`${this.apiUrl}/export?period=${period}`, {
      responseType: 'blob',
      withCredentials: true,
    });
  }

  /**
   * Refresh all data
   */
  refresh(): void {
    this._contentPage.set(1);
    this._userPage.set(1);
    this.loadAnalytics();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async fetchOverview(): Promise<void> {
    const period = this._selectedPeriod();
    try {
      const response = await this.http
        .get<ApiResponse<FavoriteOverviewStats>>(`${this.apiUrl}/overview?period=${period}`, {
          withCredentials: true,
        })
        .toPromise();

      if (response?.success && response.data) {
        this._stats.set(response.data);
      }
    } catch (err) {
      console.error('Error fetching overview:', err);
    }
  }

  private async fetchTopContent(page: number): Promise<void> {
    const period = this._selectedPeriod();
    try {
      const response = await this.http
        .get<ApiResponse<TopFavoritedContent[]>>(
          `${this.apiUrl}/top-content?period=${period}&page=${page}&limit=10`,
          { withCredentials: true }
        )
        .toPromise();

      if (response?.success && response.data) {
        if (page === 1) {
          this._topContent.set(response.data);
        } else {
          this._topContent.update((current) => [...current, ...response.data!]);
        }
        this._contentPage.set(page);
        if (response.meta) {
          this._contentTotalPages.set(response.meta.totalPages);
        }
      }
    } catch (err) {
      console.error('Error fetching top content:', err);
    }
  }

  private async fetchUserEngagement(page: number): Promise<void> {
    const period = this._selectedPeriod();
    try {
      const response = await this.http
        .get<ApiResponse<UserEngagement[]>>(
          `${this.apiUrl}/user-engagement?period=${period}&page=${page}&limit=10`,
          { withCredentials: true }
        )
        .toPromise();

      if (response?.success && response.data) {
        if (page === 1) {
          this._userEngagement.set(response.data);
        } else {
          this._userEngagement.update((current) => [...current, ...response.data!]);
        }
        this._userPage.set(page);
        if (response.meta) {
          this._userTotalPages.set(response.meta.totalPages);
        }
      }
    } catch (err) {
      console.error('Error fetching user engagement:', err);
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  getTypeLabel(type: FavoriteableType): string {
    switch (type) {
      case 'expert':
        return 'Expert';
      case 'hub':
        return 'Hub';
      case 'expertise':
        return 'Expertise';
      case 'experience':
        return 'Experience';
      default:
        return type;
    }
  }

  getTypeClass(type: FavoriteableType): string {
    switch (type) {
      case 'expertise':
        return 'bg-purple-100 text-purple-700';
      case 'experience':
        return 'bg-blue-100 text-blue-700';
      case 'expert':
        return 'bg-emerald-100 text-emerald-700';
      case 'hub':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
