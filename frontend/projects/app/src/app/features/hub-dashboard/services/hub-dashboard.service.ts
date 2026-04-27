import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthStateService } from '../../../core/services/auth-state.service';

// ============================================================================
// Types
// ============================================================================

export interface HubDashboardStats {
  earnings: {
    total: number;
    thisMonth: number;
    currency: string;
  };
  listings: {
    services: number;
    experiences: number;
    gigs: number;
    spaces: number;
  };
  orders: {
    active: number;
    totalValue: number;
  };
}

export interface ServiceRequest {
  id: string;
  contactName: string;
  contactEmail: string;
  contactAvatar?: string;
  expertise: string;
  dateTime: string;
  mode: string;
  paidAmount: string;
}

export interface ExperienceBooking {
  id: string;
  title: string;
  image?: string;
  status: 'active' | 'completed' | 'cancelled';
  lastBooked: string;
  tickets: number;
  profit: string;
}

export interface HubSubscriptionInfo {
  planCode: string | null;
  planName: string;
  status: string | null;
}

export interface HubOnboardingStatus {
  profileComplete: boolean;
  profileCompletionPercentage: number;
  stripeVerified: boolean;
  hasWorkExperience: boolean;
  missingFields: string[];
  subscription: HubSubscriptionInfo;
}

export interface SetupPrompt {
  id: string;
  title: string;
  description: string;
  buttons: { label: string; link?: string; action?: string; primary?: boolean }[];
  image: string;
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
// Hub Dashboard Service
// ============================================================================

/**
 * Hub Dashboard Service - Handles hub dashboard data with signal-based caching
 *
 * Caching approach:
 * - Data is cached in signals and persists while app is running
 * - Use refresh() to force refetch from API
 * - Cache is cleared when switching hubs
 */
@Injectable({ providedIn: 'root' })
export class HubDashboardService {
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);

  // Base URL - hubId will be added dynamically
  // Pattern: /hub/:hubId/dashboard
  private getApiUrl(hubId: string): string {
    return `${environment.apiUrl}/hub/${hubId}/dashboard`;
  }

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _stats = signal<HubDashboardStats | null>(null);
  private readonly _serviceRequests = signal<ServiceRequest[]>([]);
  private readonly _experienceBookings = signal<ExperienceBooking[]>([]);
  private readonly _onboardingStatus = signal<HubOnboardingStatus | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _initialized = signal(false);

  // Track which hub the cache belongs to
  private readonly _cachedHubId = signal<string | null>(null);

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly stats = this._stats.asReadonly();
  readonly serviceRequests = this._serviceRequests.asReadonly();
  readonly experienceBookings = this._experienceBookings.asReadonly();
  readonly onboardingStatus = this._onboardingStatus.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly initialized = this._initialized.asReadonly();

  // ============================================================================
  // Computed Signals
  // ============================================================================

  readonly totalEarnings = computed(() => this._stats()?.earnings.total ?? 0);
  readonly currency = computed(() => this._stats()?.earnings.currency ?? 'USD');
  readonly activeOrdersCount = computed(() => this._stats()?.orders.active ?? 0);
  readonly activeOrdersTotal = computed(() => this._stats()?.orders.totalValue ?? 0);

  readonly listingCounts = computed(() => ({
    services: this._stats()?.listings.services ?? 0,
    experiences: this._stats()?.listings.experiences ?? 0,
    gigs: this._stats()?.listings.gigs ?? 0,
    spaces: this._stats()?.listings.spaces ?? 0,
  }));

  readonly hasData = computed(() => this._stats() !== null);

  // Setup prompts based on onboarding status
  readonly setupPrompts = computed<SetupPrompt[]>(() => {
    const status = this._onboardingStatus();
    if (!status) return [];

    const prompts: SetupPrompt[] = [];

    if (!status.hasWorkExperience) {
      prompts.push({
        id: 'work-experience',
        title: 'Add a Work Experience',
        description: 'Show off your skills by displaying previous employment, past projects and any relevant accolades.',
        buttons: [{ label: 'Update Profile', link: '/hub/settings/profile' }],
        image: 'work-experience',
      });
    }

    if (!status.stripeVerified) {
      prompts.push({
        id: 'verify-identity',
        title: 'Verify your Identity on Stripe',
        description: 'Complete KYC protocols and setup your bank account to receive payments for your services.',
        buttons: [
          { label: 'Verify Identity', link: '/hub/settings/verification' },
          { label: 'Learn More', link: '/hub/help/verification' },
        ],
        image: 'verify-identity',
      });
    }

    if (!status.profileComplete) {
      prompts.push({
        id: 'hub-profile',
        title: 'Complete your Hub Profile',
        description: 'Add your business details, logo, and description to attract more clients.',
        buttons: [{ label: 'Complete Profile', link: '/hub/settings/profile' }],
        image: 'hub-profile',
      });
    }

    return prompts;
  });

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Load dashboard data - uses cache if available for current hub
   * Call this on component init
   */
  async loadDashboard(): Promise<void> {
    const currentHubId = this.authState.selectedHub()?.id;

    // If we have cached data for the current hub, use it
    if (this._initialized() && this._cachedHubId() === currentHubId) {
      return;
    }

    // Prevent concurrent calls (race condition when multiple components call this)
    if (this._loading()) {
      return;
    }

    // Clear cache if hub changed
    if (this._cachedHubId() !== currentHubId) {
      this.clearCache();
    }

    await this.fetchAllData();
  }

  /**
   * Force refresh all dashboard data from API
   */
  async refresh(): Promise<void> {
    await this.fetchAllData();
  }

  /**
   * Clear cached data
   */
  clearCache(): void {
    this._stats.set(null);
    this._serviceRequests.set([]);
    this._experienceBookings.set([]);
    this._onboardingStatus.set(null);
    this._initialized.set(false);
    this._cachedHubId.set(null);
    this._error.set(null);
  }

  /**
   * Dismiss a setup prompt (stored locally, not persisted to API)
   */
  dismissPrompt(promptId: string): void {
    // For now, we don't persist dismissed prompts
    // Could add localStorage or API call here later
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Check if user is collaborator only (no owner/admin role)
   */
  private isCollaboratorOnly(): boolean {
    const hasCollaboratorRole = this.authState.hasRole('collaborator');
    const hasOwnerRole = this.authState.hasRole('owner');
    const hasAdminRole = this.authState.hasRole('admin');
    return hasCollaboratorRole && !hasOwnerRole && !hasAdminRole;
  }

  private async fetchAllData(): Promise<void> {
    const hubId = this.authState.selectedHub()?.id;
    if (!hubId) {
      this._error.set('No hub selected');
      return;
    }

    this._loading.set(true);
    this._error.set(null);

    try {
      // For collaborators, only fetch onboarding status (skip stats and orders)
      if (this.isCollaboratorOnly()) {
        const onboarding = await this.fetchOnboardingStatus(hubId);
        if (onboarding) {
          this._onboardingStatus.set(onboarding);
        }
      } else {
        // Fetch all data in parallel for owners/admins
        const [stats, orders, onboarding] = await Promise.all([
          this.fetchStats(hubId),
          this.fetchOrders(hubId),
          this.fetchOnboardingStatus(hubId),
        ]);

        if (stats) {
          this._stats.set(stats);
        }

        if (orders) {
          this._serviceRequests.set(orders.serviceRequests);
          this._experienceBookings.set(orders.experienceBookings);
        }

        if (onboarding) {
          this._onboardingStatus.set(onboarding);
        }
      }

      this._cachedHubId.set(hubId);
      this._initialized.set(true);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      this._error.set('Failed to load dashboard data');
    } finally {
      this._loading.set(false);
    }
  }

  private async fetchStats(hubId: string): Promise<HubDashboardStats | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<HubDashboardStats>>(`${this.getApiUrl(hubId)}/stats`, {
          withCredentials: true,
        })
      );
      return response.success ? response.data ?? null : null;
    } catch {
      return null;
    }
  }

  private async fetchOrders(hubId: string): Promise<{
    serviceRequests: ServiceRequest[];
    experienceBookings: ExperienceBooking[];
  } | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<{
          serviceRequests: ServiceRequest[];
          experienceBookings: ExperienceBooking[];
        }>>(`${this.getApiUrl(hubId)}/orders`, {
          withCredentials: true,
        })
      );
      return response.success ? response.data ?? null : null;
    } catch {
      return null;
    }
  }

  private async fetchOnboardingStatus(hubId: string): Promise<HubOnboardingStatus | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<HubOnboardingStatus>>(`${this.getApiUrl(hubId)}/onboarding`, {
          withCredentials: true,
        })
      );
      return response.success ? response.data ?? null : null;
    } catch {
      return null;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  formatCurrency(value: number): string {
    return `${this.currency()} ${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}
