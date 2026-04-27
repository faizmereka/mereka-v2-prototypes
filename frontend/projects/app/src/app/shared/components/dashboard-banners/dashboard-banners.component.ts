import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BannerService } from './banner.service';
import type { BannerCategory, DashboardBanner } from './banner.types';

/**
 * Dashboard Banners Component
 * Displays banners filtered by category (user or hub)
 */
@Component({
  selector: 'app-dashboard-banners',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-banners.component.html',
})
export class DashboardBannersComponent {
  private readonly bannerService = inject(BannerService);

  /** Which category of banners to show */
  readonly category = input.required<BannerCategory>();

  /** Filtered banners for this category */
  readonly banners = computed(() => {
    const cat = this.category();
    return cat === 'user'
      ? this.bannerService.userBanners()
      : this.bannerService.hubBanners();
  });

  /** Get CSS classes based on severity */
  getSeverityClasses(banner: DashboardBanner): string {
    const baseClasses = 'flex items-start gap-3 p-4 rounded-lg mb-4';

    switch (banner.severity) {
      case 'warning':
        return `${baseClasses} bg-amber-50 border border-amber-200`;
      case 'error':
        return `${baseClasses} bg-red-50 border border-red-200`;
      case 'success':
        return `${baseClasses} bg-green-50 border border-green-200`;
      case 'info':
      default:
        return `${baseClasses} bg-blue-50 border border-blue-200`;
    }
  }

  /** Get icon color classes based on severity */
  getIconClasses(banner: DashboardBanner): string {
    switch (banner.severity) {
      case 'warning':
        return 'text-amber-600';
      case 'error':
        return 'text-red-600';
      case 'success':
        return 'text-green-600';
      case 'info':
      default:
        return 'text-blue-600';
    }
  }

  /** Get text color classes based on severity */
  getTitleClasses(banner: DashboardBanner): string {
    switch (banner.severity) {
      case 'warning':
        return 'text-amber-800';
      case 'error':
        return 'text-red-800';
      case 'success':
        return 'text-green-800';
      case 'info':
      default:
        return 'text-blue-800';
    }
  }

  getMessageClasses(banner: DashboardBanner): string {
    switch (banner.severity) {
      case 'warning':
        return 'text-amber-700';
      case 'error':
        return 'text-red-700';
      case 'success':
        return 'text-green-700';
      case 'info':
      default:
        return 'text-blue-700';
    }
  }

  /** Get button classes based on severity */
  getButtonClasses(banner: DashboardBanner): string {
    const baseClasses =
      'px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50';

    switch (banner.severity) {
      case 'warning':
        return `${baseClasses} bg-amber-600 text-white hover:bg-amber-700`;
      case 'error':
        return `${baseClasses} bg-red-600 text-white hover:bg-red-700`;
      case 'success':
        return `${baseClasses} bg-green-600 text-white hover:bg-green-700`;
      case 'info':
      default:
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700`;
    }
  }

  /** Handle action button click */
  async onAction(banner: DashboardBanner): Promise<void> {
    if (banner.actionFn && !banner.loading) {
      this.bannerService.setLoading(banner.id, true);
      try {
        await banner.actionFn();
      } finally {
        this.bannerService.setLoading(banner.id, false);
      }
    }
  }

  /** Handle dismiss */
  onDismiss(banner: DashboardBanner): void {
    if (banner.dismissible) {
      this.bannerService.removeBanner(banner.id);
    }
  }
}
