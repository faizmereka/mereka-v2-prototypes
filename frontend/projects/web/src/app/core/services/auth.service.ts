import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  profilePhoto?: string;
  authProviders: string[];
  hubs?: AuthHub[];
}

export interface AuthHub {
  hubId: string;
  hubName: string;
  hubLogo: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = environment.apiUrl;

  // Signals for reactive state
  private readonly _user = signal<AuthUser | null>(null);
  private readonly _hubs = signal<AuthHub[]>([]);
  private readonly _isLoading = signal(false);
  private readonly _isInitialized = signal(false);

  readonly user = this._user.asReadonly();
  readonly hubs = this._hubs.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isInitialized = this._isInitialized.asReadonly();
  readonly isLoggedIn = () => !!this._user();

  /**
   * Initialize auth state - only runs in browser
   */
  async init(includeHubs = true): Promise<void> {
    // Skip during SSR
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this._isInitialized()) {
      return;
    }

    this._isLoading.set(true);

    try {
      const user = await this.getMe(includeHubs);
      this._user.set(user);
      if (user?.hubs) {
        this._hubs.set(user.hubs);
      }
    } catch {
      this._user.set(null);
      this._hubs.set([]);
    } finally {
      this._isLoading.set(false);
      this._isInitialized.set(true);  // Only set after user data is loaded
    }
  }

  /**
   * Get current authenticated user
   * @param includeHubs - Whether to include user's hubs in the response
   * Returns null if not authenticated
   */
  async getMe(includeHubs = false): Promise<AuthUser | null> {
    const url = includeHubs
      ? `${this.apiUrl}/auth/me?includeHubs=true`
      : `${this.apiUrl}/auth/me`;

    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<AuthUser>>(url, {
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
   * Refresh access token
   * Called by HTTP interceptor when access token expires
   * Returns true if refresh succeeded, false if both tokens expired
   */
  async refreshToken(): Promise<boolean> {
    // Skip during SSR
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    const url = `${this.apiUrl}/auth/refresh`;

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<{ accessToken: string }>>(
          url,
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
   * Clear auth state (memory only)
   * Public so interceptor can call it on session expiry
   */
  clearAuthState(): void {
    this._user.set(null);
  }

  /**
   * Logout - call API to clear cookies and invalidate refresh token
   */
  async logout(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const url = `${this.apiUrl}/auth/logout`;

    try {
      await firstValueFrom(
        this.http.post(url, {}, { withCredentials: true })
      );
    } catch {
      // Ignore errors - cookies will expire anyway
    }

    // Clear local state
    this.clearAuthState();

    // Reload page to reflect logged out state
    window.location.reload();
  }
}
