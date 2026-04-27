import { Component, EventEmitter, Output, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoaderSpinnerComponent } from '@mereka/ui';
import { AuthService, AuthError } from '../../../../core/services';

/**
 * Auth Body Forgot Password Component
 * Email input for password reset
 */
@Component({
  selector: 'auth-body-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoaderSpinnerComponent],
  template: `
    <div class="flex flex-col gap-6">
      <div class="text-center">
        <h2 class="text-xl font-semibold text-primary">Forgot your password?</h2>
        <p class="mt-2 text-sm text-gray-500 leading-relaxed">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      @if (!emailSent) {
        <form [formGroup]="formGroup" (ngSubmit)="onSubmit()" class="flex flex-col gap-5">
          <!-- Email Field -->
          <div class="flex flex-col gap-2">
            <label for="email" class="text-sm font-medium text-primary">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              formControlName="email"
              autocomplete="email"
              placeholder="Enter your email"
              class="w-full px-4 py-3 text-base border rounded-lg transition-all
                     border-gray-300 bg-white text-primary
                     placeholder:text-gray-400
                     focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              [class.border-red-500]="email?.dirty && email?.errors"
              [class.bg-red-50]="email?.dirty && email?.errors"
              [class.focus:ring-red-200]="email?.dirty && email?.errors"
              [class.focus:border-red-500]="email?.dirty && email?.errors"
            />
            @if (email?.dirty && email?.errors) {
              <div class="text-sm text-red-600">
                @if (email?.errors?.['required']) {
                  <span>Email is required</span>
                } @else if (email?.errors?.['email']) {
                  <span>Please enter a valid email address</span>
                }
              </div>
            }
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            [disabled]="!formGroup.valid || isLoading"
            class="w-full py-3 px-4 rounded-lg font-medium text-white
                   bg-primary hover:bg-primary/90 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center gap-2"
          >
            @if (isLoading) {
              <ui-loader-spinner color="white" size="sm"></ui-loader-spinner>
            } @else {
              Send Reset Link
            }
          </button>

          @if (errorMessage) {
            <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 text-center">
              {{ errorMessage }}
            </div>
          }
        </form>
      } @else {
        <div class="flex flex-col items-center gap-4 py-4">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <p class="text-center text-gray-600 leading-relaxed">
            We've sent a password reset link to <strong class="text-primary">{{ email?.value }}</strong>.
            Please check your inbox.
          </p>
          <button
            type="button"
            (click)="resetForm()"
            class="text-sm text-primary hover:underline font-medium"
          >
            Try a different email
          </button>
        </div>
      }

      <button
        type="button"
        (click)="back.emit()"
        class="text-sm text-primary hover:underline self-center"
      >
        Back to sign in
      </button>
    </div>
  `,
})
export class AuthBodyForgotPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Output() back = new EventEmitter<void>();

  formGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  isLoading = false;
  emailSent = false;
  errorMessage = '';

  get email() {
    return this.formGroup.get('email');
  }

  resetForm(): void {
    this.emailSent = false;
    this.formGroup.reset();
    this.errorMessage = '';
  }

  async onSubmit(): Promise<void> {
    if (!this.email?.value) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.forgotPassword(this.email.value);
      this.emailSent = true;
    } catch (error) {
      // Check for AuthError by name (more reliable than instanceof across module boundaries)
      const isAuthError = error instanceof AuthError || (error as Error)?.name === 'AuthError';
      const authError = error as AuthError;

      if (isAuthError) {
        if (authError.code === 'NETWORK_ERROR') {
          this.errorMessage = 'Unable to connect. Please check your connection.';
        } else {
          this.errorMessage = authError.message;
        }
      } else {
        const err = error as { message?: string };
        this.errorMessage = err?.message || 'Failed to send reset email. Please try again.';
      }
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
