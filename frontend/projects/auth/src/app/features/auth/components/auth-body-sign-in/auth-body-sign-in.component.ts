import { Component, EventEmitter, Input, Output, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoaderSpinnerComponent } from '@mereka/ui';
import { AuthService, AuthError, RedirectService, UserType } from '../../../../core/services';

@Component({
  selector: 'auth-body-sign-in',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoaderSpinnerComponent],
  template: `
    <div class="flex flex-col gap-6">
      <h2 class="text-xl font-semibold text-primary">Log in to your account</h2>

      <form [formGroup]="formGroup" (ngSubmit)="onSubmit()" class="flex flex-col gap-5">
        <!-- Hidden email field for autocomplete -->
        <div class="hidden">
          <label for="email">Email</label>
          <input id="email" type="email" [value]="email" autocomplete="email" />
        </div>

        <!-- Password Field -->
        <div class="flex flex-col gap-2">
          <label for="password" class="text-sm font-medium text-primary">
            Password
          </label>
          <div
            class="flex items-center px-4 py-3 border rounded-lg transition-all
                   border-gray-300 bg-white
                   focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary"
            [class.border-red-500]="errorMessage || (password?.dirty && password?.errors)"
            [class.bg-red-50]="errorMessage || (password?.dirty && password?.errors)"
            [class.focus-within:ring-red-200]="errorMessage || (password?.dirty && password?.errors)"
            [class.focus-within:border-red-500]="errorMessage || (password?.dirty && password?.errors)"
          >
            <input
              id="password"
              formControlName="password"
              [type]="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="Enter your password"
              (input)="clearError()"
              class="flex-1 bg-transparent text-primary placeholder:text-gray-400 focus:outline-none"
            />
            <button
              type="button"
              (click)="showPassword = !showPassword"
              class="p-1 text-gray-400 hover:text-primary transition-colors"
            >
              @if (!showPassword) {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
              } @else {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                </svg>
              }
            </button>
          </div>

          @if (password?.dirty && password?.errors) {
            <div class="text-sm text-red-600">
              @if (password?.errors?.['minlength']) {
                <span>Password must be at least 8 characters</span>
              }
            </div>
          }

          @if (errorMessage) {
            <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {{ errorMessage }}
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
            Sign In
          }
        </button>
      </form>

      <!-- Forgot Password -->
      <button
        type="button"
        (click)="forgotPassword.emit()"
        class="text-sm text-primary hover:underline self-start"
      >
        Forgot password?
      </button>
    </div>
  `,
})
export class AuthBodySignInComponent {
  private readonly authService = inject(AuthService);
  private readonly redirectService = inject(RedirectService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) email!: string;
  @Input({ required: true }) redirectUrl!: string;
  @Input() asUser: UserType = 'learner';

  @Output() forgotPassword = new EventEmitter<void>();

  formGroup = new FormGroup({
    password: new FormControl('', [Validators.required, Validators.minLength(8)]),
  });

  showPassword = false;
  isLoading = false;
  errorMessage = '';

  get password() {
    return this.formGroup.get('password');
  }

  clearError(): void {
    this.errorMessage = '';
  }

  async onSubmit(): Promise<void> {
    if (!this.email || !this.password?.value) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.login(this.email, this.password.value);

      // Redirect after successful login
      this.redirectService.redirectAfterAuth(this.redirectUrl, this.asUser);
    } catch (error) {
      // Check for AuthError by name (more reliable than instanceof across module boundaries)
      const isAuthError = error instanceof AuthError || (error as Error)?.name === 'AuthError';
      const authError = error as AuthError;

      if (isAuthError) {
        if (authError.code === 'LOGIN_FAILED') {
          this.errorMessage = 'Wrong password. Try again';
        } else if (authError.code === 'NETWORK_ERROR') {
          this.errorMessage = 'Unable to connect. Please check your connection.';
        } else {
          this.errorMessage = authError.message;
        }
      } else {
        // Fallback - try to extract message from any error
        const err = error as { message?: string; code?: string };
        this.errorMessage = err?.message || 'An unexpected error occurred';
      }
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
