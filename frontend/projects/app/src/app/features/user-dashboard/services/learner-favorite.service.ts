import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

// ============================================================================
// Types
// ============================================================================

export type FavoriteType = 'expert' | 'hub' | 'expertise' | 'experience';

export interface FavoriteItem {
  _id: string;
  favoriteableType: FavoriteType;
  favoriteableId: string;
  createdAt: string;
  entity?: {
    _id: string;
    title?: string;
    name?: string;
    slug: string;
    coverPhoto?: string;
    profilePhoto?: string;
    logo?: string;
    rating?: number;
    location?: {
      city?: string;
      country?: string;
    };
    hub?: {
      name: string;
      slug: string;
    };
  };
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
// Learner Favorite Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class LearnerFavoriteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/favorites`;

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _favorites = signal<FavoriteItem[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _activeFilter = signal<FavoriteType | 'all'>('all');

  // Pagination
  private readonly _page = signal(1);
  private readonly _totalPages = signal(1);
  private readonly _total = signal(0);

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly favorites = this._favorites.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly activeFilter = this._activeFilter.asReadonly();
  readonly page = this._page.asReadonly();
  readonly totalPages = this._totalPages.asReadonly();
  readonly total = this._total.asReadonly();

  // ============================================================================
  // Computed Signals
  // ============================================================================

  readonly hasFavorites = computed(() => {
    const favorites = this._favorites();
    return Array.isArray(favorites) && favorites.length > 0;
  });
  readonly hasMore = computed(() => this._page() < this._totalPages());

  readonly filteredFavorites = computed(() => {
    const filter = this._activeFilter();
    const favorites = this._favorites();
    // Ensure favorites is always an array
    if (!Array.isArray(favorites)) return [];
    if (filter === 'all') return favorites;
    return favorites.filter((f) => f.favoriteableType === filter);
  });

  // Group counts by type
  readonly countByType = computed(() => {
    const favorites = this._favorites();
    // Ensure favorites is always an array
    if (!Array.isArray(favorites)) {
      return { all: 0, expert: 0, hub: 0, expertise: 0, experience: 0 };
    }
    return {
      all: favorites.length,
      expert: favorites.filter((f) => f.favoriteableType === 'expert').length,
      hub: favorites.filter((f) => f.favoriteableType === 'hub').length,
      expertise: favorites.filter((f) => f.favoriteableType === 'expertise').length,
      experience: favorites.filter((f) => f.favoriteableType === 'experience').length,
    };
  });

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Load user's favorites
   */
  async loadFavorites(type?: FavoriteType): Promise<void> {
    if (this._loading()) return;

    this._loading.set(true);
    this._error.set(null);

    try {
      let url = `${this.apiUrl}?limit=50`;
      if (type) {
        url += `&type=${type}`;
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse<FavoriteItem[]>>(url, {
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        // Handle different response formats: array or { items: [...] }
        const data = response.data;
        const items = Array.isArray(data) ? data : (data as { items?: FavoriteItem[] }).items ?? [];
        this._favorites.set(items);
        if (response.meta) {
          this._page.set(response.meta.page);
          this._totalPages.set(response.meta.totalPages);
          this._total.set(response.meta.total);
        }
      } else {
        this._favorites.set([]);
        this._error.set(response.error?.message ?? 'Failed to load favorites');
      }
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
      this._favorites.set([]);
      this._error.set('Failed to load favorites');
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Remove a favorite
   * @param favoriteId - The ID of the favorite to remove
   * @param keepInList - If true, keeps the item in local list (for UI toggle without immediate removal)
   */
  async removeFavorite(favoriteId: string, keepInList = false): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${favoriteId}`, {
          withCredentials: true,
        })
      );

      if (response.success) {
        // Only remove from local state if keepInList is false
        if (!keepInList) {
          this._favorites.update((favorites) => {
            if (!Array.isArray(favorites)) return [];
            return favorites.filter((f) => f._id !== favoriteId);
          });
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to remove favorite:', error);
      return false;
    }
  }

  /**
   * Add a favorite back (re-favorite after unfavoriting)
   */
  async addFavorite(type: FavoriteType, entityId: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<FavoriteItem>>(
          this.apiUrl,
          { favoriteableType: type, favoriteableId: entityId },
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        // Update local state with new favorite
        this._favorites.update((favorites) => {
          if (!Array.isArray(favorites)) return [response.data!];
          // Replace existing item with same entityId or add new
          const exists = favorites.some(f => f.favoriteableId === entityId);
          if (exists) {
            return favorites.map(f => f.favoriteableId === entityId ? response.data! : f);
          }
          return [response.data!, ...favorites];
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add favorite:', error);
      return false;
    }
  }

  /**
   * Set active filter
   */
  setFilter(filter: FavoriteType | 'all'): void {
    this._activeFilter.set(filter);
  }

  /**
   * Refresh favorites
   */
  async refresh(): Promise<void> {
    await this.loadFavorites();
  }

  /**
   * Clear state
   */
  clear(): void {
    this._favorites.set([]);
    this._error.set(null);
    this._page.set(1);
    this._totalPages.set(1);
    this._total.set(0);
  }
}
