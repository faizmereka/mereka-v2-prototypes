import { Component, signal, computed, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { UserDashboardNavbarComponent } from '../../shared/components/navbar/user-dashboard-navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { DashboardMenuComponent, type MenuItem } from './components/dashboard-menu/dashboard-menu.component';
import { DashboardBannersComponent, BannerService } from '../../shared/components/dashboard-banners';
import { AuthStateService } from '../../core/services/auth-state.service';
import { EmailVerificationService } from '../../core/services/email-verification.service';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    UserDashboardNavbarComponent,
    FooterComponent,
    DashboardMenuComponent,
    DashboardBannersComponent,
  ],
  templateUrl: './user-dashboard.component.html',
  host: {
    class: 'flex flex-col min-h-screen',
  },
})
export class UserDashboardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authState = inject(AuthStateService);
  private readonly bannerService = inject(BannerService);
  private readonly emailVerificationService = inject(EmailVerificationService);

  // Responsive state
  readonly screenWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1024);
  readonly isMobile = computed(() => this.screenWidth() < 1024);
  readonly showMobileContent = signal(false);
  readonly activePageTitle = signal('Account Details');

  readonly menuItems = signal<MenuItem[]>([
    { label: 'Overview', path: 'overview', icon: 'home' },
    { label: 'Chats', path: 'chats', icon: 'message' },
    { label: 'Account Details', path: 'account', icon: 'person' },
    { label: 'My Favorites', path: 'favorites', icon: 'heart' },
    { label: 'Edit Profile', path: '/onboarding/learner/personal-details', icon: 'edit', isExternal: true },
    { label: 'My Bookings', path: 'bookings', icon: 'calendar', section: 'Memberships & Payments' },
    { label: 'My Courses', path: 'courses', icon: 'book', section: 'Memberships & Payments' },
    { label: 'Transaction History', path: 'transactions', icon: 'credit-card', section: 'Memberships & Payments' },
    { label: 'Payment Information', path: 'billing', icon: 'dollar', section: 'Memberships & Payments' },
    { label: 'Reviews', path: 'reviews', icon: 'star', section: 'Memberships & Payments' },
    { label: 'Notifications', path: 'notifications', icon: 'bell', section: 'Preferences' },
    { label: 'Notification Settings', path: 'notification-settings', icon: 'settings', section: 'Preferences' },
    { label: 'Communication History', path: 'communication-logs', icon: 'email', section: 'Preferences' },
    { label: 'Security', path: 'security', icon: 'lock', section: 'Preferences' },
  ]);

  ngOnInit() {
    // Update page title on navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const currentPath = this.router.url.split('/').pop();
      const menuItem = this.menuItems().find(item => item.path === currentPath);
      if (menuItem) {
        this.activePageTitle.set(menuItem.label);
      }
    });

    // Check email verification and show banner if needed
    this.checkEmailVerification();
  }

  /**
   * Check if email is verified and add banner if not
   */
  private checkEmailVerification(): void {
    const user = this.authState.user();
    if (user && !user.emailVerified) {
      this.bannerService.addBanner({
        id: 'email-verification',
        category: 'user',
        severity: 'warning',
        title: 'Verify your email',
        message: 'Please verify your email address to access all features.',
        actionLabel: 'Resend verification email',
        actionFn: async () => {
          const success = await this.emailVerificationService.resendVerificationEmail();
          if (success) {
            // Update banner to show success
            this.bannerService.addBanner({
              id: 'email-verification',
              category: 'user',
              severity: 'success',
              title: 'Verification email sent',
              message: 'Please check your inbox and click the verification link.',
              dismissible: true,
            });
          }
        },
        dismissible: false,
      });
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.screenWidth.set(window.innerWidth);
    // Hide mobile content when switching to desktop
    if (!this.isMobile()) {
      this.showMobileContent.set(false);
    }
  }

  toggleMobileContent() {
    this.showMobileContent.update(v => !v);
  }
}
