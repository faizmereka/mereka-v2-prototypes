import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  children?: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  isExpanded = signal(false);

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'home.svg', route: '/dashboard' },
    { label: 'Hubs', icon: 'hub.svg', route: '/dashboard/hubs' },
    {
      label: 'Bookings',
      icon: 'check.svg',
      route: '/dashboard/bookings',
      children: [
        { label: 'All Bookings', icon: '', route: '/dashboard/bookings' },
        { label: 'Calendar', icon: '', route: '/dashboard/bookings/calendar' },
      ],
    },
    {
      label: 'Services',
      icon: 'services.svg',
      route: '/dashboard/services',
      children: [
        { label: 'Experiences', icon: '', route: '/dashboard/services/experiences' },
        { label: 'Expertise', icon: '', route: '/dashboard/services/expertise' },
      ],
    },
    {
      label: 'Jobs',
      icon: 'jobs.svg',
      route: '/dashboard/jobs',
      children: [
        { label: 'All Jobs', icon: '', route: '/dashboard/jobs' },
        { label: 'Proposals', icon: '', route: '/dashboard/jobs/proposals' },
        { label: 'Contracts', icon: '', route: '/dashboard/jobs/contracts' },
        { label: 'Contract Payments', icon: '', route: '/dashboard/jobs/payments' },
        { label: 'Pending Payments', icon: '', route: '/dashboard/jobs/pending' },
      ],
    },
    {
      label: 'Reviews',
      icon: 'chat.svg',
      route: '/dashboard/reviews',
      children: [
        { label: 'All Reviews', icon: '', route: '/dashboard/reviews' },
        { label: 'Booking Reviews', icon: '', route: '/dashboard/reviews/bookings' },
        { label: 'Contract Reviews', icon: '', route: '/dashboard/reviews/contracts' },
      ],
    },
    { label: 'Favorites', icon: 'heart.svg', route: '/dashboard/favorites' },
    {
      label: 'Users',
      icon: 'users.svg',
      route: '/dashboard/users',
      children: [
        { label: 'All Users', icon: '', route: '/dashboard/users' },
        { label: 'Roles & Permissions', icon: '', route: '/dashboard/settings/roles' },
      ],
    },
    {
      label: 'Subscriptions',
      icon: 'credit-card.svg',
      route: '/dashboard/subscriptions',
      children: [
        { label: 'All Subscriptions', icon: '', route: '/dashboard/subscriptions' },
        { label: 'Plans', icon: '', route: '/dashboard/subscriptions/plans' },
      ],
    },
    {
      label: 'Finance',
      icon: 'dollar.svg',
      route: '/dashboard/finance',
      children: [
        { label: 'Overview', icon: '', route: '/dashboard/finance' },
        { label: 'Transactions', icon: '', route: '/dashboard/finance/transactions' },
        { label: 'Withdrawals', icon: '', route: '/dashboard/finance/withdrawals' },
        { label: 'Banks', icon: '', route: '/dashboard/banks' },
      ],
    },
    {
      label: 'API Monitoring',
      icon: 'stacked_line_chart.svg',
      route: '/dashboard/monitoring',
      children: [
        { label: 'API Logs', icon: '', route: '/dashboard/monitoring/logs' },
        { label: 'Cron Jobs', icon: '', route: '/dashboard/monitoring/cron-jobs' },
        { label: 'Alerts & Security', icon: '', route: '/dashboard/monitoring/alerts' },
        { label: 'Statistics', icon: '', route: '/dashboard/monitoring/stats' },
        { label: 'Rate Limits', icon: '', route: '/dashboard/monitoring/config' },
      ],
    },
    {
      label: 'Email',
      icon: 'email.svg',
      route: '/dashboard/email',
      children: [
        { label: 'All Emails', icon: '', route: '/dashboard/email' },
        { label: 'Templates', icon: '', route: '/dashboard/email/templates' },
        { label: 'Logs', icon: '', route: '/dashboard/email/logs' },
      ],
    },
    {
      label: 'Notifications',
      icon: 'bell.svg',
      route: '/dashboard/notifications',
      children: [
        { label: 'Templates', icon: '', route: '/dashboard/notifications/templates' },
        { label: 'Logs', icon: '', route: '/dashboard/notifications/logs' },
      ],
    },
    {
      label: 'WhatsApp',
      icon: 'chat.svg',
      route: '/dashboard/whatsapp',
      children: [
        { label: 'Templates', icon: '', route: '/dashboard/whatsapp/templates' },
        { label: 'Logs', icon: '', route: '/dashboard/whatsapp/logs' },
      ],
    },
    { label: 'Settings', icon: 'settings.svg', route: '/dashboard/settings' },
    { label: 'Admins', icon: 'icon-users.svg', route: '/dashboard/admins' },
  ];

  expand() {
    this.isExpanded.set(true);
  }

  collapse() {
    this.isExpanded.set(false);
  }
}
