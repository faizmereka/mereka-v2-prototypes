import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LoaderSpinnerComponent } from '@mereka/ui';
import { environment } from '../../../../../environments/environment';
import { firstValueFrom } from 'rxjs';

type VerificationState = 'loading' | 'success' | 'already_verified' | 'error' | 'invalid';

interface VerifyResponse {
  success: boolean;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Verify Email Page
 * Handles email verification link from registration
 */
@Component({
  selector: 'verify-email-page',
  standalone: true,
  imports: [CommonModule, LoaderSpinnerComponent],
  templateUrl: './verify-email.page.html',
})
export class VerifyEmailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  readonly state = signal<VerificationState>('loading');
  readonly errorMessage = signal<string>('');

  readonly appUrl = environment.appUrls.app;
  readonly webUrl = environment.appUrls.web;

  async ngOnInit(): Promise<void> {
    // Get token from query params
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.state.set('invalid');
      return;
    }

    await this.verifyEmail(token);
  }

  private async verifyEmail(token: string): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<VerifyResponse>(
          `${environment.apiUrl}/auth/verify-email?token=${encodeURIComponent(token)}`,
          { withCredentials: true }
        )
      );

      if (response.success) {
        if (response.message?.includes('already verified')) {
          this.state.set('already_verified');
        } else {
          this.state.set('success');
        }
      } else {
        this.errorMessage.set(response.error?.message || 'Verification failed');
        this.state.set('error');
      }
    } catch (error) {
      const errorObj = error as { error?: { error?: { message?: string } } };
      this.errorMessage.set(
        errorObj?.error?.error?.message || 'Invalid or expired verification link'
      );
      this.state.set('error');
    }
  }

  goToApp(): void {
    window.location.href = `${this.appUrl}/dashboard`;
  }

  goToHome(): void {
    window.location.href = this.webUrl;
  }

  resendVerification(): void {
    // Redirect to app where they can resend from the banner
    window.location.href = `${this.appUrl}/dashboard`;
  }
}
