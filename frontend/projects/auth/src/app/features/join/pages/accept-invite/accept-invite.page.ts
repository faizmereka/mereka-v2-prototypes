import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { LoaderSpinnerComponent } from '@mereka/ui';
import {
  InvitationService,
  InvitationInfo,
  InvitationError,
} from '../../../../core/services/invitation.service';
import { AuthService, AuthUser } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';

/**
 * Invitation state for UI rendering
 */
type InvitationState =
  | 'loading'
  | 'invalid'
  | 'expired'
  | 'wrong_user'
  | 'can_accept'
  | 'needs_login'
  | 'needs_signup'
  | 'accepting'
  | 'accepted'
  | 'error';

/**
 * Accept Invite Page
 * Handles email invitation acceptance flow
 */
@Component({
  selector: 'accept-invite-page',
  standalone: true,
  imports: [CommonModule, LoaderSpinnerComponent],
  template: `
    <div class="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-lg max-w-md w-full overflow-hidden">
        <!-- Loading State -->
        @if (state() === 'loading') {
          <div class="p-12 text-center">
            <ui-loader-spinner size="lg" color="primary" />
            <p class="mt-4 text-neutral-600">Loading invitation...</p>
          </div>
        }

        <!-- Invalid Token -->
        @if (state() === 'invalid') {
          <div class="p-8 text-center">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-neutral-900 mb-2">Invalid Invitation</h2>
            <p class="text-neutral-600 mb-6">
              This invitation link is invalid or has been cancelled. Please ask for a new invitation.
            </p>
            <a
              [href]="appUrl"
              class="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Go to App
            </a>
          </div>
        }

        <!-- Expired Invitation -->
        @if (state() === 'expired') {
          <div class="p-8 text-center">
            <div class="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-neutral-900 mb-2">Invitation Expired</h2>
            <p class="text-neutral-600 mb-6">
              This invitation has expired. Please ask the hub admin for a new invitation.
            </p>
            <a
              [href]="appUrl"
              class="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Go to App
            </a>
          </div>
        }

        <!-- Wrong User (logged in as different user) -->
        @if (state() === 'wrong_user' && info()) {
          <div class="p-8">
            <!-- Hub Header -->
            <div class="text-center mb-6">
              @if (info()?.hubLogo) {
                <img
                  [src]="info()?.hubLogo"
                  alt="Hub Logo"
                  class="w-16 h-16 rounded-xl mx-auto mb-3"
                />
              } @else {
                <div class="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span class="text-2xl font-bold text-primary">
                    {{ hubInitial() }}
                  </span>
                </div>
              }
              <h2 class="text-xl font-bold text-neutral-900">{{ info()?.hubName }}</h2>
            </div>

            <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div class="flex items-start gap-3">
                <svg class="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <div>
                  <h3 class="font-semibold text-orange-800">Wrong Account</h3>
                  <p class="text-sm text-orange-700 mt-1">
                    You're logged in as: <strong>{{ currentUser()?.email }}</strong>
                  </p>
                  <p class="text-sm text-orange-700 mt-1">
                    This invitation is for: <strong>{{ info()?.invitedEmail }}</strong>
                  </p>
                </div>
              </div>
            </div>

            <p class="text-neutral-600 text-center mb-6">
              Please logout and sign in with the correct account to accept this invitation.
            </p>

            <button
              (click)="logout()"
              [disabled]="loggingOut()"
              class="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {{ loggingOut() ? 'Logging out...' : 'Logout & Continue' }}
            </button>
          </div>
        }

        <!-- Can Accept (correct user logged in) -->
        @if ((state() === 'can_accept' || state() === 'accepting') && info()) {
          <div class="p-8">
            <!-- Hub Header -->
            <div class="text-center mb-6">
              @if (info()?.hubLogo) {
                <img
                  [src]="info()?.hubLogo"
                  alt="Hub Logo"
                  class="w-20 h-20 rounded-xl mx-auto mb-3"
                />
              } @else {
                <div class="w-20 h-20 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span class="text-3xl font-bold text-primary">
                    {{ hubInitial() }}
                  </span>
                </div>
              }
              <h2 class="text-xl font-bold text-neutral-900">{{ info()?.hubName }}</h2>
            </div>

            <!-- Invitation Details -->
            <div class="bg-neutral-50 rounded-lg p-4 mb-6 text-center">
              <p class="text-neutral-600">You have been invited to join as</p>
              <p class="text-lg font-semibold text-primary mt-1">
                {{ displayRoleName() }}
              </p>
              @if (info()?.invitedByName) {
                <p class="text-sm text-neutral-500 mt-2">
                  Invited by {{ info()?.invitedByName }}
                </p>
              }
            </div>

            <button
              (click)="acceptInvitation()"
              [disabled]="state() === 'accepting'"
              class="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {{ state() === 'accepting' ? 'Accepting...' : 'Accept & Join Hub' }}
            </button>
          </div>
        }

        <!-- Accepted Success -->
        @if (state() === 'accepted') {
          <div class="p-8 text-center">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-neutral-900 mb-2">Welcome!</h2>
            <p class="text-neutral-600 mb-6">
              You've successfully joined <strong>{{ info()?.hubName }}</strong>
            </p>

            <div class="space-y-3">
              <button
                (click)="goToHubDashboard()"
                class="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                {{ info()?.roleKey === 'expert' ? 'Set Up Your Expert Profile' : 'Go to Hub Dashboard' }}
              </button>
              <button
                (click)="goToHome()"
                class="w-full px-6 py-3 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                Go to Home
              </button>
            </div>
          </div>
        }

        <!-- Needs Login -->
        @if (state() === 'needs_login' && info()) {
          <div class="p-8">
            <!-- Hub Header -->
            <div class="text-center mb-6">
              @if (info()?.hubLogo) {
                <img
                  [src]="info()?.hubLogo"
                  alt="Hub Logo"
                  class="w-20 h-20 rounded-xl mx-auto mb-3"
                />
              } @else {
                <div class="w-20 h-20 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span class="text-3xl font-bold text-primary">
                    {{ hubInitial() }}
                  </span>
                </div>
              }
              <h2 class="text-xl font-bold text-neutral-900">{{ info()?.hubName }}</h2>
            </div>

            <!-- Invitation Details -->
            <div class="bg-neutral-50 rounded-lg p-4 mb-6 text-center">
              <p class="text-neutral-600">You have been invited to join as</p>
              <p class="text-lg font-semibold text-primary mt-1">
                {{ displayRoleName() }}
              </p>
              @if (info()?.invitedEmail) {
                <p class="text-sm text-neutral-500 mt-2">
                  Invitation for: {{ info()?.invitedEmail }}
                </p>
              }
            </div>

            <p class="text-sm text-neutral-600 text-center mb-4">
              An account exists for this email. Please log in to accept.
            </p>

            <button
              (click)="goToLogin()"
              class="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Log In to Accept
            </button>
          </div>
        }

        <!-- Needs Signup -->
        @if (state() === 'needs_signup' && info()) {
          <div class="p-8">
            <!-- Hub Header -->
            <div class="text-center mb-6">
              @if (info()?.hubLogo) {
                <img
                  [src]="info()?.hubLogo"
                  alt="Hub Logo"
                  class="w-20 h-20 rounded-xl mx-auto mb-3"
                />
              } @else {
                <div class="w-20 h-20 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span class="text-3xl font-bold text-primary">
                    {{ hubInitial() }}
                  </span>
                </div>
              }
              <h2 class="text-xl font-bold text-neutral-900">{{ info()?.hubName }}</h2>
            </div>

            <!-- Invitation Details -->
            <div class="bg-neutral-50 rounded-lg p-4 mb-6 text-center">
              <p class="text-neutral-600">You have been invited to join as</p>
              <p class="text-lg font-semibold text-primary mt-1">
                {{ displayRoleName() }}
              </p>
              @if (info()?.invitedEmail) {
                <p class="text-sm text-neutral-500 mt-2">
                  Invitation for: {{ info()?.invitedEmail }}
                </p>
              }
            </div>

            <button
              (click)="goToSignup()"
              class="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors mb-3"
            >
              Create Account & Join
            </button>

            <p class="text-sm text-neutral-600 text-center">
              Already have an account?
              <button (click)="goToLogin()" class="text-primary hover:underline">
                Log in
              </button>
            </p>
          </div>
        }

        <!-- Error State -->
        @if (state() === 'error') {
          <div class="p-8 text-center">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>
            <h2 class="text-xl font-bold text-neutral-900 mb-2">Something went wrong</h2>
            <p class="text-neutral-600 mb-6">{{ errorMessage() }}</p>
            <button
              (click)="retry()"
              class="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Try Again
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class AcceptInvitePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly invitationService = inject(InvitationService);
  private readonly authService = inject(AuthService);

  // State signals
  readonly state = signal<InvitationState>('loading');
  readonly invitationInfo = signal<InvitationInfo | null>(null);
  readonly currentUser = signal<AuthUser | null>(null);
  readonly errorMessage = signal<string>('');
  readonly loggingOut = signal(false);

  // Computed helpers
  readonly info = computed(() => this.invitationInfo());
  readonly hubInitial = computed(() => this.info()?.hubName?.charAt(0) || '?');
  readonly displayRoleName = computed(() => {
    const i = this.info();
    if (!i) return '';
    return i.roleKey === 'expert' ? 'Team Member' : i.roleName;
  });

  // Token from URL
  private token = '';

  // URLs
  readonly appUrl = environment.appUrls.app;
  readonly webUrl = environment.appUrls.web;

  async ngOnInit(): Promise<void> {
    // Get token from route
    this.token = this.route.snapshot.paramMap.get('token') || '';

    if (!this.token) {
      this.state.set('invalid');
      return;
    }

    await this.loadInvitation();
  }

  private async loadInvitation(): Promise<void> {
    this.state.set('loading');

    try {
      // Load invitation info and current user in parallel
      const [info, user] = await Promise.all([
        this.invitationService.getInvitationInfo(this.token),
        this.authService.getMe(),
      ]);

      this.invitationInfo.set(info);
      this.currentUser.set(user);

      // Determine state
      this.state.set(this.determineState(info, user));
    } catch (error) {
      if (error instanceof InvitationError) {
        if (error.code === 'INVALID_TOKEN') {
          this.state.set('invalid');
        } else if (error.code === 'EXPIRED_INVITATION') {
          this.state.set('expired');
        } else {
          this.errorMessage.set(error.message);
          this.state.set('error');
        }
      } else {
        this.errorMessage.set('Failed to load invitation');
        this.state.set('error');
      }
    }
  }

  private determineState(info: InvitationInfo, user: AuthUser | null): InvitationState {
    if (!info.isValid) {
      return 'invalid';
    }

    if (info.isExpired) {
      return 'expired';
    }

    if (user) {
      // User is logged in
      if (
        info.invitedEmail &&
        user.email.toLowerCase() !== info.invitedEmail.toLowerCase()
      ) {
        // Logged in as DIFFERENT user than invited
        return 'wrong_user';
      }
      // Logged in as correct user (or link invitation with no specific email)
      return 'can_accept';
    }

    // User not logged in
    if (info.userExists) {
      // Invited email has an account - show login
      return 'needs_login';
    }

    // No account exists - show signup
    return 'needs_signup';
  }

  async acceptInvitation(): Promise<void> {
    if (!this.token) return;

    this.state.set('accepting');

    try {
      await this.invitationService.acceptEmailInvitation(this.token);
      this.state.set('accepted');
    } catch (error) {
      if (error instanceof InvitationError) {
        if (error.code === 'ALREADY_MEMBER') {
          // Already a member - show success with options
          this.state.set('accepted');
        } else {
          this.errorMessage.set(error.message);
          this.state.set('error');
        }
      } else {
        this.errorMessage.set('Failed to accept invitation');
        this.state.set('error');
      }
    }
  }

  goToHubDashboard(): void {
    const info = this.info();

    // If expert invitation, redirect to expert onboarding
    if (info?.roleKey === 'expert') {
      window.location.href = `${this.appUrl}/onboarding/expert/your-profile`;
      return;
    }

    // Hub dashboard route is /hub/overview (no slug in route)
    window.location.href = `${this.appUrl}/hub/overview`;
  }

  goToHome(): void {
    window.location.href = this.webUrl;
  }

  goToLogin(): void {
    // Redirect to login with return URL back to this page
    const returnUrl = encodeURIComponent(window.location.href);
    const email = this.info()?.invitedEmail || '';
    window.location.href = `/?mode=sign-in&redirect=${returnUrl}&email=${encodeURIComponent(email)}`;
  }

  goToSignup(): void {
    // Redirect to signup with return URL back to this page
    const returnUrl = encodeURIComponent(window.location.href);
    const email = this.info()?.invitedEmail || '';
    window.location.href = `/?mode=sign-up&redirect=${returnUrl}&email=${encodeURIComponent(email)}`;
  }

  async logout(): Promise<void> {
    this.loggingOut.set(true);
    try {
      // Clear cookies by calling logout endpoint
      await fetch(`${environment.apiUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore errors - just reload the page
    }

    // Reload the page to show login/signup options
    window.location.reload();
  }

  retry(): void {
    this.loadInvitation();
  }
}
