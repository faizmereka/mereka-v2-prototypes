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
  phoneNumber?: string;
  countryCode?: string;
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
  private readonly _isLoading = signal(false);
  private readonly _isInitialized = signal(false);

  readonly user = this._user.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isInitialized = this._isInitialized.asReadonly();
  readonly isLoggedIn = () => !!this._user();

  /**
   * Initialize auth state - only runs in browser
   */
  async init(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this._isInitialized()) {
      return;
    }

    this._isInitialized.set(true);
    this._isLoading.set(true);

    try {
      const user = await this.getMe();
      this._user.set(user);
    } catch {
      this._user.set(null);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Get current authenticated user
   */
  async getMe(): Promise<AuthUser | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse<AuthUser>>(`${this.apiUrl}/auth/me`, {
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
   */
  async refreshToken(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<{ accessToken: string }>>(
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
   * Clear auth state
   */
  clearAuthState(): void {
    this._user.set(null);
  }

  /**
   * Redirect to login
   */
  redirectToLogin(returnUrl?: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const loginUrl = new URL(environment.appUrls.auth);
    if (returnUrl) {
      loginUrl.searchParams.set('redirect', returnUrl);
    } else {
      loginUrl.searchParams.set('redirect', window.location.href);
    }
    window.location.href = loginUrl.toString();
  }
}
