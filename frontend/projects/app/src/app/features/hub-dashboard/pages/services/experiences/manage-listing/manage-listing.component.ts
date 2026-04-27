import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, ActivatedRoute, NavigationEnd } from '@angular/router';
import { ExperienceApiService, type Experience } from '../../../../../onboarding/experience/services/experience-api.service';
import { filter } from 'rxjs/operators';
import { environment } from '../../../../../../../environments/environment';

interface SidebarMenuItem {
  id: string;
  label: string;
  route: string;
}

interface ExperienceAnalytics {
  totalSales: number;
  totalBookings: number;
  pageViews: number;
  pageShares: number;
  pageFavorites: number;
}

@Component({
  selector: 'app-manage-experience-listing',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './manage-listing.component.html',
})
export class ManageExperienceListingComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly experienceApi = inject(ExperienceApiService);

  readonly loading = signal(true);
  readonly experience = signal<Experience | null>(null);
  readonly experienceId = signal('');
  readonly currentRoute = signal('overview');

  // Sidebar menu items
  readonly sidebarMenuItems: SidebarMenuItem[] = [
    { id: 'overview', label: 'Overview', route: 'overview' },
    { id: 'sessions', label: 'Sessions', route: 'sessions' },
    { id: 'hosts', label: 'Hosts', route: 'hosts' },
    { id: 'bookings', label: 'Bookings', route: 'bookings' },
    { id: 'analytics', label: 'Reviews & Ratings', route: 'analytics' },
  ];

  // Analytics data - computed from experience stats
  readonly analytics = computed<ExperienceAnalytics>(() => {
    const exp = this.experience();
    if (!exp) {
      return {
        totalSales: 0,
        totalBookings: 0,
        pageViews: 0,
        pageShares: 0,
        pageFavorites: 0,
      };
    }

    // Use stats from API response
    const stats = exp.stats;

    // Calculate total sales (bookings * average ticket price)
    const avgTicketPrice = exp.ticket?.length
      ? exp.ticket.reduce((sum, t) => sum + t.ticketPrice, 0) / exp.ticket.length
      : 0;
    const totalSales = (stats?.totalBookings || 0) * avgTicketPrice;

    return {
      totalSales,
      totalBookings: stats?.totalBookings || 0,
      pageViews: stats?.pageViews || exp.views || 0,
      pageShares: 0, // TODO: Implement when share tracking is available
      pageFavorites: 0, // TODO: Implement when favorites tracking is available
    };
  });

  readonly statusClass = computed(() => {
    const exp = this.experience();
    if (!exp) return '';
    switch (exp.status) {
      case 'ACTIVE':
        return 'bg-[rgba(52,168,83,0.3)] text-black';
      case 'DRAFTED':
        return 'bg-[#1A1623] text-white';
      case 'DELETED':
        return 'bg-[#F7BFAF] text-black';
      default:
        return 'bg-neutral-100 text-black';
    }
  });

  readonly statusLabel = computed(() => {
    const exp = this.experience();
    if (!exp) return '';
    if (exp.listingType === 'express') return 'EXPRESS';
    return exp.status;
  });

  constructor() {
    // Listen for route changes to update current route
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.updateCurrentRoute((event as NavigationEnd).urlAfterRedirects);
      });
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('experienceId');
    if (id) {
      this.experienceId.set(id);
      await this.loadExperience(id);
    }

    // Set initial route
    this.updateCurrentRoute(this.router.url);
  }

  private updateCurrentRoute(url: string): void {
    // Extract the tab from URL: /hub/services/experiences/:id/manage/overview
    const match = url.match(/\/manage\/([^/?]+)/);
    this.currentRoute.set(match ? match[1] : 'overview');
  }

  private async loadExperience(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const exp = await this.experienceApi.getById(id);
      this.experience.set(exp);
    } catch (error) {
      console.error('Error loading experience:', error);
    } finally {
      this.loading.set(false);
    }
  }

  navigateToTab(route: string): void {
    this.router.navigate([route], { relativeTo: this.route });
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute() === route || this.currentRoute().startsWith(route + '/');
  }

  getActiveTabLabel(): string {
    const activeItem = this.sidebarMenuItems.find((item) => this.isActiveRoute(item.route));
    return activeItem?.label || 'Overview';
  }

  goBack(): void {
    this.router.navigate(['/hub/services/experiences']);
  }

  editExperience(): void {
    const exp = this.experience();
    if (!exp) return;
    // Return to this manage page after editing
    const returnUrl = `/hub/services/experiences/${exp._id}/manage`;
    if (exp.listingType === 'express') {
      this.router.navigate(['/onboarding/experience/express', exp._id], {
        queryParams: { returnUrl }
      });
    } else {
      this.router.navigate(['/onboarding/experience/platform', exp._id, 'basic-info'], {
        queryParams: { returnUrl }
      });
    }
  }

  viewPage(): void {
    const exp = this.experience();
    if (exp?.slug) {
      window.open(`${environment.webUrl}/experience/${exp.slug}`, '_blank');
    }
  }

  shareReviewLink(): void {
    // TODO: Implement share review link dialog
    console.log('Share review link');
  }

  formatCurrency(value: number): string {
    const exp = this.experience();
    const currency = exp?.currency || 'MYR';
    return `${currency} ${value.toFixed(2)}`;
  }
}
