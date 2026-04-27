import { Injectable, inject, PLATFORM_ID, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Favoriteable entity types
 */
export type FavoriteType = 'expert' | 'hub' | 'expertise' | 'experience';

/**
 * Favorite item returned from API
 */
export interface FavoriteItem {
  _id: string;
  favoriteableType: string;
  favoriteableId: string;
  entity?: {
    _id: string;
    name: string;
    slug: string;
    image: string | null;
    description: string | null;
  };
  createdAt: string;
}

/**
 * Pagination info from API
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Favorites list response
 */
export interface FavoritesListResponse {
  items: FavoriteItem[];
  pagination: PaginationInfo;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Pending favorite action stored in localStorage
 */
interface PendingFavoriteAction {
  action: 'favorite';
  type: FavoriteType;
  id: string;
  returnUrl: string;
}

const PENDING_FAVORITE_ACTION_KEY = 'pendingFavoriteAction';

/**
 * FavoriteService - Handles favoriting functionality for learners
 *
 * Features:
 * - Toggle favorite status on entities
 * - Batch check favorited IDs for listing pages
 * - Handle unauthenticated users by saving action and redirecting to login
 * - Optimistic updates with rollback on error
 */
@Injectable({ providedIn: 'root' })
export class FavoriteService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);

  private readonly apiUrl = `${environment.apiUrl}/favorites`;

  // Signals for reactive state
  private readonly _favoritedIds = signal<Map<FavoriteType, Set<string>>>(
    new Map([
      ['expert', new Set<string>()],
      ['hub', new Set<string>()],
      ['expertise', new Set<string>()],
      ['experience', new Set<string>()],
    ])
  );
  private readonly _favorites = signal<FavoriteItem[]>([]);
  private readonly _loading = signal(false);
  private readonly _initialized = signal(false);

  readonly favorites = this._favorites.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly initialized = this._initialized.asReadonly();

  /**
   * Check if an item is favorited (O(1) lookup)
   */
  isFavorited(type: FavoriteType, id: string): boolean {
    const typeSet = this._favoritedIds().get(type);
    return typeSet?.has(id) ?? false;
  }

  /**
   * Get a computed signal that tracks if an item is favorited
   */
  isFavoritedSignal(type: FavoriteType, id: string) {
    return computed(() => {
      const typeSet = this._favoritedIds().get(type);
      return typeSet?.has(id) ?? false;
    });
  }

  /**
   * Toggle favorite status of an item
   * If user is not authenticated, stores action and redirects to login
   */
  async toggleFavorite(type: FavoriteType, id: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Check if user is authenticated
    if (!this.authService.isLoggedIn()) {
      this.storePendingAction(type, id);
      this.redirectToLogin();
      return;
    }

    const isFav = this.isFavorited(type, id);

    if (isFav) {
      // Find the favorite ID to remove
      const favorite = this._favorites().find(
        (f) => f.favoriteableType === type && f.favoriteableId === id
      );
      if (favorite) {
        await this.removeFavorite(favorite._id, type, id);
      } else {
        // If we don't have the favorite ID, we need to fetch it
        // This happens when isFavorited came from detail page's isFavorited flag
        // For now, try to remove by refetching favorites
        await this.removeFavoriteByEntity(type, id);
      }
    } else {
      await this.addFavorite(type, id);
    }
  }

  /**
   * Add an item to favorites
   */
  async addFavorite(type: FavoriteType, id: string): Promise<void> {
    // Optimistic update
    this.updateFavoritedIds(type, id, true);

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<FavoriteItem>>(
          this.apiUrl,
          {
            favoriteableType: type,
            favoriteableId: id,
          },
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        // Add to favorites list
        this._favorites.update((favs) => [response.data!, ...favs]);
      } else {
        // Rollback on failure
        this.updateFavoritedIds(type, id, false);
        throw new Error(response.error?.message || 'Failed to add favorite');
      }
    } catch (error) {
      // Rollback on error
      this.updateFavoritedIds(type, id, false);
      console.error('Failed to add favorite:', error);
      throw error;
    }
  }

  /**
   * Remove an item from favorites by favorite ID
   */
  async removeFavorite(
    favoriteId: string,
    type: FavoriteType,
    entityId: string
  ): Promise<void> {
    // Optimistic update
    this.updateFavoritedIds(type, entityId, false);

    try {
      const response = await firstValueFrom(
        this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${favoriteId}`, {
          withCredentials: true,
        })
      );

      if (response.success) {
        // Remove from favorites list
        this._favorites.update((favs) =>
          favs.filter((f) => f._id !== favoriteId)
        );
      } else {
        // Rollback on failure
        this.updateFavoritedIds(type, entityId, true);
        throw new Error(response.error?.message || 'Failed to remove favorite');
      }
    } catch (error) {
      // Rollback on error
      this.updateFavoritedIds(type, entityId, true);
      console.error('Failed to remove favorite:', error);
      throw error;
    }
  }

  /**
   * Remove a favorite by entity type and ID (when we don't have the favorite ID)
   */
  private async removeFavoriteByEntity(
    type: FavoriteType,
    entityId: string
  ): Promise<void> {
    // Optimistic update
    this.updateFavoritedIds(type, entityId, false);

    try {
      // First, get the favorite to find its ID
      const response = await firstValueFrom(
        this.http.get<ApiResponse<FavoritesListResponse>>(
          `${this.apiUrl}?type=${type}`,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        const favorite = response.data.items.find(
          (f) => f.favoriteableId === entityId
        );
        if (favorite) {
          await this.removeFavorite(favorite._id, type, entityId);
        }
      }
    } catch (error) {
      // Rollback on error
      this.updateFavoritedIds(type, entityId, true);
      console.error('Failed to remove favorite by entity:', error);
      throw error;
    }
  }

  /**
   * Load all user favorites
   */
  async loadFavorites(
    type?: FavoriteType,
    page = 1,
    limit = 50
  ): Promise<FavoritesListResponse> {
    if (!isPlatformBrowser(this.platformId)) {
      return { items: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
    }

    if (!this.authService.isLoggedIn()) {
      return { items: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
    }

    this._loading.set(true);

    try {
      let url = `${this.apiUrl}?page=${page}&limit=${limit}`;
      if (type) {
        url += `&type=${type}`;
      }

      const response = await firstValueFrom(
        this.http.get<ApiResponse<FavoritesListResponse>>(url, {
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        this._favorites.set(response.data.items);

        // Update favoritedIds map
        for (const item of response.data.items) {
          this.updateFavoritedIds(
            item.favoriteableType as FavoriteType,
            item.favoriteableId,
            true
          );
        }

        return response.data;
      }

      return { items: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    } catch (error) {
      console.error('Failed to load favorites:', error);
      return { items: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    } finally {
      this._loading.set(false);
      this._initialized.set(true);
    }
  }

  /**
   * Batch check if items are favorited (for listing pages)
   */
  async loadFavoritedIds(type: FavoriteType, ids: string[]): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (ids.length === 0) {
      return;
    }

    // Wait for auth to initialize if not already done
    if (!this.authService.isInitialized()) {
      await this.waitForAuthInit();
    }

    if (!this.authService.isLoggedIn()) {
      return;
    }

    try {
      const idsParam = ids.join(',');
      const response = await firstValueFrom(
        this.http.get<ApiResponse<Record<string, boolean>>>(
          `${this.apiUrl}/check?type=${type}&ids=${idsParam}`,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        // Update the favoritedIds map
        for (const [id, isFav] of Object.entries(response.data)) {
          this.updateFavoritedIds(type, id, isFav);
        }
      }
    } catch (error) {
      console.error('Failed to check favorites:', error);
    }
  }

  /**
   * Process pending favorite action after login
   * Should be called on app initialization or after successful login
   */
  async processPendingFavoriteAction(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    const pendingAction = this.getPendingAction();
    if (!pendingAction) {
      return false;
    }

    // Clear the pending action
    this.clearPendingAction();

    // Check if user is now authenticated
    if (!this.authService.isLoggedIn()) {
      return false;
    }

    try {
      // Process the pending action
      await this.addFavorite(pendingAction.type, pendingAction.id);
      return true;
    } catch (error) {
      console.error('Failed to process pending favorite action:', error);
      return false;
    }
  }

  /**
   * Update favoritedIds map
   */
  private updateFavoritedIds(
    type: FavoriteType,
    id: string,
    isFavorited: boolean
  ): void {
    this._favoritedIds.update((map) => {
      const newMap = new Map(map);
      const typeSet = new Set(newMap.get(type) ?? []);

      if (isFavorited) {
        typeSet.add(id);
      } else {
        typeSet.delete(id);
      }

      newMap.set(type, typeSet);
      return newMap;
    });
  }

  /**
   * Redirect to login page with return URL
   */
  private redirectToLogin(): void {
    const returnUrl = encodeURIComponent(window.location.href);
    const loginUrl = `${environment.appUrls.auth}/login?returnUrl=${returnUrl}`;
    window.location.href = loginUrl;
  }

  /**
   * Store pending favorite action in localStorage
   */
  private storePendingAction(type: FavoriteType, id: string): void {
    const action: PendingFavoriteAction = {
      action: 'favorite',
      type,
      id,
      returnUrl: window.location.href,
    };

    try {
      localStorage.setItem(PENDING_FAVORITE_ACTION_KEY, JSON.stringify(action));
    } catch {
      console.warn('Failed to store pending favorite action');
    }
  }

  /**
   * Get pending favorite action from localStorage
   */
  private getPendingAction(): PendingFavoriteAction | null {
    try {
      const stored = localStorage.getItem(PENDING_FAVORITE_ACTION_KEY);
      if (!stored) return null;

      const action = JSON.parse(stored) as PendingFavoriteAction;
      if (action.action !== 'favorite') return null;

      return action;
    } catch {
      return null;
    }
  }

  /**
   * Clear pending favorite action from localStorage
   */
  private clearPendingAction(): void {
    try {
      localStorage.removeItem(PENDING_FAVORITE_ACTION_KEY);
    } catch {
      // Ignore
    }
  }

  /**
   * Clear all favorite state (for logout)
   */
  clearState(): void {
    this._favorites.set([]);
    this._favoritedIds.set(
      new Map([
        ['expert', new Set<string>()],
        ['hub', new Set<string>()],
        ['expertise', new Set<string>()],
        ['experience', new Set<string>()],
      ])
    );
    this._initialized.set(false);
  }

  /**
   * Wait for auth service to complete initialization
   */
  private waitForAuthInit(): Promise<void> {
    return new Promise((resolve) => {
      const maxWaitMs = 5000;
      const pollIntervalMs = 50;
      let elapsed = 0;

      const checkInit = () => {
        if (this.authService.isInitialized() || elapsed >= maxWaitMs) {
          resolve();
          return;
        }
        elapsed += pollIntervalMs;
        setTimeout(checkInit, pollIntervalMs);
      };

      checkInit();
    });
  }
}
