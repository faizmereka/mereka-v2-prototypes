import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// ============================================================================
// Types
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  birthDate?: string;
  status: string;
  emailVerified: boolean;
  profilePhoto?: string;
  bio?: string;
  phoneNumber?: string;
  authProviders: string[];
  lastLoginAt?: string;
}

export interface HubLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  lat?: number;
  lng?: number;
}

export interface HubInfo {
  id: string;
  name: string;
  logo: string | null;
  slug: string;
  location?: HubLocation | null;
  stripeAccountId?: string | null;
  currency?: string | null;
}

export interface HubSubscriptionInfo {
  hasActiveSubscription: boolean;
  requiresPlanSelection: boolean;
  planCode?: string;
  planName?: string;
  status?: string;
}

export interface HubListItem {
  hubId: string;
  hubName: string;
  hubLogo: string | null;
  hubSlug: string;
  hubLocation?: HubLocation | null;
  stripeAccountId?: string | null;
  currency?: string | null;
  // When includePermissions=true without specific hubId, these are included
  roles?: RoleInfo[];
  permissions?: string[];
  // When includeSubscription=true, this is included
  subscription?: HubSubscriptionInfo;
}

export interface RoleInfo {
  key: string;
  name: string;
}

export interface MeResponse {
  id: string;
  email: string;
  name: string;
  birthDate?: string;
  status: string;
  emailVerified: boolean;
  profilePhoto?: string;
  bio?: string;
  phoneNumber?: string;
  authProviders: string[];
  lastLoginAt?: string;
  // All hubs (when includeHubs=true or includePermissions=true)
  // When includePermissions=true, each hub includes roles and permissions
  hubs?: HubListItem[];
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
// Auth State Service
// ============================================================================

/**
 * Auth State Service - Handles authentication state and token refresh
 *
 * Security approach:
 * 1. Tokens stored in httpOnly cookies (set by backend, not accessible via JS)
 * 2. User info stored in memory only (signals)
 * 3. On app load, call /me to verify auth and get user info
 * 4. HTTP interceptor handles 401 errors and calls refreshToken()
 */
@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _user = signal<AuthUser | null>(null);
  private readonly _selectedHub = signal<HubInfo | null>(null);
  private readonly _selectedHubSubscription = signal<HubSubscriptionInfo | null>(null);
  private readonly _roles = signal<RoleInfo[]>([]);
  private readonly _permissions = signal<string[]>([]);
  private readonly _hubs = signal<HubListItem[]>([]);
  private readonly _loading = signal(false);
  private readonly _initialized = signal(false);
  private readonly _sessionExpired = signal(false);

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly user = this._user.asReadonly();
  readonly selectedHub = this._selectedHub.asReadonly();
  readonly selectedHubSubscription = this._selectedHubSubscription.asReadonly();
  readonly roles = this._roles.asReadonly();
  readonly permissions = this._permissions.asReadonly();
  readonly hubs = this._hubs.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly initialized = this._initialized.asReadonly();
  readonly sessionExpired = this._sessionExpired.asReadonly();

  // ============================================================================
  // Computed Signals
  // ============================================================================

  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isHubSelected = computed(() => this._selectedHub() !== null);
  readonly userName = computed(() => this._user()?.name || '');
  readonly userEmail = computed(() => this._user()?.email || '');
  readonly userProfilePhoto = computed(() => this._user()?.profilePhoto || null);

  // Subscription-related computed signals
  readonly hasActiveSubscription = computed(
    () => this._selectedHubSubscription()?.hasActiveSubscription ?? false
  );
  readonly requiresPlanSelection = computed(
    () => this._selectedHubSubscription()?.requiresPlanSelection ?? true
  );

  // ============================================================================
  // Cookie Helpers
  // ============================================================================

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  /**
   * Get the cookie domain for cross-subdomain sharing
   * Returns .mereka.dev or .mereka.io to allow sharing between
   * v2.mereka.dev, v2.app.mereka.dev, etc.
   */
  private getCookieDomain(): string {
    const hostname = window.location.hostname;
    // For localhost, set domain=localhost to share across ports
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'localhost';
    }
    // For mereka.dev or mereka.io, use .mereka.dev or .mereka.io
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return '.' + parts.slice(-2).join('.');
    }
    return hostname;
  }

  private setCookie(name: string, value: string, days = 30): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    const domain = this.getCookieDomain();
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;domain=${domain};SameSite=Lax`;
  }

  private deleteCookie(name: string): void {
    const domain = this.getCookieDomain();
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${domain}`;
  }

  // ============================================================================
  // Token Refresh Methods
  // ============================================================================

  /**
   * Refresh access token
   * Called by HTTP interceptor when access token expires
   * Returns true if refresh succeeded, false if both tokens expired
   */
  async refreshToken(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; data: { tokens: { accessToken: string; refreshToken: string; }; }; }>(
          `${this.apiUrl}/auth/refresh`,
          {},
          { withCredentials: true }
        )
      );

      return response?.success || false;
    } catch {
      return false;
    }
  }

  /**
   * Set session expired flag
   * Called by interceptor when both tokens expire
   */
  setSessionExpired(expired: boolean): void {
    this._sessionExpired.set(expired);
  }

  /**
   * Clear session expired flag
   */
  clearSessionExpired(): void {
    this._sessionExpired.set(false);
  }

  /**
   * Handle session expiration - redirects to auth app
   */
  handleSessionExpired(): void {
    this.setSessionExpired(true);
    this.clearState();
    // Redirect to auth app login
    window.location.href = `${environment.authUrl}/login?redirect=${encodeURIComponent(window.location.href)}`;
  }

  // ============================================================================
  // Public Methods
  // ============================================================================

  /**
   * Initialize auth state - call this on app startup
   * Fetches current user from /me API with all hubs and their permissions
   * Uses selectedHubId cookie to determine which hub to activate
   * Falls back to first hub if no cookie exists
   */
  async initialize(options: { includePermissions?: boolean; includeSubscription?: boolean; } = {}): Promise<void> {
    if (this._initialized()) {
      return;
    }

    this._loading.set(true);
    const { includePermissions = true, includeSubscription = true } = options;

    try {
      // Fetch user with all hubs, permissions, and subscription info
      const meData = await this.fetchMe({
        includeHubs: !includePermissions, // Only needed if not including permissions
        includePermissions,
        includeSubscription,
      });

      if (meData) {
        // Set user data
        this._user.set({
          id: meData.id,
          email: meData.email,
          name: meData.name,
          birthDate: meData.birthDate,
          status: meData.status,
          emailVerified: meData.emailVerified,
          profilePhoto: meData.profilePhoto,
          bio: meData.bio,
          phoneNumber: meData.phoneNumber,
          authProviders: meData.authProviders,
          lastLoginAt: meData.lastLoginAt,
        });

        // Set hubs list (includes roles and permissions when includePermissions=true)
        if (meData.hubs) {
          this._hubs.set(meData.hubs);

          // Select hub based on cookie or default to first hub
          const selectedHubIdFromCookie = this.getCookie('selectedHubId');
          const hubToSelect = selectedHubIdFromCookie
            ? meData.hubs.find((h) => h.hubId === selectedHubIdFromCookie) || meData.hubs[0]
            : meData.hubs[0];

          if (hubToSelect) {
            this.setSelectedHubFromList(hubToSelect);
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth state:', error);
      this.clearState();
    } finally {
      this._loading.set(false);
      this._initialized.set(true);
    }
  }

  /**
   * Set selected hub from a hub list item (internal helper)
   */
  private setSelectedHubFromList(hub: HubListItem): void {
    this._selectedHub.set({
      id: hub.hubId,
      name: hub.hubName,
      logo: hub.hubLogo,
      slug: hub.hubSlug,
      location: hub.hubLocation || null,
      stripeAccountId: hub.stripeAccountId || null,
      currency: hub.currency || null,
    });
    this._roles.set(hub.roles || []);
    this._permissions.set(hub.permissions || []);
    this._selectedHubSubscription.set(hub.subscription || null);
    this.setCookie('selectedHubId', hub.hubId);
  }

  /**
   * Refresh auth state - call after login
   * Refetches all hubs with permissions and subscription info, maintains current hub selection
   */
  async refresh(): Promise<void> {
    this._loading.set(true);

    try {
      const currentHubId = this._selectedHub()?.id;

      const meData = await this.fetchMe({
        includePermissions: true,
        includeSubscription: true,
      });

      if (meData) {
        this._user.set({
          id: meData.id,
          email: meData.email,
          name: meData.name,
          birthDate: meData.birthDate,
          status: meData.status,
          emailVerified: meData.emailVerified,
          profilePhoto: meData.profilePhoto,
          bio: meData.bio,
          phoneNumber: meData.phoneNumber,
          authProviders: meData.authProviders,
          lastLoginAt: meData.lastLoginAt,
        });

        if (meData.hubs) {
          this._hubs.set(meData.hubs);

          // Maintain current hub selection or fall back to first hub
          const hubToSelect = currentHubId
            ? meData.hubs.find((h) => h.hubId === currentHubId) || meData.hubs[0]
            : meData.hubs[0];

          if (hubToSelect) {
            this.setSelectedHubFromList(hubToSelect);
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh auth state:', error);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Select a hub - switches to a different hub from the stored list
   * No API call needed - permissions are already in the hubs list
   */
  selectHub(hubId: string): void {
    const hub = this._hubs().find((h) => h.hubId === hubId);
    if (hub) {
      this.setSelectedHubFromList(hub);
    }
  }

  /**
   * Clear selected hub
   */
  clearSelectedHub(): void {
    this.deleteCookie('selectedHubId');
    this._selectedHub.set(null);
    this._roles.set([]);
    this._permissions.set([]);
    this._selectedHubSubscription.set(null);
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permissionKey: string): boolean {
    return this._permissions().includes(permissionKey);
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(permissionKeys: string[]): boolean {
    return permissionKeys.some((key) => this._permissions().includes(key));
  }

  /**
   * Check if user has all of the specified permissions
   */
  hasAllPermissions(permissionKeys: string[]): boolean {
    return permissionKeys.every((key) => this._permissions().includes(key));
  }

  /**
   * Check if user has a specific role
   */
  hasRole(roleKey: string): boolean {
    return this._roles().some((role) => role.key === roleKey);
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roleKeys: string[]): boolean {
    return roleKeys.some((key) => this._roles().some((role) => role.key === key));
  }

  /**
   * Logout user - calls API to revoke tokens, clears state, and redirects to main page
   * Similar to old mereka-web logoutUser behavior
   */
  async logout(): Promise<void> {
    try {
      // Call logout API to revoke refresh token and clear cookies
      await firstValueFrom(
        this.http.post<ApiResponse<unknown>>(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true })
      );
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
    }

    // Clear all state (like old version)
    this.clearState();

    // Clear localStorage (like old version)
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    // Redirect to main page (like old version navigated to hubExpSpcSsr.baseUrl)
    // Redirect to web app home page
    const redirectUrl = environment.webUrl || environment.appUrl || window.location.origin;
    window.location.href = redirectUrl;
  }

  /**
   * Clear all auth state - call on logout
   */
  clearState(): void {
    this._user.set(null);
    this._selectedHub.set(null);
    this._selectedHubSubscription.set(null);
    this._roles.set([]);
    this._permissions.set([]);
    this._hubs.set([]);
    this.deleteCookie('selectedHubId');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async fetchMe(options: {
    includeHubs?: boolean;
    includePermissions?: boolean;
    includeSubscription?: boolean;
  } = {}): Promise<MeResponse | null> {
    const { includeHubs = false, includePermissions = false, includeSubscription = false } = options;

    const params = new URLSearchParams();
    params.set('includeHubs', String(includeHubs));
    params.set('includePermissions', String(includePermissions));
    params.set('includeSubscription', String(includeSubscription));

    const url = `${this.apiUrl}/auth/me?${params.toString()}`;

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<MeResponse>>(url, {
          withCredentials: true,
        })
      );

      if (!response.success || !response.data) {
        return null;
      }

      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Get permissions for a specific hub from the stored hubs list
   * Useful when you need to check permissions for a hub other than the selected one
   */
  getHubPermissions(hubId: string): string[] {
    const hub = this._hubs().find((h) => h.hubId === hubId);
    return hub?.permissions || [];
  }

  /**
   * Get roles for a specific hub from the stored hubs list
   */
  getHubRoles(hubId: string): RoleInfo[] {
    const hub = this._hubs().find((h) => h.hubId === hubId);
    return hub?.roles || [];
  }
}
