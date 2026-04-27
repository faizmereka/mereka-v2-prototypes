import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'superAdmin' | 'platformAdmin';
  status: string;
  mfaEnabled: boolean;
  requirePasswordChange: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  success: boolean;
  data: {
    admin: AdminUser;
    tokens: AuthTokens;
    requiresMfa?: boolean;
  };
  message: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

/**
 * Auth Service - Secure authentication handling
 *
 * Security approach:
 * 1. Tokens stored in httpOnly cookies (set by backend, not accessible via JS)
 * 2. User info stored in memory only (signals)
 * 3. On app load, call /me to verify auth and get user info
 * 4. No sensitive data in localStorage
 *
 * Token refresh flow:
 * 1. Access token expires (1 hour)
 * 2. HTTP interceptor catches 401 and calls refreshToken()
 * 3. If refresh succeeds, retry the failed request
 * 4. If refresh fails (refresh token expired - 24 hours), redirect to login
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/admin/auth`;

  // In-memory state only - no localStorage for sensitive data
  private _currentAdmin = signal<AdminUser | null>(null);
  private _isAuthenticated = signal<boolean>(false);
  private _isLoading = signal<boolean>(false);
  private _isInitialized = signal<boolean>(false);
  private _sessionExpired = signal<boolean>(false);

  // Public read-only signals
  readonly currentAdmin = this._currentAdmin.asReadonly();
  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isInitialized = this._isInitialized.asReadonly();
  readonly sessionExpired = this._sessionExpired.asReadonly();

  // Computed values
  readonly adminName = computed(() => this._currentAdmin()?.name || '');
  readonly adminEmail = computed(() => this._currentAdmin()?.email || '');
  readonly adminRole = computed(() => this._currentAdmin()?.role || '');

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  /**
   * Initialize auth state on app startup
   * Call this from APP_INITIALIZER
   */
  async initialize(): Promise<void> {
    if (this._isInitialized()) {
      return;
    }

    try {
      // Try to get current admin from /me endpoint
      // This validates the httpOnly cookie token
      const admin = await this.fetchCurrentAdmin();

      if (admin) {
        this._currentAdmin.set(admin);
        this._isAuthenticated.set(true);
      }
    } catch {
      // Not authenticated - that's OK on first load
      this._currentAdmin.set(null);
      this._isAuthenticated.set(false);
    } finally {
      this._isInitialized.set(true);
    }
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string, mfaCode?: string): Promise<LoginResponse> {
    this._isLoading.set(true);
    // Clear session expired flag on new login attempt
    this._sessionExpired.set(false);

    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(
          `${this.API_URL}/login`,
          { email, password, mfaCode },
          { withCredentials: true } // Send/receive cookies
        )
      );

      if (response.success && response.data.admin) {
        // Store admin in memory
        this._currentAdmin.set(response.data.admin);
        this._isAuthenticated.set(true);
      }

      return response;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Refresh access token
   * Called by HTTP interceptor when access token expires
   * Returns true if refresh succeeded, false if both tokens expired
   */
  async refreshToken(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; data: { tokens: AuthTokens } }>(
          `${this.API_URL}/refresh`,
          {},
          { withCredentials: true }
        )
      );

      return response?.success || false;
    } catch {
      // Don't clear auth here - let interceptor handle the flow
      return false;
    }
  }

  /**
   * Fetch current admin from /me endpoint
   */
  private async fetchCurrentAdmin(): Promise<AdminUser | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ success: boolean; data: AdminUser }>(
          `${this.API_URL}/me`,
          { withCredentials: true }
        )
      );

      return response?.success ? response.data : null;
    } catch {
      return null;
    }
  }

  /**
   * Get current admin (refreshes from API)
   */
  async getMe(): Promise<AdminUser | null> {
    const admin = await this.fetchCurrentAdmin();

    if (admin) {
      this._currentAdmin.set(admin);
      this._isAuthenticated.set(true);
    } else {
      this.clearAuthState();
    }

    return admin;
  }

  /**
   * Logout - calls API to clear cookies
   */
  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.API_URL}/logout`, {}, { withCredentials: true })
      );
    } catch {
      // Ignore logout errors - cookies will expire anyway
    } finally {
      this.clearAuthState();
      this.router.navigate(['/login']);
    }
  }

  /**
   * Clear auth state (memory only)
   * Public so interceptor can call it on session expiry
   */
  clearAuthState(): void {
    this._currentAdmin.set(null);
    this._isAuthenticated.set(false);
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
   * Call this when showing the message to user
   */
  clearSessionExpired(): void {
    this._sessionExpired.set(false);
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this._isAuthenticated();
  }
}
