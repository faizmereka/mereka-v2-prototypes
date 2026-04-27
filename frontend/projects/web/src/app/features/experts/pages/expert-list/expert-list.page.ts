import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ExpertService } from '../../services';
import { ExpertCardComponent } from '../../components/expert-card/expert-card.component';
import { HeaderComponent } from '../../../../shared/components/header';
import { UiFooterComponent } from '@mereka/ui';
import { FavoriteService } from '../../../../core/services/favorite.service';
import type { ExpertFilters } from '../../models';

interface ExpertTypeFilter {
  id: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-expert-list',
  standalone: true,
  imports: [ExpertCardComponent, HeaderComponent, UiFooterComponent],
  template: `
    <web-header />
    <main class="min-h-screen bg-gray-50">
      <!-- Filter Tabs Section -->
      <div class="bg-white border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center justify-between">
            <!-- Expert Type Filters -->
            <div class="flex items-center gap-6">
              @for (filter of expertTypes; track filter.id) {
                <button
                  (click)="setExpertType(filter.id)"
                  [class.text-[#1a1623]]="selectedExpertType() === filter.id"
                  [class.border-b-2]="selectedExpertType() === filter.id"
                  [class.border-[#1a1623]]="selectedExpertType() === filter.id"
                  [class.text-gray-500]="selectedExpertType() !== filter.id"
                  class="flex flex-col items-center gap-1 pb-2 px-2 text-sm font-medium transition-colors hover:text-[#1a1623]"
                >
                  <span class="text-xl" [innerHTML]="filter.icon"></span>
                  <span>{{ filter.label }}</span>
                </button>
              }
            </div>

            <!-- Choose Skills Dropdown -->
            <div class="relative">
              <button
                class="px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#1a1623] flex items-center gap-2"
              >
                Choose skills
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
        <!-- Title -->
        <h1 class="text-3xl font-bold text-[#1a1623] mb-8">
          Browse our Experts available to book.
        </h1>

        <!-- Loading State -->
        @if (expertService.listLoading()) {
          <div>
            <h2 class="text-xl font-semibold text-[#1a1623] mb-6">Career & Business</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              @for (i of [1, 2, 3, 4, 5]; track i) {
                <div class="animate-pulse">
                  <div class="aspect-square bg-gray-200 rounded-xl mb-4"></div>
                  <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div class="h-3 bg-gray-200 rounded w-full mb-1"></div>
                  <div class="h-3 bg-gray-200 rounded w-4/5"></div>
                  <div class="mt-3 flex gap-2">
                    <div class="h-6 bg-gray-200 rounded-full w-16"></div>
                    <div class="h-6 bg-gray-200 rounded-full w-20"></div>
                  </div>
                </div>
              }
            </div>
          </div>
        } @else if (expertService.hasExperts()) {
          <!-- Category Section -->
          <div>
            <h2 class="text-xl font-semibold text-[#1a1623] mb-6">Career & Business</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              @for (expert of expertService.experts(); track expert._id) {
                <app-expert-card
                  [expert]="expert"
                  [isFavorited]="isExpertFavorited(expert._id)"
                  (favorite)="toggleFavorite($event)"
                />
              }
            </div>
          </div>

          <!-- Pagination -->
          @if (expertService.pagination().totalPages > 1) {
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
                  [disabled]="currentPage() === expertService.pagination().totalPages"
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">No experts found</h3>
            <p class="text-gray-600">Check back later for new experts</p>
          </div>
        }
      </div>
    </main>
    <ui-footer />
  `,
})
export class ExpertListPage implements OnInit {
  readonly expertService = inject(ExpertService);
  readonly favoriteService = inject(FavoriteService);

  readonly expertTypes: ExpertTypeFilter[] = [
    { id: 'all', label: 'All', icon: '&#128100;' },
    { id: 'trainer', label: 'Trainer', icon: '&#127891;' },
    { id: 'coach', label: 'Coach', icon: '&#128218;' },
    { id: 'consultant', label: 'Consultant', icon: '&#128188;' },
    { id: 'project-manager', label: 'Project Manager', icon: '&#128203;' },
    { id: 'service-retailer', label: 'Service Retailer', icon: '&#128722;' },
  ];

  readonly selectedExpertType = signal('all');
  readonly currentPage = signal(1);

  readonly visiblePages = computed(() => {
    const total = this.expertService.pagination().totalPages;
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
    this.loadExperts();
  }

  loadExperts(): void {
    const filters: ExpertFilters = {
      page: this.currentPage(),
      limit: 20,
    };

    this.expertService.getExperts(filters).subscribe({
      next: () => {
        // Load favorited IDs for displayed experts
        const ids = this.expertService.experts().map((e: { _id: string }) => e._id);
        if (ids.length > 0) {
          this.favoriteService.loadFavoritedIds('expert', ids);
        }
      },
    });
  }

  isExpertFavorited(expertId: string): boolean {
    return this.favoriteService.isFavorited('expert', expertId);
  }

  async toggleFavorite(expertId: string): Promise<void> {
    await this.favoriteService.toggleFavorite('expert', expertId);
  }

  setExpertType(type: string): void {
    this.selectedExpertType.set(type);
    this.currentPage.set(1);
    this.loadExperts();
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadExperts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
