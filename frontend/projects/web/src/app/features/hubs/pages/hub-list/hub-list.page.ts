import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { HubService } from '../../services';
import { HubCardComponent } from '../../components/hub-card/hub-card.component';
import { HeaderComponent } from '../../../../shared/components/header';
import { UiFooterComponent } from '@mereka/ui';
import { FavoriteService } from '../../../../core/services/favorite.service';
import type { HubFilters } from '../../models';

@Component({
  selector: 'app-hub-list',
  standalone: true,
  imports: [HubCardComponent, HeaderComponent, UiFooterComponent],
  template: `
    <web-header />
    <main class="min-h-screen bg-white">
      <!-- Filters Section -->
      <div class="border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center gap-3">
            <!-- Featured Filter -->
            <button
              (click)="toggleFeatured()"
              [class.bg-[#1a1623]]="showFeatured()"
              [class.text-white]="showFeatured()"
              [class.bg-white]="!showFeatured()"
              [class.text-gray-700]="!showFeatured()"
              class="px-4 py-2 rounded-full border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Featured
            </button>

            <!-- Business Type Dropdown -->
            <div class="relative">
              <button
                (click)="toggleBusinessTypeDropdown()"
                class="px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                Business Type
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <!-- Sort By Dropdown -->
            <div class="relative">
              <button
                class="px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                Sort by
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Title Section -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-[#1a1623] mb-2">Explore Hubs</h1>
          <p class="text-gray-600">
            Hubs are organizations offering resources to foster communities, cultivate ideas, and drive innovation.
          </p>
        </div>

        <!-- Loading State -->
        @if (hubService.listLoading()) {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            @for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) {
              <div class="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div class="flex justify-end gap-2 mb-4">
                  <div class="w-6 h-6 rounded-full bg-gray-200"></div>
                  <div class="w-6 h-6 rounded-full bg-gray-200"></div>
                </div>
                <div class="w-20 h-20 rounded-lg bg-gray-200 mb-4"></div>
                <div class="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div class="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
                <div class="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            }
          </div>
        } @else if (hubService.hasHubs()) {
          <!-- Hubs Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            @for (hub of hubService.hubs(); track hub._id) {
              <app-hub-card
                [hub]="hub"
                [isFavorited]="isHubFavorited(hub._id)"
                (favorite)="toggleFavorite($event)"
              />
            }
          </div>

          <!-- Pagination -->
          @if (hubService.pagination().totalPages > 1) {
            <div class="mt-12 flex justify-center">
              <nav class="flex items-center gap-2">
                <button
                  [disabled]="currentPage() === 1"
                  (click)="goToPage(currentPage() - 1)"
                  class="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                @for (page of visiblePages(); track page) {
                  @if (page === '...') {
                    <span class="px-3 py-2 text-gray-400">...</span>
                  } @else {
                    <button
                      (click)="goToPage(+page)"
                      [class.bg-[#1a1623]]="currentPage() === +page"
                      [class.text-white]="currentPage() === +page"
                      [class.border-gray-200]="currentPage() !== +page"
                      class="px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      {{ page }}
                    </button>
                  }
                }

                <button
                  [disabled]="currentPage() === hubService.pagination().totalPages"
                  (click)="goToPage(currentPage() + 1)"
                  class="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          }
        } @else {
          <!-- Empty State -->
          <div class="text-center py-16">
            <div class="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                class="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">No hubs found</h3>
            <p class="text-gray-600">Check back later for new hubs</p>
          </div>
        }
      </div>
    </main>
    <ui-footer />
  `,
})
export class HubListPage implements OnInit {
  readonly hubService = inject(HubService);
  readonly favoriteService = inject(FavoriteService);

  readonly searchQuery = signal('');
  readonly currentPage = signal(1);
  readonly showFeatured = signal(false);
  readonly showBusinessTypeDropdown = signal(false);

  readonly visiblePages = computed(() => {
    const total = this.hubService.pagination().totalPages;
    const current = this.currentPage();
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');

      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (current < total - 2) pages.push('...');
      pages.push(total);
    }

    return pages;
  });

  ngOnInit(): void {
    this.loadHubs();
  }

  loadHubs(): void {
    const filters: HubFilters = {
      page: this.currentPage(),
      limit: 20,
    };

    if (this.showFeatured()) {
      filters.featured = true;
    }

    if (this.searchQuery()) {
      filters.search = this.searchQuery();
    }

    this.hubService.getHubs(filters).subscribe({
      next: () => {
        // Load favorited IDs for displayed hubs
        const ids = this.hubService.hubs().map((h: { _id: string }) => h._id);
        if (ids.length > 0) {
          this.favoriteService.loadFavoritedIds('hub', ids);
        }
      },
    });
  }

  isHubFavorited(hubId: string): boolean {
    return this.favoriteService.isFavorited('hub', hubId);
  }

  async toggleFavorite(hubId: string): Promise<void> {
    await this.favoriteService.toggleFavorite('hub', hubId);
  }

  toggleFeatured(): void {
    this.showFeatured.update((v) => !v);
    this.currentPage.set(1);
    this.loadHubs();
  }

  toggleBusinessTypeDropdown(): void {
    this.showBusinessTypeDropdown.update((v) => !v);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadHubs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
