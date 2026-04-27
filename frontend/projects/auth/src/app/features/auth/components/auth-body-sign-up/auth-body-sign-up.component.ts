import { Component, Input, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { LoaderSpinnerComponent } from '@mereka/ui';
import { AuthService, AuthError, RedirectService, UserType } from '../../../../core/services';

/**
 * Password match validator for form group
 */
function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password');
  const confirmPassword = group.get('confirmPassword');
  
  if (!password || !confirmPassword) return null;
  
  return password.value === confirmPassword.value
    ? null
    : { passwordMismatch: true };
}

@Component({
  selector: 'auth-body-sign-up',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoaderSpinnerComponent],
  template: `
    <div class="flex flex-col gap-6">
      <h2 class="text-xl font-semibold text-primary">Create an account</h2>

      <form [formGroup]="formGroup" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
        <!-- Hidden email field for autocomplete -->
        <div class="hidden">
          <label for="email">Email</label>
          <input id="email" type="email" [value]="email" autocomplete="username" />
        </div>

        <!-- Name Field -->
        <div class="flex flex-col gap-2">
          <label for="name" class="text-sm font-medium text-primary">Your Name</label>
          <input
            id="name"
            type="text"
            formControlName="name"
            autocomplete="name"
            placeholder="Enter your name"
            class="w-full px-4 py-3 text-base border rounded-lg transition-all
                   border-gray-300 bg-white text-primary
                   placeholder:text-gray-400
                   focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            [class.border-red-500]="name?.dirty && name?.errors"
            [class.bg-red-50]="name?.dirty && name?.errors"
            [class.focus:ring-red-200]="name?.dirty && name?.errors"
            [class.focus:border-red-500]="name?.dirty && name?.errors"
          />
          @if (name?.dirty && name?.errors?.['required']) {
            <span class="text-sm text-red-600">Name is required</span>
          }
        </div>

        <!-- Birth Date Field -->
        <div class="flex flex-col gap-2">
          <label for="birthDate" class="text-sm font-medium text-primary">Birth Date</label>
          <div
            class="flex items-center px-4 py-3 border rounded-lg transition-all
                   border-gray-300 bg-white
                   focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary"
            [class.border-red-500]="birthDate?.dirty && birthDate?.errors"
            [class.bg-red-50]="birthDate?.dirty && birthDate?.errors"
            [class.focus-within:ring-red-200]="birthDate?.dirty && birthDate?.errors"
            [class.focus-within:border-red-500]="birthDate?.dirty && birthDate?.errors"
          >
            <input
              #birthDateInput
              id="birthDate"
              type="date"
              formControlName="birthDate"
              autocomplete="bday"
              class="flex-1 bg-transparent text-primary focus:outline-none"
            />
            <button
              type="button"
              (click)="birthDateInput.showPicker()"
              class="p-1 text-gray-400 hover:text-primary transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </button>
          </div>
          @if (birthDate?.dirty && birthDate?.errors?.['required']) {
            <span class="text-sm text-red-600">Birth date is required</span>
          }
        </div>

        <!-- Password Field -->
        <div class="flex flex-col gap-2">
          <label for="password" class="text-sm font-medium text-primary">Password</label>
          <div
            class="flex items-center px-4 py-3 border rounded-lg transition-all
                   border-gray-300 bg-white
                   focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary"
            [class.border-red-500]="password?.dirty && password?.errors"
            [class.bg-red-50]="password?.dirty && password?.errors"
            [class.focus-within:ring-red-200]="password?.dirty && password?.errors"
            [class.focus-within:border-red-500]="password?.dirty && password?.errors"
          >
            <input
              id="password"
              formControlName="password"
              [type]="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="Create a password"
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
          @if (password?.dirty && password?.errors?.['minlength']) {
            <span class="text-sm text-red-600">Password must be at least 8 characters</span>
          }
        </div>

        <!-- Confirm Password Field -->
        <div class="flex flex-col gap-2">
          <label for="confirmPassword" class="text-sm font-medium text-primary">Confirm Password</label>
          <div
            class="flex items-center px-4 py-3 border rounded-lg transition-all
                   border-gray-300 bg-white
                   focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary"
            [class.border-red-500]="confirmPassword?.dirty && (confirmPassword?.errors || formGroup.errors?.['passwordMismatch'])"
            [class.bg-red-50]="confirmPassword?.dirty && (confirmPassword?.errors || formGroup.errors?.['passwordMismatch'])"
            [class.focus-within:ring-red-200]="confirmPassword?.dirty && (confirmPassword?.errors || formGroup.errors?.['passwordMismatch'])"
            [class.focus-within:border-red-500]="confirmPassword?.dirty && (confirmPassword?.errors || formGroup.errors?.['passwordMismatch'])"
          >
            <input
              id="confirmPassword"
              formControlName="confirmPassword"
              [type]="showConfirmPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="Confirm your password"
              class="flex-1 bg-transparent text-primary placeholder:text-gray-400 focus:outline-none"
            />
            <button
              type="button"
              (click)="showConfirmPassword = !showConfirmPassword"
              class="p-1 text-gray-400 hover:text-primary transition-colors"
            >
              @if (!showConfirmPassword) {
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
          @if (confirmPassword?.dirty) {
            @if (confirmPassword?.errors?.['required']) {
              <span class="text-sm text-red-600">Confirm password is required</span>
            } @else if (confirmPassword?.errors?.['minlength']) {
              <span class="text-sm text-red-600">Password must be at least 8 characters</span>
            } @else if (formGroup.errors?.['passwordMismatch']) {
              <span class="text-sm text-red-600">Passwords do not match</span>
            }
          }
        </div>

        @if (errorMessage) {
          <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 text-center">
            {{ errorMessage }}
          </div>
        }

        <!-- Submit Button -->
        <button
          type="submit"
          [disabled]="!formGroup.valid || isLoading"
          class="w-full py-3 px-4 rounded-lg font-medium text-white mt-2
                 bg-primary hover:bg-primary/90 transition-all
                 disabled:opacity-50 disabled:cursor-not-allowed
                 flex items-center justify-center gap-2"
        >
          @if (isLoading) {
            <ui-loader-spinner color="white" size="sm"></ui-loader-spinner>
          } @else {
            Sign Up
          }
        </button>

        <!-- Terms -->
        <p class="text-sm text-gray-500 text-center leading-relaxed">
          By signing up, you accept our
          <a href="https://legal.mereka.io/" target="_blank" class="text-primary hover:underline">terms of use</a>
          and
          <a href="https://legal.mereka.io/#privacy-policy" target="_blank" class="text-primary hover:underline">privacy policy</a>
        </p>
      </form>
    </div>
  `,
})
export class AuthBodySignUpComponent {
  private readonly authService = inject(AuthService);
  private readonly redirectService = inject(RedirectService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) email!: string;
  @Input({ required: true }) redirectUrl!: string;
  @Input() asUser: UserType = 'learner';

  formGroup: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  errorMessage = '';

  constructor() {
    this.formGroup = new FormGroup({
      name: new FormControl('', [Validators.required]),
      birthDate: new FormControl('', [Validators.required]),
      password: new FormControl('', [Validators.required, Validators.minLength(8)]),
      confirmPassword: new FormControl('', [Validators.required, Validators.minLength(8)]),
    });

    this.formGroup.addValidators(passwordMatchValidator);
  }

  get name() {
    return this.formGroup.get('name');
  }

  get birthDate() {
    return this.formGroup.get('birthDate');
  }

  get password() {
    return this.formGroup.get('password');
  }

  get confirmPassword() {
    return this.formGroup.get('confirmPassword');
  }

  /**
   * Check if URL is an invitation link that should redirect back after signup
   */
  private isInvitationUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const path = parsedUrl.pathname;
      // Match invitation paths:
      // - /join/link/:token (shareable invitation link)
      // - /join/invite/:token (email invitation accept)
      return path.includes('/join/link/') || path.includes('/join/invite/');
    } catch {
      return false;
    }
  }

  async onSubmit(): Promise<void> {
    if (!this.email || !this.password?.value || !this.name?.value || !this.birthDate?.value) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.register({
        name: this.name.value,
        email: this.email,
        birthDate: new Date(this.birthDate.value),
        password: this.password.value,
        confirmPassword: this.confirmPassword?.value || '',
      });

      // Check if this is an invitation link signup - redirect back to complete join
      if (this.redirectUrl && this.isInvitationUrl(this.redirectUrl)) {
        this.redirectService.redirectAfterAuth(this.redirectUrl, this.asUser);
      } else {
        // Normal signup flow - redirect to onboarding
        this.redirectService.redirectAfterSignup(this.asUser);
      }
    } catch (error) {
      // Check for AuthError by name (more reliable than instanceof across module boundaries)
      const isAuthError = error instanceof AuthError || (error as Error)?.name === 'AuthError';
      const authError = error as AuthError;

      if (isAuthError) {
        if (authError.code === 'USER_ALREADY_EXISTS') {
          this.errorMessage = 'An account with this email already exists';
        } else if (authError.code === 'NETWORK_ERROR') {
          this.errorMessage = 'Unable to connect. Please check your connection.';
        } else {
          this.errorMessage = authError.message;
        }
      } else {
        // Fallback - try to extract message from any error
        const err = error as { message?: string };
        this.errorMessage = err?.message || 'An unexpected error occurred';
      }
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
