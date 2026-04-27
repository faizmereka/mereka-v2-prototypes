import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthStateService } from '../../../core/services/auth-state.service';

// ============================================================================
// Types
// ============================================================================

export type FavoriteableType = 'expert' | 'hub' | 'expertise' | 'experience';

export interface FavoriteStats {
  total: number;
  thisMonth: number;
  thisWeek: number;
  trend: number; // percentage change vs previous period
  byType: {
    expert: number;
    hub: number;
    expertise: number;
    experience: number;
  };
}

export interface FavoriteUser {
  _id: string;
  name: string;
  profilePhoto?: string;
  favoritedAt: string;
  contentType: FavoriteableType;
  contentTitle: string;
  contentId: string;
}

export interface TrendingContent {
  _id: string;
  type: FavoriteableType;
  title: string;
  coverPhoto?: string;
  favoriteCount: number;
  recentCount: number; // last 7 days
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
// Hub Engagement Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class HubEngagementService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);

  private getApiUrl(hubId: string): string {
    return `${environment.apiUrl}/hub/${hubId}/dashboard/favorites`;
  }

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _stats = signal<FavoriteStats | null>(null);
  private readonly _favoriteUsers = signal<FavoriteUser[]>([]);
  private readonly _trendingContent = signal<TrendingContent[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _initialized = signal(false);
  private readonly _activeFilter = signal<FavoriteableType | 'all'>('all');

  // Pagination
  private readonly _page = signal(1);
  private readonly _totalPages = signal(1);
  private readonly _total = signal(0);

  // Track cached hub
  private readonly _cachedHubId = signal<string | null>(null);

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly stats = this._stats.asReadonly();
  readonly favoriteUsers = this._favoriteUsers.asReadonly();
  readonly trendingContent = this._trendingContent.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly initialized = this._initialized.asReadonly();
  readonly activeFilter = this._activeFilter.asReadonly();
  readonly page = this._page.asReadonly();
  readonly totalPages = this._totalPages.asReadonly();
  readonly total = this._total.asReadonly();

  // ============================================================================
  // Computed Signals
  // ============================================================================

  readonly hasData = computed(() => this._stats() !== null);
  readonly hasMore = computed(() => this._page() < this._totalPages());

  readonly filteredUsers = computed(() => {
    const filter = this._activeFilter();
    const users = this._favoriteUsers();
    if (filter === 'all') return users;
    return users.filter((u) => u.contentType === filter);
  });

  readonly totalFavorites = computed(() => this._stats()?.total ?? 0);
  readonly thisMonthFavorites = computed(() => this._stats()?.thisMonth ?? 0);
  readonly favoritesTrend = computed(() => this._stats()?.trend ?? 0);

  readonly countByType = computed(() => {
    const stats = this._stats();
    if (!stats) return { all: 0, expert: 0, hub: 0, expertise: 0, experience: 0 };
    return {
      all: stats.total,
      ...stats.byType,
    };
  });

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Load engagement data - uses cache if available for current hub
   */
  async loadEngagementData(): Promise<void> {
    const currentHubId = this.authState.selectedHub()?.id;

    if (this._initialized() && this._cachedHubId() === currentHubId) {
      return;
    }

    if (this._loading()) {
      return;
    }

    if (this._cachedHubId() !== currentHubId) {
      this.clearCache();
    }

    await this.fetchAllData();
  }

  /**
   * Force refresh all engagement data from API
   */
  async refresh(): Promise<void> {
    await this.fetchAllData();
  }

  /**
   * Set filter for favorite users
   */
  setFilter(filter: FavoriteableType | 'all'): void {
    this._activeFilter.set(filter);
  }

  /**
   * Load more favorite users (pagination)
   */
  async loadMore(): Promise<void> {
    if (!this.hasMore() || this._loading()) return;

    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) return;

    this._loading.set(true);
    try {
      const users = await this.fetchFavoriteUsers(hubId, this._page() + 1);
      if (users) {
        this._favoriteUsers.update((current) => [...current, ...users]);
        this._page.update((p) => p + 1);
      }
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this._stats.set(null);
    this._favoriteUsers.set([]);
    this._trendingContent.set([]);
    this._initialized.set(false);
    this._cachedHubId.set(null);
    this._error.set(null);
    this._page.set(1);
    this._totalPages.set(1);
    this._total.set(0);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async fetchAllData(): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      this._error.set('No hub selected');
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const [stats, users, trending] = await Promise.all([
        this.fetchStats(hubId),
        this.fetchFavoriteUsers(hubId, 1),
        this.fetchTrendingContent(hubId),
      ]);

      if (stats) {
        this._stats.set(stats);
      }

      if (users) {
        this._favoriteUsers.set(users);
      }

      if (trending) {
        this._trendingContent.set(trending);
      }

      this._cachedHubId.set(hubId);
      this._initialized.set(true);
    } catch (error) {
      console.error('Failed to fetch engagement data:', error);
      this._error.set('Failed to load engagement data');
    } finally {
      this._loading.set(false);
    }
  }

  private async fetchStats(hubId: string): Promise<FavoriteStats | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<FavoriteStats>>(`${this.getApiUrl(hubId)}/stats`, {
          withCredentials: true,
        })
      );
      return response.success ? response.data ?? null : null;
    } catch {
      return null;
    }
  }

  private async fetchFavoriteUsers(hubId: string, page: number): Promise<FavoriteUser[] | null> {
    try {
      const filter = this._activeFilter();
      let url = `${this.getApiUrl(hubId)}?page=${page}&limit=20`;
      if (filter !== 'all') {
        url += `&contentType=${filter}`;
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse<FavoriteUser[]>>(url, {
          withCredentials: true,
        })
      );

      if (response.success && response.meta) {
        this._totalPages.set(response.meta.totalPages);
        this._total.set(response.meta.total);
      }

      return response.success ? response.data ?? [] : null;
    } catch {
      return null;
    }
  }

  private async fetchTrendingContent(hubId: string): Promise<TrendingContent[] | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<TrendingContent[]>>(`${this.getApiUrl(hubId)}/trending`, {
          withCredentials: true,
        })
      );
      return response.success ? response.data ?? [] : null;
    } catch {
      return null;
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
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
      }
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  }
}
