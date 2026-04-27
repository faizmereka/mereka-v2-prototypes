import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthStateService } from '../../../core/services/auth-state.service';

// ============================================================================
// Types
// ============================================================================

export interface HubSettingsProfile {
  id: string;
  name: string;
  description: string;
  email: string;
  phoneNumber: string;
  website: string;
  address: string;
  logo: string;
  coverImage: string;
}

export interface HubAccountInfo {
  profile: HubSettingsProfile | null;
  subscription: {
    planName: string;
    isFreePlan: boolean;
  } | null;
  stats: {
    rating: number | null;
    totalReviews: number;
  };
  status: 'active' | 'hold' | 'pending';
  createdAt: Date | null;
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
// Hub Settings Account Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class HubSettingsAccountService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _profile = signal<HubSettingsProfile | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _initialized = signal(false);
  private readonly _cachedHubId = signal<string | null>(null);

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly profile = this._profile.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly initialized = this._initialized.asReadonly();

  // ============================================================================
  // Computed Signals - Combine API data with auth state
  // ============================================================================

  readonly hubName = computed(() => this._profile()?.name || this.authState.selectedHub()?.name || 'My Business');
  readonly hubLogo = computed(() => this._profile()?.logo || this.authState.selectedHub()?.logo || null);
  readonly hubPhone = computed(() => this._profile()?.phoneNumber || '');
  readonly hubEmail = computed(() => this._profile()?.email || '');
  readonly hubWebsite = computed(() => this._profile()?.website || '');
  readonly hubAddress = computed(() => this._profile()?.address || '');

  // From auth state (not in profile API)
  readonly hubSlug = computed(() => this.authState.selectedHub()?.slug || '');
  readonly hubCreatedAt = computed(() => {
    const hub = this.authState.selectedHub() as { createdAt?: string } | null;
    return hub?.createdAt ? new Date(hub.createdAt) : null;
  });
  readonly hubStatus = computed(() => {
    const hub = this.authState.selectedHub() as { status?: string } | null;
    return (hub?.status as 'active' | 'hold' | 'pending') || 'active';
  });
  readonly hubLocation = computed(() => {
    const location = this.authState.selectedHub()?.location;
    if (!location) return null;
    const parts = [location.city, location.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  });

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Load profile settings - uses cache if available for current hub
   */
  async loadProfile(): Promise<void> {
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

    await this.fetchProfile();
  }

  /**
   * Force refresh profile data
   */
  async refresh(): Promise<void> {
    await this.fetchProfile();
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this._profile.set(null);
    this._initialized.set(false);
    this._cachedHubId.set(null);
    this._error.set(null);
  }

  /**
   * Update profile field
   */
  async updateProfile(updates: Partial<HubSettingsProfile>): Promise<HubSettingsProfile> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      throw new Error('No hub selected');
    }

    try {
      const response = await firstValueFrom(
        this.http.patch<ApiResponse<HubSettingsProfile>>(
          `${environment.apiUrl}/hub/${hubId}/settings/profile`,
          { hubId, ...updates },
          { withCredentials: true }
        )
      );

      if (!response.success || !response.data) {
        throw new Error(response.error?.message ?? 'Failed to update profile');
      }

      // Update local state
      this._profile.set(response.data);

      return response.data;
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async fetchProfile(): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      this._error.set('No hub selected');
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<HubSettingsProfile>>(
          `${environment.apiUrl}/hub/${hubId}/settings/profile`,
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        this._profile.set(response.data);
        this._cachedHubId.set(hubId);
        this._initialized.set(true);
      } else {
        this._error.set(response.error?.message ?? 'Failed to load profile settings');
      }
    } catch (error) {
      console.error('Failed to fetch profile settings:', error);
      this._error.set('Failed to load profile settings');
    } finally {
      this._loading.set(false);
    }
  }
}
