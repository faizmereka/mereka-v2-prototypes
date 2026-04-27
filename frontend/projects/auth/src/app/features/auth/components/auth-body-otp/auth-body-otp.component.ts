import { Component, EventEmitter, Input, Output, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoaderSpinnerComponent } from '@mereka/ui';
import { AuthService, AuthError, RedirectService, UserType } from '../../../../core/services';

@Component({
  selector: 'auth-body-otp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoaderSpinnerComponent],
  template: `
    <div class="flex flex-col gap-6">
      <div class="text-center">
        <h2 class="text-xl font-semibold text-primary">Enter verification code</h2>
        <p class="mt-2 text-sm text-gray-500 leading-relaxed">
          We've sent a 6-digit code to <strong class="text-primary">{{ email }}</strong>
        </p>
        @if (forPasswordSetup) {
          <p class="mt-1 text-sm text-gray-500">
            Verify your email to set up your password.
          </p>
        }
      </div>

      <form [formGroup]="formGroup" (ngSubmit)="onSubmit()" class="flex flex-col gap-5">
        <!-- OTP Input -->
        <div class="flex flex-col gap-2">
          <label for="otp" class="text-sm font-medium text-primary">
            Verification Code
          </label>
          <input
            id="otp"
            type="text"
            formControlName="otp"
            maxlength="6"
            placeholder="000000"
            autocomplete="one-time-code"
            inputmode="numeric"
            class="w-full px-4 py-4 text-2xl text-center tracking-[0.5em] font-mono border rounded-lg transition-all
                   border-gray-300 bg-white text-primary
                   placeholder:text-gray-300 placeholder:tracking-[0.5em]
                   focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            [class.border-red-500]="(otp?.dirty && otp?.errors) || errorMessage"
            [class.bg-red-50]="(otp?.dirty && otp?.errors) || errorMessage"
            [class.focus:ring-red-200]="(otp?.dirty && otp?.errors) || errorMessage"
            [class.focus:border-red-500]="(otp?.dirty && otp?.errors) || errorMessage"
            (input)="onOtpInput($event)"
          />
          @if (otp?.dirty && otp?.errors) {
            <div class="text-sm text-red-600 text-center">
              @if (otp?.errors?.['required']) {
                <span>Please enter the verification code</span>
              } @else if (otp?.errors?.['minlength'] || otp?.errors?.['maxlength']) {
                <span>Code must be 6 digits</span>
              } @else if (otp?.errors?.['pattern']) {
                <span>Code must contain only numbers</span>
              }
            </div>
          }
          @if (errorMessage) {
            <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 text-center">
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
            {{ forPasswordSetup ? 'Verify & Continue' : 'Verify & Sign In' }}
          }
        </button>
      </form>

      <!-- Resend Code -->
      <div class="flex flex-col items-center gap-2">
        <p class="text-sm text-gray-500">Didn't receive the code?</p>
        <button
          type="button"
          [disabled]="isResending || resendCooldown > 0"
          (click)="onResendCode()"
          class="text-sm text-primary hover:underline font-medium
                 disabled:opacity-50 disabled:cursor-not-allowed
                 flex items-center gap-2"
        >
          @if (isResending) {
            <ui-loader-spinner size="sm"></ui-loader-spinner>
            Sending...
          } @else if (resendCooldown > 0) {
            Resend in {{ resendCooldown }}s
          } @else {
            Resend Code
          }
        </button>
      </div>

      <!-- Back Button -->
      <button
        type="button"
        (click)="back.emit()"
        class="text-sm text-primary hover:underline self-center"
      >
        Use a different email
      </button>
    </div>
  `,
})
export class AuthBodyOtpComponent {
  private readonly authService = inject(AuthService);
  private readonly redirectService = inject(RedirectService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({ required: true }) email!: string;
  @Input({ required: true }) redirectUrl!: string;
  @Input() asUser: UserType = 'learner';
  @Input() forPasswordSetup = false;

  @Output() back = new EventEmitter<void>();
  @Output() verified = new EventEmitter<void>();

  formGroup = new FormGroup({
    otp: new FormControl('', [
      Validators.required,
      Validators.minLength(6),
      Validators.maxLength(6),
      Validators.pattern(/^\d{6}$/),
    ]),
  });

  isLoading = false;
  isResending = false;
  errorMessage = '';
  resendCooldown = 0;

  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  get otp() {
    return this.formGroup.get('otp');
  }

  onOtpInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Only allow digits
    input.value = input.value.replace(/\D/g, '').slice(0, 6);
    this.otp?.setValue(input.value);
    this.errorMessage = '';
  }

  async onSubmit(): Promise<void> {
    if (!this.email || !this.otp?.value) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      await this.authService.verifyOtp(this.email, this.otp.value);

      if (this.forPasswordSetup) {
        // Emit verified event for password setup flow
        this.verified.emit();
      } else {
        // Redirect after successful verification
        this.redirectService.redirectAfterAuth(this.redirectUrl, this.asUser);
      }
    } catch (error) {
      // Check for AuthError by name (more reliable than instanceof across module boundaries)
      const isAuthError = error instanceof AuthError || (error as Error)?.name === 'AuthError';
      const authError = error as AuthError;

      if (isAuthError) {
        if (authError.code === 'LOGIN_FAILED') {
          this.errorMessage = 'Invalid or expired code. Please try again.';
        } else if (authError.code === 'NETWORK_ERROR') {
          this.errorMessage = 'Unable to connect. Please check your connection.';
        } else {
          this.errorMessage = authError.message;
        }
      } else {
        const err = error as { message?: string };
        this.errorMessage = err?.message || 'Verification failed. Please try again.';
      }
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async onResendCode(): Promise<void> {
    if (!this.email || this.resendCooldown > 0) {
      return;
    }

    this.isResending = true;
    this.errorMessage = '';

    try {
      await this.authService.sendOtp(this.email);
      this.startCooldown();
    } catch (error) {
      // Check for AuthError by name (more reliable than instanceof across module boundaries)
      const isAuthError = error instanceof AuthError || (error as Error)?.name === 'AuthError';
      if (isAuthError) {
        this.errorMessage = (error as AuthError).message;
      } else {
        const err = error as { message?: string };
        this.errorMessage = err?.message || 'Failed to resend code. Please try again.';
      }
    } finally {
      this.isResending = false;
      this.cdr.detectChanges();
    }
  }

  private startCooldown(): void {
    this.resendCooldown = 60;

    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }

    this.cooldownInterval = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        if (this.cooldownInterval) {
          clearInterval(this.cooldownInterval);
          this.cooldownInterval = null;
        }
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
    }
  }
}
