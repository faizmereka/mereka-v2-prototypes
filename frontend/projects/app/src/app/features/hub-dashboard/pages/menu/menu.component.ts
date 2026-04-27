import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent, type IconName } from '@mereka/ui';
import { AuthStateService } from '../../../../core/services/auth-state.service';

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface MenuItem {
  label: string;
  routerLink: string;
  icon: IconName;
  external?: boolean;
}

@Component({
  selector: 'app-hub-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  templateUrl: './menu.component.html',
})
export class HubMenuComponent {
  private readonly authStateService = inject(AuthStateService);

  readonly hubName = signal('Creative Studios');
  readonly hubLogo = signal<string | null>(null);
  readonly userName = signal('John Doe');
  readonly userEmail = signal('john@example.com');

  readonly menuSections = signal<MenuSection[]>([
    {
      title: 'Account',
      items: [
        { label: 'My Expert Profile', routerLink: '/profile', icon: 'user' },
        { label: 'Business Profile', routerLink: '/hub/profile', icon: 'briefcase' },
        { label: 'Notifications', routerLink: '/hub/notifications', icon: 'bell' },
        { label: 'Settings', routerLink: '/hub/settings', icon: 'settings' },
      ],
    },
    {
      title: 'Dashboard',
      items: [
        { label: 'Overview', routerLink: '/hub/overview', icon: 'home' },
        { label: 'Calendar', routerLink: '/hub/calendar', icon: 'calendar' },
        { label: 'Bookings', routerLink: '/hub/bookings', icon: 'calendar' },
        { label: 'Chats', routerLink: '/hub/chats', icon: 'message' },
        { label: 'Members', routerLink: '/hub/members', icon: 'users' },
        { label: 'Finances', routerLink: '/hub/settings/transactions', icon: 'dollar' },
        { label: 'Analytics', routerLink: '/hub/analytics', icon: 'chart' },
      ],
    },
    {
      title: 'Manage Services',
      items: [
        { label: 'Experiences', routerLink: '/hub/services/experiences', icon: 'calendar' },
        { label: 'Expertise', routerLink: '/hub/services/expertise', icon: 'users' },
      ],
    },
    {
      title: 'Jobs',
      items: [
        { label: 'Job Posts', routerLink: '/hub/jobs/posts', icon: 'briefcase' },
        { label: 'All Applications', routerLink: '/hub/jobs/applications', icon: 'file' },
      ],
    },
    {
      title: 'Support',
      items: [
        { label: 'Resources', routerLink: 'http://resources.mereka.io/', icon: 'book', external: true },
        { label: 'Help Center', routerLink: 'https://help.mereka.io/hc/', icon: 'help-circle', external: true },
      ],
    },
  ]);

  hubInitials() {
    return this.hubName()
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  logout() {
    console.log('Hub menu logout clicked');
    this.authStateService.logout();
  }

  switchToLearner() {
    // TODO: Implement switch to learner dashboard
    console.log('Switch to learner dashboard');
  }
}
