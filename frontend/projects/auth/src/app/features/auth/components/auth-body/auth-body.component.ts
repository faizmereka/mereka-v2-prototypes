import { Component, Input, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  Auth,
  UserCredential,
} from 'firebase/auth';

import { AuthBaseLayoutComponent } from '../auth-base-layout/auth-base-layout.component';
import { AuthBodyEmailComponent, AuthBodyEmailOutput } from '../auth-body-email/auth-body-email.component';
import { AuthBodySignInComponent } from '../auth-body-sign-in/auth-body-sign-in.component';
import { AuthBodySignUpComponent } from '../auth-body-sign-up/auth-body-sign-up.component';
import { AuthBodyOtpComponent } from '../auth-body-otp/auth-body-otp.component';
import { AuthBodyForgotPasswordComponent } from '../auth-body-forgot-password/auth-body-forgot-password.component';
import { AuthBodyUpdatePasswordComponent } from '../auth-body-update-password/auth-body-update-password.component';
import { AuthBodySetupPasswordComponent } from '../auth-body-setup-password/auth-body-setup-password.component';
import { LoaderSpinnerComponent } from '@mereka/ui';
import { AuthService, AuthError, RedirectService, UserType } from '../../../../core/services';
import { environment } from '../../../../../environments/environment';

export type AuthMode =
  | ''
  | 'email'
  | 'sign-in'
  | 'sign-up'
  | 'otp'
  | 'otp-setup'
  | 'forgot-password'
  | 'resetPassword'
  | 'setup-password';

export type AuthAsUser = 'learner' | 'hub';

/**
 * Auth Body Component
 * Main container for auth flow with multiple modes
 */
@Component({
  selector: 'auth-body',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    AuthBaseLayoutComponent,
    AuthBodyEmailComponent,
    AuthBodySignInComponent,
    AuthBodySignUpComponent,
    AuthBodyOtpComponent,
    AuthBodyForgotPasswordComponent,
    AuthBodyUpdatePasswordComponent,
    AuthBodySetupPasswordComponent,
    LoaderSpinnerComponent,
  ],
  template: `
    <auth-base-layout
      [variant]="asUser === 'hub' ? 'business' : 'default'"
      [showBack]="true"
      (back)="onBack()"
    >
      @switch (mode) {
        @case ('email') {
          <auth-body-email
            (continue)="onEmailContinue($event)"
            (back)="onBack()"
          />
        }
        @case ('otp') {
          <auth-body-otp
            [email]="email"
            [redirectUrl]="redirectUrl"
            [asUser]="asUser"
            (back)="mode = 'email'"
          />
        }
        @case ('otp-setup') {
          <auth-body-otp
            [email]="email"
            [redirectUrl]="redirectUrl"
            [asUser]="asUser"
            [forPasswordSetup]="true"
            (back)="mode = 'email'"
            (verified)="onOtpVerifiedForSetup()"
          />
        }
        @case ('sign-in') {
          <auth-body-sign-in
            [asUser]="asUser"
            [email]="email"
            [redirectUrl]="redirectUrl"
            (forgotPassword)="mode = 'forgot-password'"
          />
        }
        @case ('sign-up') {
          <auth-body-sign-up
            [asUser]="asUser"
            [email]="email"
            [redirectUrl]="redirectUrl"
          />
        }
        @case ('forgot-password') {
          <auth-body-forgot-password
            (back)="mode = 'sign-in'"
          />
        }
        @case ('resetPassword') {
          <auth-body-update-password
            [redirectUrl]="redirectUrl"
            [email]="email"
            [oobCode]="oobCode"
            [asUser]="asUser"
          />
        }
        @case ('setup-password') {
          <auth-body-setup-password
            [email]="email"
            [redirectUrl]="redirectUrl"
            [asUser]="asUser"
            [allowSkip]="false"
          />
        }
        @default {
          <!-- Social Login Options -->
          <div class="flex flex-col gap-3">
            @if (isLoading) {
              <div class="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
                <ui-loader-spinner size="lg"></ui-loader-spinner>
              </div>
            }

            <!-- Google Button -->
            <button
              type="button"
              [disabled]="isLoading"
              (click)="onContinueWith('Google')"
              class="w-full h-12 flex items-center justify-center gap-3 border border-[#DDDDDE] rounded-lg
                     bg-white text-primary font-medium
                     hover:border-gray-400 transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <!-- Facebook Button -->
            <button
              type="button"
              [disabled]="isLoading"
              (click)="onContinueWith('Facebook')"
              class="w-full h-12 flex items-center justify-center gap-3 border border-[#DDDDDE] rounded-lg
                     bg-white text-primary font-medium
                     hover:border-gray-400 transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continue with Facebook
            </button>

            <!-- Apple Button -->
            <button
              type="button"
              [disabled]="isLoading"
              (click)="onContinueWith('Apple')"
              class="w-full h-12 flex items-center justify-center gap-3 border border-[#DDDDDE] rounded-lg
                     bg-white text-primary font-medium
                     hover:border-gray-400 transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Continue with Apple
            </button>

            @if (errorMessage) {
              <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 text-center">
                {{ errorMessage }}
              </div>
            }

            <!-- OR Separator -->
            <div class="flex items-center gap-3">
              <div class="flex-1 h-px bg-[#DDDDDE]"></div>
              <span class="text-xs font-bold text-primary uppercase">OR</span>
              <div class="flex-1 h-px bg-[#DDDDDE]"></div>
            </div>

            <!-- Email Button -->
            <button
              type="button"
              (click)="onContinueWithEmail()"
              class="w-full h-12 flex items-center justify-center gap-3 border border-[#DDDDDE] rounded-lg
                     bg-white text-primary font-medium
                     hover:border-gray-400 transition-all"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              Continue with Email
            </button>
          </div>

          <!-- Footer -->
          <div class="flex flex-col items-center gap-8 mt-8 text-sm text-primary">
            <p class="text-center">
              By continuing, you accept our
              <a href="https://legal.mereka.io/" target="_blank" class="underline underline-offset-2">terms of use</a>
              and
              <a href="https://legal.mereka.io/#privacy-policy" target="_blank" class="underline underline-offset-2">privacy policy</a>
            </p>

            @if (asUser === 'learner') {
              <div class="w-[150px] h-px bg-[#DDDDDE]"></div>
              <button
                type="button"
                [routerLink]="['/']"
                [queryParams]="{'as-user': 'hub'}"
                class="w-full h-12 rounded-lg font-medium text-white transition-all"
                style="background: linear-gradient(90deg, #FD87A5 0%, #EE53B1 100%)"
              >
                Connect as Business
              </button>
            }
          </div>
        }
      }
    </auth-base-layout>
  `,
})
export class AuthBodyComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly redirectService = inject(RedirectService);

  private firebaseApp: FirebaseApp;
  private firebaseAuth: Auth;

  @Input() asUser: AuthAsUser = 'learner';
  @Input() mode: AuthMode = '';
  @Input() redirectUrl = '';
  @Input() oobCode = '';
  @Input() initialEmail = '';

  email = '';
  isLoading = false;
  errorMessage = '';

  constructor() {
    // Initialize Firebase
    this.firebaseApp = initializeApp(environment.firebase);
    this.firebaseAuth = getAuth(this.firebaseApp);
  }

  ngOnInit(): void {
    this.email = this.initialEmail;
    this.validateGuards();
  }

  private validateGuards(): void {
    // Reset if required data is missing
    // Instead of full reset, just show email entry to preserve redirectUrl
    if (this.mode === 'sign-in' && !this.email) this.softReset();
    if (this.mode === 'otp' && !this.email) this.softReset();
    if (this.mode === 'sign-up' && !this.email) this.softReset();
    if (this.mode === 'resetPassword' && (!this.oobCode || !this.email)) this.reset();
  }

  /**
   * Soft reset - just change mode without losing redirectUrl
   */
  private softReset(): void {
    this.mode = '';
    this.email = '';
  }

  /**
   * Full reset - navigate to root preserving important query params
   */
  private reset(): void {
    // Preserve redirect URL and other params when resetting
    const queryParams: Record<string, string> = {};
    if (this.redirectUrl && this.redirectUrl !== '/') {
      queryParams['redirect'] = this.redirectUrl;
    }
    if (this.asUser && this.asUser !== 'learner') {
      queryParams['as-user'] = this.asUser;
    }

    if (Object.keys(queryParams).length > 0) {
      this.router.navigate(['/'], { queryParams });
    } else {
      this.router.navigateByUrl('/');
    }
    this.mode = '';
    this.email = '';
  }

  onBack(): void {
    switch (this.mode) {
      case '':
        this.redirectService.redirectAfterAuth(this.redirectUrl, this.asUser);
        break;
      case 'email':
        // Go back to social login options, preserve redirectUrl
        this.softReset();
        break;
      case 'sign-in':
      case 'otp':
      case 'otp-setup':
      case 'sign-up':
        this.mode = 'email';
        break;
      case 'forgot-password':
        this.mode = 'sign-in';
        break;
      case 'resetPassword':
      case 'setup-password':
        this.reset();
        break;
      default:
        this.redirectService.redirectAfterAuth(this.redirectUrl, this.asUser);
    }
  }

  async onContinueWith(provider: 'Google' | 'Facebook' | 'Apple'): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      let authProvider;

      switch (provider) {
        case 'Google':
          authProvider = new GoogleAuthProvider();
          authProvider.addScope('email');
          authProvider.addScope('profile');
          break;
        case 'Facebook':
          authProvider = new FacebookAuthProvider();
          authProvider.addScope('email');
          authProvider.addScope('public_profile');
          break;
        case 'Apple':
          authProvider = new OAuthProvider('apple.com');
          authProvider.addScope('email');
          authProvider.addScope('name');
          break;
      }

      // Sign in with Firebase popup
      const result: UserCredential = await signInWithPopup(this.firebaseAuth, authProvider);

      // Get Firebase ID token
      const firebaseToken = await result.user.getIdToken();

      // Send token to backend for authentication
      await this.authService.loginSocial(firebaseToken);

      // Redirect after successful login
      this.redirectService.redirectAfterAuth(this.redirectUrl, this.asUser);
    } catch (error) {
      if (error instanceof AuthError) {
        this.errorMessage = error.message;
      } else if ((error as { code?: string }).code === 'auth/popup-closed-by-user') {
        // User closed popup, no error message needed
        this.errorMessage = '';
      } else if ((error as { code?: string }).code === 'auth/cancelled-popup-request') {
        // Another popup was opened, no error message needed
        this.errorMessage = '';
      } else {
        this.errorMessage = 'Failed to sign in. Please try again.';
      }
    } finally {
      this.isLoading = false;
    }
  }

  onContinueWithEmail(): void {
    this.mode = 'email';
  }

  onEmailContinue(data: AuthBodyEmailOutput): void {
    this.email = data.email;

    if (data.method === 'otp') {
      this.mode = 'otp';
    } else if (data.method === 'setup-password') {
      // User needs to set up password - go through OTP verification first
      this.mode = 'otp-setup';
    } else if (data.method === 'sign-up') {
      // User doesn't exist - go to registration
      this.mode = 'sign-up';
    } else {
      // User has password - go to sign in
      this.mode = 'sign-in';
    }
  }

  onOtpVerifiedForSetup(): void {
    // OTP verified, now user can set up their password
    this.mode = 'setup-password';
  }
}
