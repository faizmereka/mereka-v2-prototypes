import { Component, signal, inject, OnInit, effect } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, type ApiError } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  error = signal<string | null>(null);
  info = signal<string | null>(null);
  currentYear = new Date().getFullYear();

  // Use auth service's loading state
  isLoading = this.authService.isLoading;

  constructor() {
    // Watch for session expired changes
    effect(() => {
      if (this.authService.sessionExpired()) {
        this.info.set('Your session has expired. Please log in again.');
        this.authService.clearSessionExpired();
      }
    });
  }

  ngOnInit() {
    // Check if session expired on component init
    if (this.authService.sessionExpired()) {
      this.info.set('Your session has expired. Please log in again.');
      this.authService.clearSessionExpired();
    }
  }

  async onSubmit() {
    if (!this.email || !this.password) {
      this.error.set('Please enter both email and password');
      return;
    }

    this.error.set(null);
    this.info.set(null);

    try {
      const response = await this.authService.login(this.email, this.password);

      if (response.success) {
        // Check if MFA is required
        if (response.data.requiresMfa) {
          // TODO: Navigate to MFA page
          this.error.set('MFA verification required');
          return;
        }

        // Check if password change is required
        if (response.data.admin.requirePasswordChange) {
          // TODO: Navigate to change password page
          this.error.set('Password change required');
          return;
        }

        // Navigate to dashboard on success
        this.router.navigate(['/dashboard']);
      }
    } catch (err: unknown) {
      // Handle API error response
      if (this.isApiError(err)) {
        this.error.set(err.error.message);
      } else if (err instanceof Error) {
        this.error.set(err.message);
      } else {
        this.error.set('Login failed. Please try again.');
      }
    }
  }

  private isApiError(err: unknown): err is { error: ApiError['error'] } {
    return (
      typeof err === 'object' &&
      err !== null &&
      'error' in err &&
      typeof (err as ApiError).error === 'object' &&
      (err as ApiError).error !== null &&
      'message' in (err as ApiError).error
    );
  }
}
