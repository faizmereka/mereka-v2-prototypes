import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

// ============================================================================
// Types
// ============================================================================

/**
 * Summary frequency options
 */
export type SummaryFrequency = 'daily' | 'weekly' | 'monthly' | 'never';

/**
 * Channel preference
 */
export interface ChannelPreference {
  available: boolean; // Whether this channel exists for this template
  enabled: boolean; // User's preference (only relevant if available)
}

/**
 * Preference item for a single notification template
 */
export interface PreferenceItem {
  templateId: string;
  title: string;
  description: string;
  inApp: ChannelPreference;
  email: ChannelPreference;
  whatsApp: ChannelPreference;
}

/**
 * Category with preference items
 */
export interface PreferenceCategory {
  category: string;
  label: string;
  items: PreferenceItem[];
}

/**
 * Full user preferences response
 */
export interface UserPreferencesResponse {
  categories: PreferenceCategory[];
  summaryFrequency: SummaryFrequency;
  globalMute: boolean;
}

/**
 * Update preference item input
 */
export interface UpdatePreferenceItem {
  templateId: string;
  enabled: boolean;
}

/**
 * Update user preferences input
 */
export interface UpdateUserPreferencesInput {
  inApp?: UpdatePreferenceItem[];
  email?: UpdatePreferenceItem[];
  whatsApp?: UpdatePreferenceItem[];
  summaryFrequency?: SummaryFrequency;
  globalMute?: boolean;
}

/**
 * Toggle preference input
 */
export interface TogglePreferenceInput {
  templateId: string;
  channel: 'inApp' | 'email' | 'whatsApp';
  enabled: boolean;
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
// User Notification Preference Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class UserNotificationPreferenceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/me/notification-preferences`;

  // Cache
  private cachedData: UserPreferencesResponse | null = null;
  private cacheTimestamp = 0;

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _preferences = signal<UserPreferencesResponse | null>(null);
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _error = signal<string | null>(null);

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly preferences = this._preferences.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly error = this._error.asReadonly();

  // ============================================================================
  // Computed Signals
  // ============================================================================

  readonly categories = computed(() => this._preferences()?.categories ?? []);
  readonly summaryFrequency = computed(() => this._preferences()?.summaryFrequency ?? 'weekly');
  readonly globalMute = computed(() => this._preferences()?.globalMute ?? false);
  readonly hasData = computed(() => this._preferences() !== null);

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Load user preferences with caching
   * @param forceRefresh - If true, bypasses cache and fetches fresh data
   */
  async loadPreferences(forceRefresh = false): Promise<void> {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && this.isCacheValid()) {
      this._preferences.set(this.cachedData);
      return;
    }

    if (this._loading()) {
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<UserPreferencesResponse>>(this.apiUrl, {
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        this._preferences.set(response.data);
        this.updateCache(response.data);
      } else {
        this._error.set(response.error?.message ?? 'Failed to load preferences');
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      this._error.set('Failed to load notification preferences');
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Update user preferences
   * @param data - Partial preferences to update
   */
  async updatePreferences(data: UpdateUserPreferencesInput): Promise<boolean> {
    if (this._saving()) {
      return false;
    }

    this._saving.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.patch<ApiResponse<unknown>>(this.apiUrl, data, {
          withCredentials: true,
        })
      );

      if (response.success) {
        // Reload preferences to get updated data
        await this.loadPreferences(true);
        return true;
      } else {
        this._error.set(response.error?.message ?? 'Failed to update preferences');
        return false;
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      this._error.set('Failed to update preferences');
      return false;
    } finally {
      this._saving.set(false);
    }
  }

  /**
   * Toggle a single notification preference
   */
  async togglePreference(input: TogglePreferenceInput): Promise<boolean> {
    if (this._saving()) {
      return false;
    }

    this._saving.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<unknown>>(`${this.apiUrl}/toggle`, input, {
          withCredentials: true,
        })
      );

      if (response.success) {
        // Update local state optimistically
        this.updateLocalPreference(input);
        return true;
      } else {
        this._error.set(response.error?.message ?? 'Failed to toggle preference');
        return false;
      }
    } catch (error) {
      console.error('Failed to toggle preference:', error);
      this._error.set('Failed to toggle preference');
      return false;
    } finally {
      this._saving.set(false);
    }
  }

  /**
   * Update global mute setting
   */
  async updateGlobalMute(muted: boolean): Promise<boolean> {
    return this.updatePreferences({ globalMute: muted });
  }

  /**
   * Update summary frequency
   */
  async updateSummaryFrequency(frequency: SummaryFrequency): Promise<boolean> {
    return this.updatePreferences({ summaryFrequency: frequency });
  }

  /**
   * Refresh preferences (bypasses cache)
   */
  async refresh(): Promise<void> {
    await this.loadPreferences(true);
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this.cachedData = null;
    this.cacheTimestamp = 0;
    this._preferences.set(null);
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

  private updateCache(data: UserPreferencesResponse): void {
    this.cachedData = data;
    this.cacheTimestamp = Date.now();
  }

  /**
   * Update local preference state after toggle
   */
  private updateLocalPreference(input: TogglePreferenceInput): void {
    const current = this._preferences();
    if (!current) return;

    const updatedCategories = current.categories.map((category) => ({
      ...category,
      items: category.items.map((item) => {
        if (item.templateId === input.templateId) {
          return {
            ...item,
            [input.channel]: { ...item[input.channel], enabled: input.enabled },
          };
        }
        return item;
      }),
    }));

    this._preferences.set({
      ...current,
      categories: updatedCategories,
    });
    this.updateCache({
      ...current,
      categories: updatedCategories,
    });
  }
}
