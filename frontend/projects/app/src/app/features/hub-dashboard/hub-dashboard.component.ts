import { Component, signal, computed, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { IconComponent, type IconName } from '@mereka/ui';
import { HubDashboardNavbarComponent } from '../../shared/components/navbar/hub-dashboard-navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { HubSidebarComponent } from './components/sidebar/hub-sidebar.component';
import { AuthStateService } from '../../core/services/auth-state.service';
import { environment } from '../../../environments/environment';
import { filter } from 'rxjs/operators';

interface MobileNavItem {
  label: string;
  path: string;
  icon: IconName;
}

@Component({
  selector: 'app-hub-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, IconComponent, HubDashboardNavbarComponent, FooterComponent, HubSidebarComponent],
  templateUrl: './hub-dashboard.component.html',
})
export class HubDashboardComponent implements OnInit {
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  readonly webUrl = environment.webUrl;

  // Hub data from auth state
  readonly hubName = computed(() => this.authState.selectedHub()?.name ?? 'My Hub');
  readonly hubLogo = computed(() => this.authState.selectedHub()?.logo ?? null);
  readonly unreadNotifications = signal(3);

  // Check if user is collaborator only (has collaborator role but not owner/admin)
  readonly isCollaboratorOnly = computed(() => {
    const hasCollaboratorRole = this.authState.hasRole('collaborator');
    const hasOwnerRole = this.authState.hasRole('owner');
    const hasAdminRole = this.authState.hasRole('admin');
    // Collaborator-only users have collaborator role but not owner/admin
    return hasCollaboratorRole && !hasOwnerRole && !hasAdminRole;
  });

  // Responsive state
  readonly screenWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1024);
  readonly isMobile = computed(() => this.screenWidth() < 1024);

  // Route state - show sidebar only on hub overview page (not for collaborators)
  readonly currentRoute = signal('');
  readonly showSidebar = computed(() => {
    // Never show sidebar for collaborators
    if (this.isCollaboratorOnly()) {
      return false;
    }
    const route = this.currentRoute();
    // Only show sidebar on the main hub overview page
    return route === '' || route === 'overview';
  });

  // Mobile bottom navigation items - dynamic based on user role
  readonly mobileNavItems = computed<MobileNavItem[]>(() => {
    const homePath = this.isCollaboratorOnly() ? 'collaborator-dashboard' : 'overview';
    return [
      { label: 'Home', path: homePath, icon: 'home' },
      { label: 'Services', path: 'services/experiences', icon: 'briefcase' },
      { label: 'Bookings', path: 'bookings', icon: 'calendar' },
      { label: 'Finances', path: 'settings/transactions', icon: 'dollar' },
      { label: 'Menu', path: 'menu', icon: 'menu' },
    ];
  });

  constructor() {
    // Set initial route
    this.updateCurrentRoute(this.router.url);

    // Listen for route changes
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.updateCurrentRoute((event as NavigationEnd).urlAfterRedirects);
      });
  }

  ngOnInit(): void {
    // Handle role-based redirects
    this.handleRoleBasedRedirect();
  }

  private handleRoleBasedRedirect(): void {
    const currentUrl = this.router.url;
    const isCollaborator = this.isCollaboratorOnly();

    // If user is collaborator-only and on the overview page, redirect to collaborator dashboard
    if (isCollaborator && (currentUrl === '/hub' || currentUrl === '/hub/overview' || currentUrl.startsWith('/hub/overview?'))) {
      this.router.navigate(['/hub/collaborator-dashboard'], { replaceUrl: true });
      return;
    }

    // If user is NOT collaborator-only but on collaborator dashboard, redirect to overview
    if (!isCollaborator && (currentUrl === '/hub/collaborator-dashboard' || currentUrl.startsWith('/hub/collaborator-dashboard?'))) {
      this.router.navigate(['/hub/overview'], { replaceUrl: true });
      return;
    }
  }

  private updateCurrentRoute(url: string): void {
    // Extract the child route from /hub/xxx
    const match = url.match(/\/hub\/(.+?)(?:\?|$)/);
    this.currentRoute.set(match ? match[1] : 'overview');
  }

  @HostListener('window:resize')
  onResize() {
    this.screenWidth.set(window.innerWidth);
  }
}
