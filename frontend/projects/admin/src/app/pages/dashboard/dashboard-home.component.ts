import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StatCardComponent, CardComponent, SectionHeaderComponent } from '../../shared/ui';
import { DashboardService, type DashboardStats } from './dashboard.service';
import { NotificationService } from '../notifications/notification.service';

interface StatCard {
  label: string;
  value: string;
  icon: string;
  route: string;
  subStats?: { label: string; value: number }[];
}

@Component({
  selector: 'app-dashboard-home',
  imports: [StatCardComponent, CardComponent, SectionHeaderComponent, DecimalPipe, RouterLink],
  templateUrl: './dashboard-home.component.html',
  styleUrl: './dashboard-home.component.scss'
})
export class DashboardHomeComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private notificationService = inject(NotificationService);

  isLoading = signal(true);
  error = signal<string | null>(null);
  stats = signal<DashboardStats | null>(null);

  statCards = signal<StatCard[]>([]);

  // Communication stats from notification service
  readonly commStats = this.notificationService.stats;
  readonly commStatsLoading = this.notificationService.statsLoading;
  readonly totalNotifications = this.notificationService.totalNotifications;
  readonly deliveredNotifications = this.notificationService.deliveredCount;
  readonly readNotifications = this.notificationService.readCount;
  readonly failedNotifications = this.notificationService.failedCount;

  quickLinks = [
    { label: 'Hubs', icon: 'hub.svg', route: '/dashboard/hubs' },
    { label: 'Jobs', icon: 'jobs.svg', route: '/dashboard/jobs' },
    { label: 'Services', icon: 'services.svg', route: '/dashboard/services' },
    { label: 'Users', icon: 'users.svg', route: '/dashboard/users' },
    { label: 'Email', icon: 'email.svg', route: '/dashboard/email' },
    { label: 'Settings', icon: 'settings.svg', route: '/dashboard/settings' },
  ];

  ngOnInit() {
    this.loadStats();
    this.loadCommStats();
  }

  loadCommStats() {
    this.notificationService.getStats().subscribe({
      error: (err) => {
        console.error('Error loading communication stats:', err);
      },
    });
  }

  loadStats() {
    this.isLoading.set(true);
    this.error.set(null);

    this.dashboardService.getStats().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.stats.set(response.data);
          this.buildStatCards(response.data);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading dashboard stats:', err);
        this.error.set('Failed to load dashboard statistics');
        this.isLoading.set(false);
        // Set fallback stats
        this.statCards.set([
          { label: 'Total Users', value: '-', icon: 'users.svg', route: '/dashboard/users' },
          { label: 'Total Hubs', value: '-', icon: 'hub.svg', route: '/dashboard/hubs' },
          { label: 'Active Jobs', value: '-', icon: 'jobs.svg', route: '/dashboard/jobs' },
          { label: 'Active Contracts', value: '-', icon: 'contract.svg', route: '/dashboard/jobs/contracts' },
        ]);
      },
    });
  }

  private buildStatCards(data: DashboardStats) {
    this.statCards.set([
      {
        label: 'Total Users',
        value: this.formatNumber(data.users.total),
        icon: 'users.svg',
        route: '/dashboard/users',
        subStats: [
          { label: 'Active', value: data.users.active },
          { label: 'New this month', value: data.users.newThisMonth },
        ],
      },
      {
        label: 'Total Hubs',
        value: this.formatNumber(data.hubs.total),
        icon: 'hub.svg',
        route: '/dashboard/hubs',
        subStats: [
          { label: 'Active', value: data.hubs.active },
          { label: 'Pending', value: data.hubs.pending },
        ],
      },
      {
        label: 'Total Jobs',
        value: this.formatNumber(data.jobs.total),
        icon: 'jobs.svg',
        route: '/dashboard/jobs',
        subStats: [
          { label: 'Active', value: data.jobs.active },
          { label: 'In Progress', value: data.jobs.inProgress },
        ],
      },
      {
        label: 'Contracts',
        value: this.formatNumber(data.contracts.total),
        icon: 'contract.svg',
        route: '/dashboard/jobs/contracts',
        subStats: [
          { label: 'Active', value: data.contracts.active },
          { label: 'Completed', value: data.contracts.completed },
        ],
      },
      {
        label: 'Proposals',
        value: this.formatNumber(data.proposals.total),
        icon: 'proposal.svg',
        route: '/dashboard/jobs/proposals',
        subStats: [
          { label: 'Pending', value: data.proposals.pending },
          { label: 'Accepted', value: data.proposals.accepted },
        ],
      },
      {
        label: 'Experiences',
        value: this.formatNumber(data.experiences.total),
        icon: 'services.svg',
        route: '/dashboard/services',
        subStats: [
          { label: 'Published', value: data.experiences.published },
          { label: 'Draft', value: data.experiences.draft },
        ],
      },
      {
        label: 'Expertise',
        value: this.formatNumber(data.expertise.total),
        icon: 'expertise.svg',
        route: '/dashboard/services',
        subStats: [
          { label: 'Published', value: data.expertise.published },
          { label: 'Draft', value: data.expertise.draft },
        ],
      },
    ]);
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  }
}
