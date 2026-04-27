import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent, type IconName } from '@mereka/ui';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { HubDashboardService } from '../../services/hub-dashboard.service';

interface QuickAction {
  label: string;
  icon: IconName;
  path: string;
}

interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-hub-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './hub-sidebar.component.html',
})
export class HubSidebarComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authState = inject(AuthStateService);
  private readonly dashboardService = inject(HubDashboardService);

  // Hub profile data from auth state
  readonly accountLabel = computed(() => 'Hub');
  readonly hubName = computed(() => this.authState.selectedHub()?.name ?? 'Hub');
  readonly hubLogo = computed(() => this.authState.selectedHub()?.logo ?? null);
  readonly accountType = computed(() =>
    this.dashboardService.onboardingStatus()?.subscription?.planName ?? 'FREE'
  );

  // Profile progress from dashboard service
  readonly profileProgress = computed(() =>
    this.dashboardService.onboardingStatus()?.profileCompletionPercentage ?? 0
  );

  // Stats from dashboard service
  readonly overallRating = computed(() => null); // TODO: Add to dashboard API
  readonly totalReviews = computed(() => null); // TODO: Add to dashboard API
  readonly responseRate = computed(() => null); // TODO: Add to dashboard API

  // Menu counts
  readonly coursesCount = computed(() => 0); // TODO: Add to dashboard API

  // Calendar
  readonly calendarDays = computed<CalendarDay[]>(() => {
    // Generate calendar for current view (showing Nov 26 - Dec 16 based on design)
    const days: CalendarDay[] = [];
    // Previous month days (26-30)
    for (let i = 26; i <= 30; i++) {
      days.push({ day: i, isCurrentMonth: false, isToday: false });
    }
    // Current month days (1-16)
    for (let i = 1; i <= 16; i++) {
      days.push({ day: i, isCurrentMonth: true, isToday: i === 15 });
    }
    return days;
  });

  // Quick actions
  readonly quickActions = signal<QuickAction[]>([
    { label: 'Visit Business Profile', icon: 'briefcase', path: '/hub/profile' },
    { label: 'Manage Job Posts', icon: 'file', path: '/hub/jobs/posts' },
    { label: 'Add a Service', icon: 'settings', path: '/hub/services/create' },
    { label: 'Manage your Settings', icon: 'settings', path: '/hub/settings' },
    { label: 'Invite Team Members', icon: 'users', path: '/hub/team/invite' },
    { label: 'Get Help', icon: 'info', path: '/hub/help' },
  ]);

  // Hub initials computed
  hubInitials = computed(() => {
    return this.hubName()
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  });

  ngOnInit(): void {
    // Load dashboard data (uses cache if available)
    this.dashboardService.loadDashboard();
  }

  completeProfile(): void {
    this.router.navigate(['/onboarding/hub/profile']);
  }

  fulfillOrders(): void {
    console.log('Fulfill orders clicked');
  }
}
