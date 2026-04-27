import { Component, inject, PLATFORM_ID, DOCUMENT, afterNextRender, signal, computed } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UiAvatarComponent } from '@mereka/ui';
import { SearchService } from '@mereka/core';
import { environment } from '../../../../environments/environment';
import { AuthService, AuthHub } from '../../../core/services/auth.service';
import { HeaderSearchComponent } from '../header-search';
import { WebNotificationService, WebNotification } from '../../../core/services/web-notification.service';

@Component({
  selector: 'web-header',
  standalone: true,
  imports: [CommonModule, RouterLink, UiAvatarComponent, HeaderSearchComponent],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  private readonly document = inject(DOCUMENT);
  private readonly notificationService = inject(WebNotificationService);
  readonly searchService = inject(SearchService);

  readonly isBrowser = isPlatformBrowser(this.platformId);
  readonly authUrl = environment.appUrls.auth;
  readonly appUrl = environment.appUrls.app;

  // Track hydration completion - prevents SSR/client mismatch
  // Stays false during SSR and initial hydration, becomes true only after afterNextRender
  private readonly _hydrated = signal(false);
  readonly hydrated = this._hydrated.asReadonly();

  // Auth state from service (reactive signals)
  readonly user = this.authService.user;
  readonly hubs = this.authService.hubs;
  readonly isLoading = this.authService.isLoading;
  readonly isInitialized = this.authService.isInitialized;

  // Notification state from service
  readonly notifications = this.notificationService.recentNotifications;
  readonly unreadCount = this.notificationService.unreadCount;

  isMobileMenuOpen = false;
  isUserMenuOpen = false;
  isHubMenuOpen = false;
  isNotificationMenuOpen = false;

  constructor() {
    // Initialize auth state AFTER hydration completes to prevent blink
    // This ensures SSR content ("Log in / Sign up") stays visible during hydration
    // and only updates once Angular is fully ready
    afterNextRender(() => {
      this._hydrated.set(true);
      this.authService.init(true).then(() => {
        // Load notifications after auth is confirmed
        if (this.user()) {
          this.notificationService.loadNotifications();
        }
      });
    });
  }

  /**
   * Navigate to hub dashboard - caches hub ID in cookie before redirecting
   */
  goToHubDashboard(hub: AuthHub): void {
    if (!this.isBrowser) return;

    // Set hub ID in cookie (accessible by app.mereka.io)
    const domain = this.getCookieDomain();
    const expires = new Date();
    expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    this.document.cookie = `selectedHubId=${hub.hubId}; expires=${expires.toUTCString()}; path=/; domain=${domain}; SameSite=Lax`;

    // Redirect to /hub on app
    window.location.href = `${this.appUrl}/hub`;
  }

  /**
   * Get the cookie domain for cross-subdomain/cross-port sharing
   */
  private getCookieDomain(): string {
    if (!this.isBrowser) return '';
    const hostname = window.location.hostname;
    // For localhost, set domain=localhost to share across ports
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'localhost';
    }
    // For mereka.dev or mereka.io, use .mereka.dev or .mereka.io
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return '.' + parts.slice(-2).join('.');
    }
    return hostname;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isHubMenuOpen = false;
    this.isNotificationMenuOpen = false;
  }

  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  toggleHubMenu(): void {
    this.isHubMenuOpen = !this.isHubMenuOpen;
    this.isUserMenuOpen = false;
    this.isNotificationMenuOpen = false;
  }

  closeHubMenu(): void {
    this.isHubMenuOpen = false;
  }

  toggleNotificationMenu(): void {
    this.isNotificationMenuOpen = !this.isNotificationMenuOpen;
    this.isUserMenuOpen = false;
    this.isHubMenuOpen = false;
  }

  closeNotificationMenu(): void {
    this.isNotificationMenuOpen = false;
  }

  markNotificationAsRead(notification: WebNotification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification._id);
    }
  }

  markAllNotificationsAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  /**
   * Get relative time string (e.g., "2h ago", "3d ago")
   */
  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  logout(): void {
    this.notificationService.reset();
    this.authService.logout();
  }

  openMobileSearch(): void {
    this.closeMobileMenu();
    this.searchService.open();
  }
}
