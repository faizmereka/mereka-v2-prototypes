import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthBodyComponent, AuthAsUser, AuthMode } from '../../components/auth-body/auth-body.component';
import { LoaderSpinnerComponent } from '@mereka/ui';

/**
 * Auth Page
 * Entry point for authentication flow
 */
@Component({
  selector: 'auth-page',
  standalone: true,
  imports: [CommonModule, AuthBodyComponent, LoaderSpinnerComponent],
  template: `
    @if (!isLoading) {
      <auth-body
        [asUser]="asUser"
        [mode]="mode"
        [redirectUrl]="redirectUrl"
        [oobCode]="oobCode"
        [initialEmail]="email"
      />
    } @else {
      <div class="min-h-screen flex items-center justify-center">
        <ui-loader-spinner size="lg" color="primary"></ui-loader-spinner>
      </div>
    }
  `,
})
export class AuthPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private subscription?: Subscription;

  asUser: AuthAsUser = 'learner';
  mode: AuthMode = '';
  redirectUrl = '';
  oobCode = '';
  email = '';
  isLoading = false;

  ngOnInit(): void {
    // Subscribe to query param changes to handle navigation within the same page
    this.subscription = this.route.queryParamMap.subscribe((params) => {
      this.parseQueryParams(params);
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  private parseQueryParams(params: ParamMap): void {
    // Parse query parameters
    const asUserParam = params.get('as-user') ?? 'learner';
    this.asUser = asUserParam === 'hub' ? 'hub' : 'learner';

    const modeParam = params.get('mode') ?? '';
    this.mode = this.sanitizeMode(modeParam);

    this.redirectUrl = params.get('redirect') ?? '/';
    this.oobCode = params.get('oobCode') ?? '';
    this.email = params.get('email') ?? '';
  }

  private sanitizeMode(mode: string): AuthMode {
    // Map 'register' to 'sign-up' for backwards compatibility
    if (mode === 'register') {
      return 'sign-up';
    }

    const validModes: AuthMode[] = [
      '',
      'email',
      'sign-in',
      'sign-up',
      'otp',
      'forgot-password',
      'resetPassword',
    ];
    return validModes.includes(mode as AuthMode) ? (mode as AuthMode) : '';
  }
}
