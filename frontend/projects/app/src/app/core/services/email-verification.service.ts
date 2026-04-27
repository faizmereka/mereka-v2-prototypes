import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Email Verification Service
 * Handles resending verification emails
 */
@Injectable({ providedIn: 'root' })
export class EmailVerificationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _success = signal(false);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly success = this._success.asReadonly();

  /**
   * Resend verification email to the current user
   */
  async resendVerificationEmail(): Promise<boolean> {
    this._loading.set(true);
    this._error.set(null);
    this._success.set(false);

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse>(
          `${this.apiUrl}/resend-verification`,
          {},
          { withCredentials: true }
        )
      );

      if (response.success) {
        this._success.set(true);
        return true;
      } else {
        this._error.set(response.error?.message || 'Failed to send verification email');
        return false;
      }
    } catch (error) {
      const errorObj = error as { error?: { error?: { message?: string } } };
      this._error.set(
        errorObj?.error?.error?.message || 'Failed to send verification email'
      );
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Reset state
   */
  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._success.set(false);
  }
}
