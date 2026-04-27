import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthStateService } from '../../../core/services/auth-state.service';

// ============================================================================
// Types
// ============================================================================

/**
 * Hub summary frequency options
 */
export type HubSummaryFrequency = 'daily' | 'weekly' | 'monthly' | 'never';

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
export interface HubPreferenceItem {
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
export interface HubPreferenceCategory {
  category: string;
  label: string;
  items: HubPreferenceItem[];
}

/**
 * Full hub preferences response
 */
export interface HubPreferencesResponse {
  categories: HubPreferenceCategory[];
  notifyOwner: boolean;
  notifyAdmins: boolean;
  summaryFrequency: HubSummaryFrequency;
}

/**
 * Update preference item input
 */
export interface UpdatePreferenceItem {
  templateId: string;
  enabled: boolean;
}

/**
 * Update hub preferences input
 */
export interface UpdateHubPreferencesInput {
  inApp?: UpdatePreferenceItem[];
  email?: UpdatePreferenceItem[];
  whatsApp?: UpdatePreferenceItem[];
  notifyOwner?: boolean;
  notifyAdmins?: boolean;
  summaryFrequency?: HubSummaryFrequency;
}

/**
 * Toggle preference input
 */
export interface ToggleHubPreferenceInput {
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
// Hub Notification Preference Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class HubNotificationPreferenceService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);

  // Cache per hub
  private cacheMap = new Map<string, { data: HubPreferencesResponse; timestamp: number }>();

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _preferences = signal<HubPreferencesResponse | null>(null);
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
  readonly notifyOwner = computed(() => this._preferences()?.notifyOwner ?? true);
  readonly notifyAdmins = computed(() => this._preferences()?.notifyAdmins ?? true);
  readonly summaryFrequency = computed(() => this._preferences()?.summaryFrequency ?? 'weekly');
  readonly hasData = computed(() => this._preferences() !== null);

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getApiUrl(hubId?: string): string {
    const id = hubId || this.authState.selectedHub()?.id;
    if (!id) {
      throw new Error('No hub selected');
    }
    return `${environment.apiUrl}/hub/${id}/settings/notification-preferences`;
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Load hub preferences with caching
   * @param hubId - Hub ID (optional, uses selected hub if not provided)
   * @param forceRefresh - If true, bypasses cache and fetches fresh data
   */
  async loadPreferences(hubId?: string, forceRefresh = false): Promise<void> {
    const id = hubId || this.authState.selectedHub()?.id;
    if (!id) {
      this._error.set('No hub selected');
      return;
    }

    // Return cached data if valid and not forcing refresh
    const cached = this.cacheMap.get(id);
    if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      this._preferences.set(cached.data);
      return;
    }

    if (this._loading()) {
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<HubPreferencesResponse>>(this.getApiUrl(id), {
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        this._preferences.set(response.data);
        this.cacheMap.set(id, { data: response.data, timestamp: Date.now() });
      } else {
        this._error.set(response.error?.message ?? 'Failed to load hub preferences');
      }
    } catch (error) {
      console.error('Failed to fetch hub preferences:', error);
      this._error.set('Failed to load hub notification preferences');
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Update hub preferences
   * @param data - Partial preferences to update
   * @param hubId - Hub ID (optional, uses selected hub if not provided)
   */
  async updatePreferences(data: UpdateHubPreferencesInput, hubId?: string): Promise<boolean> {
    if (this._saving()) {
      return false;
    }

    this._saving.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.patch<ApiResponse<unknown>>(this.getApiUrl(hubId), data, {
          withCredentials: true,
        })
      );

      if (response.success) {
        // Reload preferences to get updated data
        await this.loadPreferences(hubId, true);
        return true;
      } else {
        this._error.set(response.error?.message ?? 'Failed to update preferences');
        return false;
      }
    } catch (error) {
      console.error('Failed to update hub preferences:', error);
      this._error.set('Failed to update preferences');
      return false;
    } finally {
      this._saving.set(false);
    }
  }

  /**
   * Toggle a single notification preference
   */
  async togglePreference(input: ToggleHubPreferenceInput, hubId?: string): Promise<boolean> {
    if (this._saving()) {
      return false;
    }

    this._saving.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<unknown>>(`${this.getApiUrl(hubId)}/toggle`, input, {
          withCredentials: true,
        })
      );

      if (response.success) {
        // Update local state optimistically
        this.updateLocalPreference(input, hubId);
        return true;
      } else {
        this._error.set(response.error?.message ?? 'Failed to toggle preference');
        return false;
      }
    } catch (error) {
      console.error('Failed to toggle hub preference:', error);
      this._error.set('Failed to toggle preference');
      return false;
    } finally {
      this._saving.set(false);
    }
  }

  /**
   * Update notify owner setting
   */
  async updateNotifyOwner(enabled: boolean, hubId?: string): Promise<boolean> {
    return this.updatePreferences({ notifyOwner: enabled }, hubId);
  }

  /**
   * Update notify admins setting
   */
  async updateNotifyAdmins(enabled: boolean, hubId?: string): Promise<boolean> {
    return this.updatePreferences({ notifyAdmins: enabled }, hubId);
  }

  /**
   * Update summary frequency
   */
  async updateSummaryFrequency(frequency: HubSummaryFrequency, hubId?: string): Promise<boolean> {
    return this.updatePreferences({ summaryFrequency: frequency }, hubId);
  }

  /**
   * Refresh preferences (bypasses cache)
   */
  async refresh(hubId?: string): Promise<void> {
    await this.loadPreferences(hubId, true);
  }

  /**
   * Clear cached data for a hub
   */
  clearCache(hubId?: string): void {
    if (hubId) {
      this.cacheMap.delete(hubId);
    } else {
      this.cacheMap.clear();
    }
    this._preferences.set(null);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Update local preference state after toggle
   */
  private updateLocalPreference(input: ToggleHubPreferenceInput, hubId?: string): void {
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

    const updatedData: HubPreferencesResponse = {
      ...current,
      categories: updatedCategories,
    };

    this._preferences.set(updatedData);

    // Update cache
    const id = hubId || this.authState.selectedHub()?.id;
    if (id) {
      this.cacheMap.set(id, { data: updatedData, timestamp: Date.now() });
    }
  }
}
