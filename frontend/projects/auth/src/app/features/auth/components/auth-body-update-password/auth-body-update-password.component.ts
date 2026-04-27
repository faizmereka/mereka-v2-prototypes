import { Component, Input, inject } from '@angular/core';
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

/**
 * Auth Body Update Password Component
 * New password form for password reset flow
 */
@Component({
  selector: 'auth-body-update-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoaderSpinnerComponent],
  template: `
    <div class="flex flex-col gap-6">
      <div class="text-center">
        <h2 class="text-xl font-semibold text-primary">Create new password</h2>
        <p class="mt-2 text-sm text-gray-500 leading-relaxed">
          Please enter your new password below.
        </p>
      </div>

      @if (!passwordUpdated) {
        <form [formGroup]="formGroup" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
          <!-- Password Field -->
          <div class="flex flex-col gap-2">
            <label for="password" class="text-sm font-medium text-primary">New Password</label>
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
                placeholder="Enter new password"
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
                placeholder="Confirm new password"
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
              @if (confirmPassword?.errors?.['minlength']) {
                <span class="text-sm text-red-600">Password must be at least 8 characters</span>
              } @else if (formGroup.errors?.['passwordMismatch']) {
                <span class="text-sm text-red-600">Passwords do not match</span>
              }
            }
          </div>

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
              Update Password
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
            Your password has been updated successfully.
          </p>
          <button
            type="button"
            (click)="onContinue()"
            class="px-8 py-3 rounded-lg font-medium text-white
                   bg-primary hover:bg-primary/90 transition-all"
          >
            Continue to Sign In
          </button>
        </div>
      }
    </div>
  `,
})
export class AuthBodyUpdatePasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly redirectService = inject(RedirectService);

  @Input({ required: true }) email!: string;
  @Input({ required: true }) oobCode!: string;
  @Input({ required: true }) redirectUrl!: string;
  @Input() asUser: UserType = 'learner';

  formGroup: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  passwordUpdated = false;
  errorMessage = '';

  constructor() {
    this.formGroup = new FormGroup({
      password: new FormControl('', [Validators.required, Validators.minLength(8)]),
      confirmPassword: new FormControl('', [Validators.required, Validators.minLength(8)]),
    });

    this.formGroup.addValidators(
      passwordMatchValidator
    );
  }

  get password() {
    return this.formGroup.get('password');
  }

  get confirmPassword() {
    return this.formGroup.get('confirmPassword');
  }

  async onSubmit(): Promise<void> {
    if (!this.password?.value || !this.oobCode) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.resetPassword(this.oobCode, this.password.value);
      this.passwordUpdated = true;
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.code === 'NETWORK_ERROR') {
          this.errorMessage = 'Unable to connect. Please check your connection.';
        } else if (error.code === 'RESET_PASSWORD_FAILED') {
          this.errorMessage = 'Failed to update password. The link may have expired.';
        } else {
          this.errorMessage = error.message;
        }
      } else {
        this.errorMessage = 'Failed to update password. The link may have expired.';
      }
    } finally {
      this.isLoading = false;
    }
  }

  onContinue(): void {
    // Redirect to sign in or app
    this.redirectService.redirectAfterAuth(this.redirectUrl, this.asUser);
  }
}
