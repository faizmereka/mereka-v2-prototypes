import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent, UiSkeletonDashboardComponent } from '@mereka/ui';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { HubDashboardService, type SetupPrompt } from '../../services/hub-dashboard.service';

interface ListingType {
  id: string;
  label: string;
  count: number;
  icon: string;
  iconBg: string;
  locked?: boolean;
}

@Component({
  selector: 'app-hub-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent, UiSkeletonDashboardComponent],
  templateUrl: './overview.component.html',
})
export class HubOverviewComponent implements OnInit {
  private readonly authState = inject(AuthStateService);
  private readonly dashboardService = inject(HubDashboardService);

  // From auth state
  readonly userName = computed(() => this.authState.user()?.name ?? 'User');

  // From dashboard service
  readonly loading = this.dashboardService.loading;
  readonly error = this.dashboardService.error;
  readonly totalEarnings = this.dashboardService.totalEarnings;
  readonly currency = this.dashboardService.currency;
  readonly activeOrdersCount = this.dashboardService.activeOrdersCount;
  readonly activeOrdersTotal = this.dashboardService.activeOrdersTotal;
  readonly serviceRequests = this.dashboardService.serviceRequests;
  readonly experienceBookings = this.dashboardService.experienceBookings;
  readonly setupPrompts = this.dashboardService.setupPrompts;

  // Setup prompts carousel
  readonly currentPromptIndex = signal(0);

  // Collapsible sections
  readonly serviceRequestsExpanded = signal(true);
  readonly experienceBookingsExpanded = signal(true);

  // My Listings - computed from service
  readonly listingTypes = computed<ListingType[]>(() => {
    const counts = this.dashboardService.listingCounts();
    return [
      { id: 'services', label: 'Services', count: counts.services, icon: 'briefcase', iconBg: 'bg-neutral-100' },
      { id: 'experiences', label: 'Experiences', count: counts.experiences, icon: 'compass', iconBg: 'bg-blue-50' },
      { id: 'gigs', label: 'Gigs', count: counts.gigs, icon: 'message', iconBg: 'bg-neutral-100' },
      { id: 'spaces', label: 'Spaces', count: counts.spaces, icon: 'building', iconBg: 'bg-neutral-100', locked: true },
    ];
  });

  // Computed for prompts carousel
  readonly visiblePrompts = computed(() => {
    const prompts = this.setupPrompts();
    const index = this.currentPromptIndex();
    return prompts.slice(index, index + 2);
  });

  readonly hasMorePrompts = computed(() => this.setupPrompts().length > 2);
  readonly canGoPrev = computed(() => this.currentPromptIndex() > 0);
  readonly canGoNext = computed(() => this.currentPromptIndex() + 2 < this.setupPrompts().length);

  ngOnInit(): void {
    this.dashboardService.loadDashboard();
  }

  prevPrompt(): void {
    if (this.canGoPrev()) {
      this.currentPromptIndex.update((i) => i - 1);
    }
  }

  nextPrompt(): void {
    if (this.canGoNext()) {
      this.currentPromptIndex.update((i) => i + 1);
    }
  }

  dismissPrompt(promptId: string): void {
    this.dashboardService.dismissPrompt(promptId);
    if (this.currentPromptIndex() >= this.setupPrompts().length - 1) {
      this.currentPromptIndex.set(Math.max(0, this.setupPrompts().length - 2));
    }
  }

  toggleServiceRequests(): void {
    this.serviceRequestsExpanded.update((v) => !v);
  }

  toggleExperienceBookings(): void {
    this.experienceBookingsExpanded.update((v) => !v);
  }

  formatCurrency(value: number): string {
    return this.dashboardService.formatCurrency(value);
  }

  refresh(): void {
    this.dashboardService.refresh();
  }
}
