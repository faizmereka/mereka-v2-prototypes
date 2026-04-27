import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '@mereka/ui';
import { environment } from '../../../../environments/environment';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { UserNotificationService } from '../../../features/user-dashboard/services/user-notification.service';

@Component({
  selector: 'app-user-dashboard-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <header class="bg-white border-b border-neutral-200 shadow-sm fixed top-0 left-0 right-0 z-50 h-[68px]">
      <div class="px-6 py-4">
        <div class="flex items-center justify-between">
          <!-- Logo/Brand -->
          <div class="flex items-center gap-4">
            <a [href]="webUrl" class="flex items-center gap-3">
              <img src="assets/images/mereka-logo.svg" alt="Mereka" class="h-8" />
              <span class="text-xl font-medium text-primary">mereka</span>
            </a>
          </div>

          <!-- Right side actions -->
          <div class="flex items-center gap-4">
            <!-- Switch to Hub Button -->
            <button
              type="button"
              (click)="switchToHub()"
              class="flex items-center gap-2 px-4 py-2 bg-primary rounded-full text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
            >
              <span>Switch to Hub</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <!-- Notifications -->
            <div class="relative">
              <button
                type="button"
                (click)="toggleNotifications()"
                class="relative p-2 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <ui-icon name="bell" size="md" class="text-neutral-600" />
                @if (unreadCount() > 0) {
                  <span
                    class="absolute top-1 right-1 w-4 h-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                  >
                    {{ unreadCount() > 99 ? '99+' : unreadCount() }}
                  </span>
                }
              </button>

              <!-- Notifications Dropdown -->
              @if (showNotifications()) {
                <div
                  class="absolute right-0 top-12 w-72 bg-white rounded-lg shadow-lg border border-neutral-200 z-50 overflow-hidden"
                >
                  <div class="px-3 py-2.5 border-b border-neutral-100 flex items-center justify-between">
                    <span class="text-sm font-semibold text-neutral-900">Notifications</span>
                    @if (unreadCount() > 0) {
                      <button (click)="markAllAsRead()" class="text-xs text-primary hover:underline">
                        Mark all read
                      </button>
                    }
                  </div>

                  <div class="max-h-72 overflow-y-auto">
                    @if (recentNotifications().length === 0) {
                      <div class="px-3 py-6 text-center text-neutral-500">
                        <ui-icon name="bell" size="md" class="mx-auto mb-2 text-neutral-300" />
                        <p class="text-xs">No notifications</p>
                      </div>
                    } @else {
                      @for (notification of recentNotifications(); track notification._id) {
                        <div
                          (click)="markAsRead(notification._id)"
                          class="px-3 py-2.5 hover:bg-neutral-50 cursor-pointer border-b border-neutral-50 last:border-0"
                          [class.bg-primary/5]="!notification.isRead"
                        >
                          <div class="flex gap-2.5">
                            <div
                              class="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                              [class]="getNotificationClasses(notification.templateId)"
                            >
                              <ui-icon [name]="getNotificationIcon(notification.templateId)" size="xs" />
                            </div>
                            <div class="flex-1 min-w-0">
                              <p class="text-xs font-semibold text-neutral-900 truncate">{{ notification.title }}</p>
                              <p class="text-xs text-neutral-500 truncate">{{ notification.message }}</p>
                              <p class="text-[10px] text-neutral-400 mt-0.5">{{ getTimeAgo(notification.createdAt) }}</p>
                            </div>
                            @if (!notification.isRead) {
                              <div class="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0"></div>
                            }
                          </div>
                        </div>
                      }
                    }
                  </div>

                  @if (notifications().length > 0) {
                    <div class="px-3 py-2.5 border-t border-neutral-100">
                      <a
                        routerLink="/dashboard/notifications"
                        (click)="showNotifications.set(false)"
                        class="block w-full text-center text-xs text-primary hover:underline"
                      >
                        View all notifications
                      </a>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- User Menu -->
            <div class="relative">
              <button
                type="button"
                (click)="toggleUserMenu()"
                class="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                @if (userProfilePhoto()) {
                  <img [src]="userProfilePhoto()" alt="Profile" class="w-8 h-8 rounded-full object-cover" />
                } @else {
                  <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <span class="text-white text-sm font-medium">{{ userInitials() }}</span>
                  </div>
                }
                <ui-icon name="chevron-down" size="xs" class="text-neutral-600" />
              </button>

              <!-- User Dropdown -->
              @if (showUserMenu()) {
                <div
                  class="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 py-2 z-50"
                >
                  <div class="px-4 py-2 border-b border-neutral-200">
                    <p class="text-sm font-medium text-neutral-900">{{ userName() }}</p>
                    <p class="text-xs text-neutral-500">{{ userEmail() }}</p>
                  </div>
                  <a
                    routerLink="/dashboard/settings"
                    (click)="showUserMenu.set(false)"
                    class="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
                  >
                    <ui-icon name="settings" size="sm" />
                    <span>Settings</span>
                  </a>
                  <button
                    type="button"
                    (click)="logout()"
                    class="w-full flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors text-left"
                  >
                    <ui-icon name="external" size="sm" />
                    <span>Logout</span>
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Click outside to close dropdowns -->
    @if (showUserMenu() || showNotifications()) {
      <div class="fixed inset-0 z-40" (click)="closeDropdowns()"></div>
    }
  `,
})
export class UserDashboardNavbarComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authState = inject(AuthStateService);
  private readonly notificationService = inject(UserNotificationService);

  readonly webUrl = environment.webUrl;

  showUserMenu = signal(false);
  showNotifications = signal(false);

  // User info from auth state
  readonly userName = this.authState.userName;
  readonly userEmail = this.authState.userEmail;
  readonly userProfilePhoto = this.authState.userProfilePhoto;
  readonly userInitials = computed(() => {
    const name = this.userName();
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  });

  // Notifications from service
  readonly notifications = this.notificationService.notifications;
  readonly unreadCount = this.notificationService.unreadCount;
  readonly recentNotifications = computed(() =>
    this.notifications().slice(0, 5)
  );

  ngOnInit(): void {
    this.notificationService.loadNotifications();
  }

  toggleUserMenu() {
    this.showUserMenu.update((v) => !v);
    this.showNotifications.set(false);
  }

  toggleNotifications() {
    this.showNotifications.update((v) => !v);
    this.showUserMenu.set(false);
  }

  closeDropdowns() {
    this.showUserMenu.set(false);
    this.showNotifications.set(false);
  }

  markAsRead(notificationId: string) {
    this.notificationService.markAsRead(notificationId);
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  }

  getNotificationIcon(templateId?: string): 'check-circle' | 'error' | 'clock' | 'info' | 'bell' {
    if (!templateId) return 'bell';

    const lowerTemplateId = templateId.toLowerCase();
    if (lowerTemplateId.includes('booking') || lowerTemplateId.includes('confirmed'))
      return 'check-circle';
    if (lowerTemplateId.includes('cancelled') || lowerTemplateId.includes('rejected'))
      return 'error';
    if (lowerTemplateId.includes('reminder')) return 'clock';
    if (lowerTemplateId.includes('password') || lowerTemplateId.includes('otp'))
      return 'info';
    return 'info';
  }

  getNotificationClasses(templateId?: string): string {
    if (!templateId) return 'bg-info/10 text-info';

    const lowerTemplateId = templateId.toLowerCase();
    if (lowerTemplateId.includes('confirmed') || lowerTemplateId.includes('approved') || lowerTemplateId.includes('success'))
      return 'bg-success/10 text-success';
    if (lowerTemplateId.includes('cancelled') || lowerTemplateId.includes('rejected') || lowerTemplateId.includes('failed'))
      return 'bg-error/10 text-error';
    if (lowerTemplateId.includes('reminder') || lowerTemplateId.includes('pending'))
      return 'bg-warning/10 text-warning';
    return 'bg-info/10 text-info';
  }

  switchToHub() {
    this.router.navigate(['/hub']);
  }

  async logout() {
    this.showUserMenu.set(false);
    await this.authState.logout();
  }
}
