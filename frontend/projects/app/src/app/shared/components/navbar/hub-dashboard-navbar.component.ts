import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { IconComponent } from '@mereka/ui';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { HubNotificationService } from '../../../features/hub-dashboard/services/hub-notification.service';
import { environment } from '../../../../environments/environment';
import { firstValueFrom } from 'rxjs';

interface NavMenuItem {
  title: string;
  routerLink: string;
  items?: { title: string; routerLink: string; }[];
}

@Component({
  selector: 'app-hub-dashboard-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './hub-dashboard-navbar.component.html',
})
export class HubDashboardNavbarComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authState = inject(AuthStateService);
  private readonly http = inject(HttpClient);
  private readonly notificationService = inject(HubNotificationService);

  readonly webUrl = environment.webUrl;
  readonly apiUrl = environment.apiUrl;
  readonly expertUsername = signal<string | null>(null);

  readonly showHubMenu = signal(false);
  readonly showNotifications = signal(false);
  readonly showSwitchOrg = signal(false);
  readonly activeDropdown = signal<string | null>(null);

  // Get hub info from auth state
  readonly hubName = computed(() => this.authState.selectedHub()?.name || '');
  readonly hubLogo = computed(() => this.authState.selectedHub()?.logo || null);
  readonly userName = computed(() => this.authState.userName());
  readonly userEmail = computed(() => this.authState.userEmail());
  readonly userProfilePhoto = computed(() => this.authState.userProfilePhoto());
  readonly allHubs = computed(() => this.authState.hubs());

  // Notifications from service
  readonly notifications = this.notificationService.notifications;
  readonly unreadCount = computed(() =>
    this.notifications().filter((n) => !n.isRead).length
  );
  readonly recentNotifications = computed(() =>
    this.notifications().slice(0, 5)
  );

  // Check if user is collaborator only (has collaborator role but not owner/admin)
  readonly isCollaboratorOnly = computed(() => {
    const hasCollaboratorRole = this.authState.hasRole('collaborator');
    const hasOwnerRole = this.authState.hasRole('owner');
    const hasAdminRole = this.authState.hasRole('admin');
    return hasCollaboratorRole && !hasOwnerRole && !hasAdminRole;
  });

  // Desktop navbar menu items - empty for collaborators
  readonly menuItems = computed<NavMenuItem[]>(() => {
    if (this.isCollaboratorOnly()) {
      return [];
    }
    return [
      { title: 'Overview', routerLink: '/hub/overview' },
      { title: 'Calendar', routerLink: '/hub/calendar' },
      { title: 'Bookings', routerLink: '/hub/bookings' },
      { title: 'Chats', routerLink: '/hub/chats' },
      {
        title: 'Manage Services',
        routerLink: '/hub/services',
        items: [
          { title: 'Experiences', routerLink: '/hub/services/experiences' },
          { title: 'Expertise', routerLink: '/hub/services/expertise' },
        ],
      },
      {
        title: 'Jobs',
        routerLink: '/hub/jobs',
        items: [
          { title: 'Job Posts', routerLink: '/hub/jobs/posts' },
          { title: 'All Applications', routerLink: '/hub/jobs/applications' },
        ],
      },
    ];
  });

  // Expert profile URL for "My Expert Profile" link
  readonly expertProfileUrl = computed(() => {
    const username = this.expertUsername();
    if (username) {
      return `${this.webUrl}/expert/${username}`;
    }
    return null;
  });

  // Public hub profile URL for "Business Profile" link
  readonly hubProfileUrl = computed(() => {
    const slug = this.authState.selectedHub()?.slug;
    if (slug) {
      return `${this.webUrl}/hub/${slug}`;
    }
    return null;
  });

  ngOnInit(): void {
    this.loadExpertProfile();
    this.notificationService.loadNotifications();
  }

  viewAllNotifications(): void {
    this.showNotifications.set(false);
    this.router.navigate(['/hub/notifications']);
  }

  markNotificationAsRead(notificationId: string): void {
    this.notificationService.markAsRead(notificationId);
  }

  private async loadExpertProfile(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<{ success: boolean; data?: { username?: string } }>(`${this.apiUrl}/expert/profile/me`)
      );
      if (response.success && response.data?.username) {
        this.expertUsername.set(response.data.username);
      }
    } catch {
      // User may not have an expert profile yet
      this.expertUsername.set(null);
    }
  }

  navigateToExpertProfile(): void {
    const url = this.expertProfileUrl();
    if (url) {
      window.open(url, '_blank');
    } else {
      // No expert profile, navigate to onboarding to create one
      this.router.navigate(['/onboarding/expert']);
    }
    this.showHubMenu.set(false);
  }

  hubInitials() {
    const name = this.hubName();
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  userInitials() {
    const name = this.userName();
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  toggleDropdown(menuTitle: string) {
    if (this.activeDropdown() === menuTitle) {
      this.activeDropdown.set(null);
    } else {
      this.activeDropdown.set(menuTitle);
    }
  }

  closeDropdowns() {
    this.activeDropdown.set(null);
  }

  toggleHubMenu() {
    this.showHubMenu.update((v) => !v);
    this.showNotifications.set(false);
    this.showSwitchOrg.set(false);
    this.activeDropdown.set(null);
  }

  toggleNotifications() {
    this.showNotifications.update((v) => !v);
    this.showHubMenu.set(false);
    this.showSwitchOrg.set(false);
    this.activeDropdown.set(null);
  }

  toggleSwitchOrg() {
    this.showSwitchOrg.update((v) => !v);
    this.showHubMenu.set(false);
    this.showNotifications.set(false);
    this.activeDropdown.set(null);
  }

  switchToHub(hubId: string): void {
    const currentHubId = this.authState.selectedHub()?.id;
    if (hubId === currentHubId) {
      this.showSwitchOrg.set(false);
      return;
    }

    // Switch hub
    this.authState.selectHub(hubId);

    // Navigate to base hub route and reload - let hub-dashboard handle role-based redirect
    window.location.href = '/hub';
  }

  isCurrentHub(hubId: string): boolean {
    return this.authState.selectedHub()?.id === hubId;
  }

  getHubInitials(hubName: string): string {
    return hubName
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getHubRolesText(roles?: { name: string; }[]): string {
    if (!roles || roles.length === 0) return '';
    return roles.map((r) => r.name).join(', ');
  }

  switchToUser() {
    this.router.navigate(['/dashboard']);
  }

  async logout() {
    this.showHubMenu.set(false);
    await this.authState.logout();
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
}
