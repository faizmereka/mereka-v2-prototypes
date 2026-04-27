import { Injectable, signal, computed } from '@angular/core';
import type { DashboardBanner, BannerCategory } from './banner.types';

/**
 * Banner Service
 * Manages dashboard banners state across the application
 */
@Injectable({ providedIn: 'root' })
export class BannerService {
  private readonly _banners = signal<DashboardBanner[]>([]);

  /** All banners */
  readonly banners = this._banners.asReadonly();

  /** Get banners for user dashboard */
  readonly userBanners = computed(() =>
    this._banners().filter((b) => b.category === 'user')
  );

  /** Get banners for hub dashboard */
  readonly hubBanners = computed(() =>
    this._banners().filter((b) => b.category === 'hub')
  );

  /**
   * Add a banner
   * If a banner with the same ID exists, it will be replaced
   */
  addBanner(banner: DashboardBanner): void {
    this._banners.update((banners) => {
      // Remove existing banner with same ID
      const filtered = banners.filter((b) => b.id !== banner.id);
      return [...filtered, banner];
    });
  }

  /**
   * Remove a banner by ID
   */
  removeBanner(id: string): void {
    this._banners.update((banners) => banners.filter((b) => b.id !== id));
  }

  /**
   * Update a banner's loading state
   */
  setLoading(id: string, loading: boolean): void {
    this._banners.update((banners) =>
      banners.map((b) => (b.id === id ? { ...b, loading } : b))
    );
  }

  /**
   * Check if a banner exists
   */
  hasBanner(id: string): boolean {
    return this._banners().some((b) => b.id === id);
  }

  /**
   * Get banners by category
   */
  getBannersByCategory(category: BannerCategory): DashboardBanner[] {
    return this._banners().filter((b) => b.category === category);
  }

  /**
   * Clear all banners
   */
  clearAll(): void {
    this._banners.set([]);
  }

  /**
   * Clear banners by category
   */
  clearByCategory(category: BannerCategory): void {
    this._banners.update((banners) =>
      banners.filter((b) => b.category !== category)
    );
  }
}
