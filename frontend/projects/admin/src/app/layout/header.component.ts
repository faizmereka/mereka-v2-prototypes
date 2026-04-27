import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'error';
}

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private routerSubscription?: Subscription;

  // Dynamic page title based on route
  pageTitle = signal('Dashboard');

  // User dropdown
  showUserMenu = signal(false);
  userName = signal('Admin User');
  userEmail = signal('admin@mereka.com');

  // Notifications
  showNotifications = signal(false);
  notifications = signal<Notification[]>([
    { id: '1', title: 'New User Registration', message: 'John Doe just signed up', time: '5 min ago', read: false, type: 'info' },
    { id: '2', title: 'Payment Received', message: 'Payment of RM 500 received', time: '1 hour ago', read: false, type: 'success' },
    { id: '3', title: 'System Alert', message: 'High API usage detected', time: '2 hours ago', read: true, type: 'warning' },
  ]);

  unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  // Route to title mapping
  private routeTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/dashboard/hubs': 'Hubs',
    '/dashboard/bookings': 'Bookings',
    '/dashboard/bookings/calendar': 'Bookings',
    '/dashboard/bookings/sales': 'Bookings',
    '/dashboard/services': 'Services',
    '/dashboard/services/experiences': 'Services',
    '/dashboard/services/expertise': 'Services',
    '/dashboard/jobs': 'Jobs',
    '/dashboard/jobs/proposals': 'Jobs',
    '/dashboard/jobs/contracts': 'Jobs',
    '/dashboard/users': 'Users',
    '/dashboard/subscriptions': 'Subscriptions',
    '/dashboard/subscriptions/plans': 'Subscriptions',
    '/dashboard/finance': 'Finance',
    '/dashboard/finance/withdrawals': 'Finance',
    '/dashboard/finance/pending': 'Finance',
    '/dashboard/finance/transactions': 'Finance',
    '/dashboard/monitoring': 'API Monitoring',
    '/dashboard/monitoring/logs': 'API Monitoring',
    '/dashboard/monitoring/alerts': 'API Monitoring',
    '/dashboard/monitoring/quotas': 'API Monitoring',
    '/dashboard/monitoring/stats': 'API Monitoring',
    '/dashboard/email': 'Email',
    '/dashboard/email/templates': 'Email',
    '/dashboard/email/logs': 'Email',
    '/dashboard/notifications': 'Notifications',
    '/dashboard/notifications/templates': 'Notifications',
    '/dashboard/notifications/logs': 'Notifications',
    '/dashboard/settings': 'Settings',
    '/dashboard/settings/roles': 'Roles & Permissions',
  };

  ngOnInit() {
    // Set initial title
    this.updatePageTitle(this.router.url);

    // Listen for route changes
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        const navEvent = event as NavigationEnd;
        this.updatePageTitle(navEvent.urlAfterRedirects);
      });
  }

  ngOnDestroy() {
    this.routerSubscription?.unsubscribe();
  }

  private updatePageTitle(url: string) {
    // Remove query params
    const path = url.split('?')[0];

    // Find exact match first
    if (this.routeTitles[path]) {
      this.pageTitle.set(this.routeTitles[path]);
      return;
    }

    // Find parent route match (for detail pages like /dashboard/users/123)
    const segments = path.split('/').filter(Boolean);
    while (segments.length > 0) {
      const testPath = '/' + segments.join('/');
      if (this.routeTitles[testPath]) {
        this.pageTitle.set(this.routeTitles[testPath]);
        return;
      }
      segments.pop();
    }

    // Default
    this.pageTitle.set('Dashboard');
  }

  toggleUserMenu() {
    this.showUserMenu.update(v => !v);
    this.showNotifications.set(false);
  }

  toggleNotifications() {
    this.showNotifications.update(v => !v);
    this.showUserMenu.set(false);
  }

  closeDropdowns() {
    this.showUserMenu.set(false);
    this.showNotifications.set(false);
  }

  markAsRead(notification: Notification) {
    this.notifications.update(notifications =>
      notifications.map(n =>
        n.id === notification.id ? { ...n, read: true } : n
      )
    );
  }

  markAllAsRead() {
    this.notifications.update(notifications =>
      notifications.map(n => ({ ...n, read: true }))
    );
  }

  clearNotifications() {
    this.notifications.set([]);
  }

  logout() {
    this.router.navigate(['/login']);
  }

  getNotificationIcon(type: Notification['type']): string {
    const icons: Record<Notification['type'], string> = {
      info: 'info.svg',
      warning: 'warning.svg',
      success: 'check.svg',
      error: 'error.svg',
    };
    return icons[type];
  }

  getNotificationClasses(type: Notification['type']): string {
    const classes: Record<Notification['type'], string> = {
      info: 'bg-blue-100 text-blue-600',
      warning: 'bg-yellow-100 text-yellow-600',
      success: 'bg-green-100 text-green-600',
      error: 'bg-red-100 text-red-600',
    };
    return classes[type];
  }
}
