import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

// ============================================================================
// Types
// ============================================================================

/**
 * Channel preference for a specific template
 */
export interface HubChannelPreference {
  templateId: string;
  enabled: boolean;
}

/**
 * Hub info with notification preferences
 */
export interface HubWithPreferences {
  hubId: string;
  hubName: string;
  hubLogo?: string;
  preferences: {
    inApp: HubChannelPreference[];
    email: HubChannelPreference[];
    whatsApp: HubChannelPreference[];
  };
  globalMute: boolean;
  updatedAt: string;
}

/**
 * Hub list response
 */
export interface HubPreferencesListResponse {
  preferences: HubWithPreferences[];
  total: number;
}

/**
 * Channel preference with availability
 */
export interface HubChannelPref {
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
  inApp: HubChannelPref;
  email: HubChannelPref;
  whatsApp: HubChannelPref;
}

/**
 * Category with preference items for a hub
 */
export interface HubPreferenceCategory {
  category: string;
  label: string;
  items: HubPreferenceItem[];
}

/**
 * Full hub preferences response
 */
export interface HubPreferencesDetailResponse {
  hubId: string;
  hubName: string;
  hubLogo?: string;
  categories: HubPreferenceCategory[];
  globalMute: boolean;
}

/**
 * Toggle preference input
 */
export interface ToggleHubPreferenceInput {
  templateId: string;
  channel: 'inApp' | 'email' | 'whatsApp';
  enabled: boolean;
}

/**
 * Update hub preferences input
 */
export interface UpdateHubPreferencesInput {
  inApp?: { templateId: string; enabled: boolean }[];
  email?: { templateId: string; enabled: boolean }[];
  whatsApp?: { templateId: string; enabled: boolean }[];
  globalMute?: boolean;
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
// Hub Notification Preference Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class HubNotificationPreferenceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/me/notification-preferences`;

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _hubsList = signal<HubWithPreferences[]>([]);
  private readonly _selectedHub = signal<HubPreferencesDetailResponse | null>(null);
  private readonly _loading = signal(false);
  private readonly _loadingDetail = signal(false);
  private readonly _saving = signal(false);
  private readonly _error = signal<string | null>(null);

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly hubsList = this._hubsList.asReadonly();
  readonly selectedHub = this._selectedHub.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loadingDetail = this._loadingDetail.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly error = this._error.asReadonly();

  // ============================================================================
  // Computed Signals
  // ============================================================================

  readonly hasHubs = computed(() => this._hubsList().length > 0);
  readonly hubCount = computed(() => this._hubsList().length);
  readonly selectedHubCategories = computed(() => this._selectedHub()?.categories ?? []);
  readonly selectedHubGlobalMute = computed(() => this._selectedHub()?.globalMute ?? false);

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Load list of hubs with their notification preferences
   */
  async loadHubsList(): Promise<void> {
    if (this._loading()) {
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<HubPreferencesListResponse>>(`${this.apiUrl}/hubs`, {
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        this._hubsList.set(response.data.preferences);
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
   * Load detailed preferences for a specific hub
   */
  async loadHubPreferences(hubId: string): Promise<void> {
    if (this._loadingDetail()) {
      return;
    }

    this._loadingDetail.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<HubPreferencesDetailResponse>>(`${this.apiUrl}/hub/${hubId}`, {
          withCredentials: true,
        })
      );

      if (response.success && response.data) {
        this._selectedHub.set(response.data);
      } else {
        this._error.set(response.error?.message ?? 'Failed to load hub preferences');
      }
    } catch (error) {
      console.error('Failed to fetch hub preferences:', error);
      this._error.set('Failed to load hub notification preferences');
    } finally {
      this._loadingDetail.set(false);
    }
  }

  /**
   * Toggle a single notification preference for a hub
   */
  async toggleHubPreference(hubId: string, input: ToggleHubPreferenceInput): Promise<boolean> {
    if (this._saving()) {
      return false;
    }

    this._saving.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<unknown>>(`${this.apiUrl}/hub/${hubId}/toggle`, input, {
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
      console.error('Failed to toggle hub preference:', error);
      this._error.set('Failed to toggle preference');
      return false;
    } finally {
      this._saving.set(false);
    }
  }

  /**
   * Update hub preferences
   */
  async updateHubPreferences(hubId: string, data: UpdateHubPreferencesInput): Promise<boolean> {
    if (this._saving()) {
      return false;
    }

    this._saving.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.patch<ApiResponse<unknown>>(`${this.apiUrl}/hub/${hubId}`, data, {
          withCredentials: true,
        })
      );

      if (response.success) {
        // Reload preferences to get updated data
        await this.loadHubPreferences(hubId);
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
   * Update global mute for a hub
   */
  async updateHubGlobalMute(hubId: string, muted: boolean): Promise<boolean> {
    return this.updateHubPreferences(hubId, { globalMute: muted });
  }

  /**
   * Clear selected hub
   */
  clearSelectedHub(): void {
    this._selectedHub.set(null);
  }

  /**
   * Refresh hubs list
   */
  async refresh(): Promise<void> {
    await this.loadHubsList();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Update local preference state after toggle
   */
  private updateLocalPreference(input: ToggleHubPreferenceInput): void {
    const current = this._selectedHub();
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

    this._selectedHub.set({
      ...current,
      categories: updatedCategories,
    });
  }
}
