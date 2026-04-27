import { Component, EventEmitter, Output, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoaderSpinnerComponent } from '@mereka/ui';
import { AuthService, AuthError } from '../../../../core/services';

export type AuthMethod = 'otp' | 'password' | 'setup-password' | 'sign-up';

export interface AuthBodyEmailOutput {
  email: string;
  method: AuthMethod;
  needsPasswordSetup?: boolean;
}

@Component({
  selector: 'auth-body-email',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoaderSpinnerComponent],
  template: `
    @if (!showOptions) {
      <!-- Email Input Screen -->
      <form [formGroup]="formGroup" (ngSubmit)="onEmailSubmit()" class="flex flex-col gap-3">
        <!-- Hidden password field for autocomplete -->
        <div class="hidden">
          <label for="password">Password</label>
          <input id="password" type="password" autocomplete="current-password" />
        </div>

        <!-- Email Field -->
        <div class="flex flex-col gap-1">
          <label for="email" class="text-sm text-primary">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            formControlName="email"
            autocomplete="email"
            placeholder="Email"
            class="w-full py-3 px-4 text-base border rounded-lg transition-all
                   border-[#DDDDDE] bg-white text-primary
                   placeholder:text-[#7B7B7C]
                   focus:outline-none focus:border-primary"
            [class.border-[#D44333]]="(email?.dirty && email?.errors) || errorMessage"
            [class.bg-[#FDF0EF]]="(email?.dirty && email?.errors) || errorMessage"
          />
          @if (email?.dirty && email?.errors) {
            <div class="text-xs text-[#D44333]">
              @if (email?.errors?.['required']) {
                <span>Email is required</span>
              } @else if (email?.errors?.['email']) {
                <span>Email is invalid</span>
              }
            </div>
          }
          @if (errorMessage) {
            <div class="text-xs text-[#D44333]">
              {{ errorMessage }}
            </div>
          }
        </div>

        <!-- Continue Button -->
        <button
          type="submit"
          [disabled]="!formGroup.valid || isCheckingEmail"
          class="w-full h-12 rounded-lg font-medium text-white
                 bg-primary hover:bg-primary/90 transition-all
                 disabled:opacity-50 disabled:cursor-not-allowed
                 flex items-center justify-center gap-2"
        >
          @if (isCheckingEmail) {
            <ui-loader-spinner color="white" size="sm"></ui-loader-spinner>
            Checking...
          } @else {
            Continue
          }
        </button>

        @if (formGroup.valid) {
          <button
            type="button"
            (click)="back.emit()"
            class="w-full h-12 rounded-lg font-medium text-primary
                   border border-[#DDDDDE] bg-white
                   hover:border-gray-400 transition-all"
          >
            Back
          </button>
        }
      </form>
    } @else {
      <!-- Auth Method Selection Screen -->
      <div class="flex flex-col gap-4">
        <div class="text-center">
          <h2 class="text-xl font-semibold text-primary">How would you like to sign in?</h2>
          <p class="mt-2 text-sm text-gray-500">
            Signing in as <strong class="text-primary">{{ email?.value }}</strong>
          </p>
        </div>

        <div class="flex flex-col gap-3 mt-2">
          <!-- OTP Option -->
          <button
            type="button"
            [disabled]="isLoading"
            (click)="onSelectMethod('otp')"
            class="w-full py-4 px-4 rounded-lg font-medium text-white
                   bg-primary hover:bg-primary/90 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-3"
          >
            @if (isLoading && selectedMethod === 'otp') {
              <ui-loader-spinner color="white" size="sm"></ui-loader-spinner>
              Sending code...
            } @else {
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              Email me a one-time code
            }
          </button>

          <!-- Password Option -->
          <button
            type="button"
            [disabled]="isLoading"
            (click)="onSelectMethod('password')"
            class="w-full py-4 px-4 rounded-lg font-medium text-primary
                   border border-[#DDDDDE] bg-white
                   hover:border-gray-400 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-3"
          >
            @if (isLoading && selectedMethod === 'password') {
              <ui-loader-spinner color="primary" size="sm"></ui-loader-spinner>
              Checking...
            } @else {
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              Use password
            }
          </button>
        </div>

        @if (errorMessage) {
          <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 text-center">
            {{ errorMessage }}
          </div>
        }

        <!-- Change Email -->
        <button
          type="button"
          [disabled]="isLoading"
          (click)="onChangeEmail()"
          class="text-sm text-primary hover:underline self-center mt-2
                 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Use a different email
        </button>
      </div>
    }
  `,
})
export class AuthBodyEmailComponent {
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Output() back = new EventEmitter<void>();
  @Output() continue = new EventEmitter<AuthBodyEmailOutput>();

  formGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  showOptions = false;
  isLoading = false;
  errorMessage = '';
  selectedMethod: AuthMethod | null = null;
  isCheckingEmail = false;

  get email() {
    return this.formGroup.get('email');
  }

  async onEmailSubmit(): Promise<void> {
    if (!this.email?.value) {
      return;
    }
    this.errorMessage = '';
    this.isCheckingEmail = true;

    try {
      // Check if user exists in the database
      console.log('[Auth] Checking email:', this.email.value);
      const emailStatus = await this.authService.checkEmail(this.email.value);
      console.log('[Auth] Email status:', emailStatus);

      if (!emailStatus.exists) {
        // User doesn't exist - redirect to sign up directly
        console.log('[Auth] User does not exist, redirecting to sign-up');
        this.continue.emit({ email: this.email.value, method: 'sign-up' });
      } else {
        // User exists - show auth method options
        console.log('[Auth] User exists, showing options');
        this.showOptions = true;
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('[Auth] Error checking email:', error);
      // Check for AuthError by name (more reliable than instanceof across module boundaries)
      const isAuthError = error instanceof AuthError || (error as Error)?.name === 'AuthError';
      if (isAuthError) {
        this.errorMessage = (error as AuthError).message;
      } else {
        const err = error as { message?: string };
        this.errorMessage = err?.message || 'Failed to check email. Please try again.';
      }
    } finally {
      this.isCheckingEmail = false;
      this.cdr.detectChanges();
      console.log('[Auth] Done checking, isCheckingEmail:', this.isCheckingEmail, 'showOptions:', this.showOptions);
    }
  }

  onChangeEmail(): void {
    this.showOptions = false;
    this.errorMessage = '';
    this.selectedMethod = null;
  }

  async onSelectMethod(method: AuthMethod): Promise<void> {
    if (!this.email?.value) {
      return;
    }

    this.selectedMethod = method;
    this.errorMessage = '';

    if (method === 'otp') {
      // Send OTP first, then emit
      this.isLoading = true;
      try {
        await this.authService.sendOtp(this.email.value);
        this.continue.emit({ email: this.email.value, method: 'otp' });
      } catch (error) {
        // Check for AuthError by name (more reliable than instanceof across module boundaries)
        const isAuthError = error instanceof AuthError || (error as Error)?.name === 'AuthError';
        if (isAuthError) {
          this.errorMessage = (error as AuthError).message;
        } else {
          const err = error as { message?: string };
          this.errorMessage = err?.message || 'Failed to send code. Please try again.';
        }
      } finally {
        this.isLoading = false;
      }
    } else {
      // Password method - check if user has password first
      this.isLoading = true;
      try {
        const emailStatus = await this.authService.checkEmail(this.email.value);
        
        if (!emailStatus.exists) {
          // User doesn't exist - redirect to sign up
          this.continue.emit({ email: this.email.value, method: 'sign-up' });
        } else if (!emailStatus.hasPassword) {
          // User exists but no password - send OTP for password setup
          await this.authService.sendOtp(this.email.value);
          this.continue.emit({ email: this.email.value, method: 'setup-password', needsPasswordSetup: true });
        } else {
          // User has password - normal sign in
          this.continue.emit({ email: this.email.value, method: 'password' });
        }
      } catch (error) {
        // Check for AuthError by name (more reliable than instanceof across module boundaries)
        const isAuthError = error instanceof AuthError || (error as Error)?.name === 'AuthError';
        if (isAuthError) {
          this.errorMessage = (error as AuthError).message;
        } else {
          const err = error as { message?: string };
          this.errorMessage = err?.message || 'Failed to check email. Please try again.';
        }
      } finally {
        this.isLoading = false;
      }
    }
  }
}
