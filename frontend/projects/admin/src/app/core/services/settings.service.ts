import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, tap, throwError, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Settings item interface
 * Matches backend models
 */
export interface SettingsItem {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  code?: string;
  priority?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Skill-specific fields
  focusAreaId?: string;
  type?: 'primary' | 'additional';
  // Experience Topic specific - reference to parent theme
  parentCategory?: string | { _id: string; name: string; };
}

/**
 * API response structure
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Settings types - maps to backend collections
 */
export type SettingsType =
  | 'amenities'
  | 'facilities'
  | 'focus-areas'
  | 'skills'
  | 'space-types'
  | 'experience-types'
  | 'experience-topics'
  | 'experience-themes'
  | 'languages'
  | 'company-types'
  | 'target-audiences'
  | 'job-preferences';

/**
 * Create/Update input types
 */
export interface CreateSettingsInput {
  name: string;
  description?: string;
  icon?: string;
  priority?: number;
  // Language specific - ISO code
  code?: string;
  // Skill specific - reference to focus area and type
  focusAreaId?: string;
  type?: 'primary' | 'additional';
  // Experience Topic specific - reference to parent theme
  parentCategory?: string;
}

export interface UpdateSettingsInput extends Partial<CreateSettingsInput> {
  isActive?: boolean;
}

/**
 * Stats for a single collection
 */
export interface CollectionStats {
  total: number;
  active: number;
  inactive: number;
}

/**
 * All settings stats response
 */
export interface SettingsStats {
  amenities: CollectionStats;
  facilities: CollectionStats;
  focusAreas: CollectionStats;
  skills: CollectionStats;
  spaceTypes: CollectionStats;
  experienceTypes: CollectionStats;
  experienceTopics: CollectionStats;
  experienceThemes: CollectionStats;
  languages: CollectionStats;
  companyTypes: CollectionStats;
  targetAudiences: CollectionStats;
  jobPreferences: CollectionStats;
  totals: CollectionStats;
}

/**
 * Settings Service
 *
 * Generic service for managing all settings collections.
 * Uses Angular 19+ patterns with signals and inject().
 *
 * READ operations use web routes: /api/v1/{type}
 * WRITE operations use admin routes: /api/v1/admin/{type}
 */
@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;
  private readonly ADMIN_URL = `${environment.apiUrl}/admin`;

  // State signals for each collection
  private readonly _collections = signal<Map<SettingsType, SettingsItem[]>>(new Map());
  private readonly _loading = signal<Map<SettingsType, boolean>>(new Map());
  private readonly _error = signal<Map<SettingsType, string | null>>(new Map());
  private readonly _activeCollection = signal<SettingsType>('amenities');

  // Stats state
  private readonly _stats = signal<SettingsStats | null>(null);
  private readonly _statsLoading = signal(false);
  private readonly _statsError = signal<string | null>(null);

  // Public readonly signals
  readonly activeCollection = this._activeCollection.asReadonly();
  readonly stats = this._stats.asReadonly();
  readonly statsLoading = this._statsLoading.asReadonly();
  readonly statsError = this._statsError.asReadonly();

  // Computed: get items for active collection
  readonly items = computed(() => {
    const collections = this._collections();
    return collections.get(this._activeCollection()) || [];
  });

  // Computed: loading state for active collection
  readonly loading = computed(() => {
    const loadingMap = this._loading();
    return loadingMap.get(this._activeCollection()) || false;
  });

  // Computed: error for active collection
  readonly error = computed(() => {
    const errorMap = this._error();
    return errorMap.get(this._activeCollection()) || null;
  });

  /**
   * Set active collection type
   */
  setActiveCollection(type: SettingsType): void {
    this._activeCollection.set(type);
  }

  /**
   * Get items for a specific collection
   */
  getItemsForCollection(type: SettingsType): SettingsItem[] {
    return this._collections().get(type) || [];
  }

  /**
   * Get loading state for a specific collection
   */
  isLoadingCollection(type: SettingsType): boolean {
    return this._loading().get(type) || false;
  }

  /**
   * Fetch all items for a collection (uses web route - public GET)
   */
  getAll(
    type: SettingsType,
    includeInactive = true
  ): Observable<ApiResponse<SettingsItem[]>> {
    this.setLoading(type, true);
    this.setError(type, null);

    // Use admin endpoint to get all items including inactive (admin has full access)
    const url = `${this.ADMIN_URL}/${type}?includeInactive=${includeInactive}`;

    return this.http
      .get<ApiResponse<SettingsItem[]>>(url, { withCredentials: true })
      .pipe(
        tap((response) => {
          if (response.success) {
            this.setItems(type, response.data);
          }
          this.setLoading(type, false);
        }),
        catchError((error) => {
          this.setLoading(type, false);
          this.setError(type, error.error?.message || `Failed to fetch ${type}`);
          return throwError(() => error);
        })
      );
  }

  /**
   * Fetch all items (async version)
   */
  async getAllAsync(
    type: SettingsType,
    includeInactive = true
  ): Promise<SettingsItem[]> {
    const response = await firstValueFrom(this.getAll(type, includeInactive));
    return response.data;
  }

  /**
   * Get single item by ID (uses admin route)
   */
  getById(
    type: SettingsType,
    id: string
  ): Observable<ApiResponse<SettingsItem>> {
    return this.http.get<ApiResponse<SettingsItem>>(
      `${this.ADMIN_URL}/${type}/${id}`,
      { withCredentials: true }
    );
  }

  /**
   * Create new item (uses admin route)
   */
  create(
    type: SettingsType,
    data: CreateSettingsInput
  ): Observable<ApiResponse<SettingsItem>> {
    return this.http
      .post<ApiResponse<SettingsItem>>(`${this.ADMIN_URL}/${type}`, data, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            // Add to local state
            const current = this._collections().get(type) || [];
            this.setItems(type, [...current, response.data]);
          }
        })
      );
  }

  /**
   * Create new item (async version)
   */
  async createAsync(
    type: SettingsType,
    data: CreateSettingsInput
  ): Promise<SettingsItem> {
    const response = await firstValueFrom(this.create(type, data));
    return response.data;
  }

  /**
   * Update existing item (uses admin route)
   */
  update(
    type: SettingsType,
    id: string,
    data: UpdateSettingsInput
  ): Observable<ApiResponse<SettingsItem>> {
    return this.http
      .patch<ApiResponse<SettingsItem>>(`${this.ADMIN_URL}/${type}/${id}`, data, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            // Update in local state
            const current = this._collections().get(type) || [];
            this.setItems(
              type,
              current.map((item) => (item._id === id ? response.data : item))
            );
          }
        })
      );
  }

  /**
   * Update existing item (async version)
   */
  async updateAsync(
    type: SettingsType,
    id: string,
    data: UpdateSettingsInput
  ): Promise<SettingsItem> {
    const response = await firstValueFrom(this.update(type, id, data));
    return response.data;
  }

  /**
   * Delete item (soft delete - uses admin route)
   */
  delete(type: SettingsType, id: string): Observable<ApiResponse<void>> {
    return this.http
      .delete<ApiResponse<void>>(`${this.ADMIN_URL}/${type}/${id}`, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            // Remove from local state
            const current = this._collections().get(type) || [];
            this.setItems(
              type,
              current.filter((item) => item._id !== id)
            );
          }
        })
      );
  }

  /**
   * Delete item (async version)
   */
  async deleteAsync(type: SettingsType, id: string): Promise<void> {
    await firstValueFrom(this.delete(type, id));
  }

  /**
   * Toggle item active status
   */
  toggleActive(
    type: SettingsType,
    id: string,
    isActive: boolean
  ): Observable<ApiResponse<SettingsItem>> {
    return this.update(type, id, { isActive });
  }

  /**
   * Toggle item active status (async version)
   */
  async toggleActiveAsync(
    type: SettingsType,
    id: string,
    isActive: boolean
  ): Promise<SettingsItem> {
    return this.updateAsync(type, id, { isActive });
  }

  /**
   * Clear error for a collection
   */
  clearError(type: SettingsType): void {
    this.setError(type, null);
  }

  /**
   * Reset state for a collection
   */
  reset(type: SettingsType): void {
    this.setItems(type, []);
    this.setLoading(type, false);
    this.setError(type, null);
  }

  /**
   * Reset all collections
   */
  resetAll(): void {
    this._collections.set(new Map());
    this._loading.set(new Map());
    this._error.set(new Map());
  }

  /**
   * Fetch stats for all settings collections
   */
  getStats(): Observable<ApiResponse<SettingsStats>> {
    this._statsLoading.set(true);
    this._statsError.set(null);

    return this.http
      .get<ApiResponse<SettingsStats>>(`${this.ADMIN_URL}/settings/stats`, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response.success) {
            this._stats.set(response.data);
          }
          this._statsLoading.set(false);
        }),
        catchError((error) => {
          this._statsLoading.set(false);
          this._statsError.set(error.error?.message || 'Failed to fetch stats');
          return throwError(() => error);
        })
      );
  }

  /**
   * Fetch stats (async version)
   */
  async getStatsAsync(): Promise<SettingsStats> {
    const response = await firstValueFrom(this.getStats());
    return response.data;
  }

  // Private helpers for updating Maps immutably
  private setItems(type: SettingsType, items: SettingsItem[]): void {
    const newMap = new Map(this._collections());
    newMap.set(type, items);
    this._collections.set(newMap);
  }

  private setLoading(type: SettingsType, loading: boolean): void {
    const newMap = new Map(this._loading());
    newMap.set(type, loading);
    this._loading.set(newMap);
  }

  private setError(type: SettingsType, error: string | null): void {
    const newMap = new Map(this._error());
    newMap.set(type, error);
    this._error.set(newMap);
  }
}
