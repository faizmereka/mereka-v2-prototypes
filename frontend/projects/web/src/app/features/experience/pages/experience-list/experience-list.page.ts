import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExperienceService, type ExperienceFilters } from '../../services/experience.service';
import { HeaderComponent } from '../../../../shared/components/header';
import { UiFooterComponent } from '@mereka/ui';
import { FavoriteService } from '../../../../core/services/favorite.service';

@Component({
  selector: 'app-experience-list',
  standalone: true,
  imports: [RouterLink, HeaderComponent, UiFooterComponent],
  template: `
    <web-header />
    <main class="min-h-screen bg-white">
      <!-- Filter Bar -->
      <section class="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center gap-3 py-3 overflow-x-auto">
            <button
              (click)="toggleFilter('online')"
              [class.bg-[#1a1623]]="activeFilters().includes('online')"
              [class.text-white]="activeFilters().includes('online')"
              [class.border-[#1a1623]]="activeFilters().includes('online')"
              class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-full whitespace-nowrap hover:border-gray-400 transition-colors"
            >
              Online
            </button>
            <button
              (click)="toggleFilter('free')"
              [class.bg-[#1a1623]]="activeFilters().includes('free')"
              [class.text-white]="activeFilters().includes('free')"
              [class.border-[#1a1623]]="activeFilters().includes('free')"
              class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-full whitespace-nowrap hover:border-gray-400 transition-colors"
            >
              Free
            </button>
            <button
              (click)="toggleFilter('enquiries')"
              [class.bg-[#1a1623]]="activeFilters().includes('enquiries')"
              [class.text-white]="activeFilters().includes('enquiries')"
              [class.border-[#1a1623]]="activeFilters().includes('enquiries')"
              class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-full whitespace-nowrap hover:border-gray-400 transition-colors"
            >
              Open for Enquiries
            </button>
            <div class="h-6 w-px bg-gray-300"></div>
            <button class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-full whitespace-nowrap hover:border-gray-400 transition-colors flex items-center gap-2">
              Dates
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <button class="px-4 py-2 text-sm font-medium border border-gray-300 rounded-full whitespace-nowrap hover:border-gray-400 transition-colors flex items-center gap-2">
              Type
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>
        </div>
      </section>

      <!-- Hero Section -->
      <section class="bg-white py-8 lg:py-10 border-b border-gray-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 class="text-2xl lg:text-3xl font-bold text-[#1a1623] mb-2">Explore Experiences</h1>
          <p class="text-gray-600">
            Discover activities and events hosted by our community
          </p>
        </div>
      </section>

      <!-- Results Count -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <p class="text-sm text-gray-500">
          {{ experienceService.pagination().total }} experiences found
        </p>
      </section>

      <!-- Main Content -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <!-- Loading State -->
        @if (experienceService.listLoading()) {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            @for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) {
              <div class="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
                <div class="aspect-[4/3] bg-gray-200"></div>
                <div class="p-4">
                  <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div class="h-5 bg-gray-200 rounded w-full mb-3"></div>
                  <div class="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div class="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            }
          </div>
        } @else if (experienceService.hasExperiences()) {
          <!-- Experience Grid - 4 columns on xl -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            @for (experience of experienceService.experiences(); track experience._id) {
              <a
                [routerLink]="['/experiences', experience.slug]"
                class="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group"
              >
                <!-- Cover Image -->
                <div class="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                  @if (experience.coverPhoto) {
                    <img
                      [src]="experience.coverPhoto"
                      [alt]="experience.experienceTitle"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  } @else {
                    <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                    </div>
                  }
                  <!-- Favorite Button -->
                  <button
                    (click)="toggleFavorite($event, experience._id)"
                    class="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                    [attr.aria-label]="isItemFavorited(experience._id) ? 'Remove from favorites' : 'Add to favorites'"
                  >
                    @if (isItemFavorited(experience._id)) {
                      <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    } @else {
                      <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                      </svg>
                    }
                  </button>
                  <!-- Rating Badge -->
                  @if (experience.rating) {
                    <div class="absolute top-2 right-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 text-sm shadow-sm">
                      <svg class="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      <span class="font-medium text-gray-700">{{ experience.rating.toFixed(1) }}</span>
                    </div>
                  }
                </div>

                <!-- Content -->
                <div class="p-4">
                  <!-- Location -->
                  @if (experience.location?.city) {
                    <p class="text-xs text-gray-500 mb-1">{{ experience.location?.city }}, Malaysia</p>
                  }

                  <!-- Title -->
                  <h3 class="font-semibold text-[#1a1623] line-clamp-2 mb-2 group-hover:text-[#276EF1] transition-colors text-sm">
                    {{ experience.experienceTitle }}
                  </h3>

                  <!-- Experience Type -->
                  @if (experience.experienceType) {
                    <p class="text-xs text-gray-500 mb-2">{{ experience.experienceType }}</p>
                  }

                  <!-- Price -->
                  <div class="pt-2 border-t border-gray-100">
                    @if (isFree(experience)) {
                      <span class="text-sm font-semibold text-green-600">FREE</span>
                    } @else {
                      <p class="text-xs text-gray-500">From</p>
                      <p class="text-sm font-semibold text-[#1a1623]">{{ getPrice(experience) }} / ticket</p>
                    }
                  </div>
                </div>
              </a>
            }
          </div>

          <!-- Pagination -->
          @if (experienceService.pagination().totalPages > 1) {
            <div class="mt-12 flex justify-center">
              <nav class="flex items-center gap-1">
                <button
                  [disabled]="currentPage() === 1"
                  (click)="goToPage(currentPage() - 1)"
                  class="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>

                @for (page of visiblePages(); track page) {
                  @if (page === '...') {
                    <span class="px-3 py-2 text-gray-400">...</span>
                  } @else {
                    <button
                      (click)="goToPage(+page)"
                      [class.bg-[#1a1623]]="currentPage() === +page"
                      [class.text-white]="currentPage() === +page"
                      [class.text-gray-700]="currentPage() !== +page"
                      [class.hover:bg-gray-100]="currentPage() !== +page"
                      class="min-w-[40px] h-10 rounded-lg font-medium transition-colors"
                    >
                      {{ page }}
                    </button>
                  }
                }

                <button
                  [disabled]="currentPage() === experienceService.pagination().totalPages"
                  (click)="goToPage(currentPage() + 1)"
                  class="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </nav>
            </div>
          }
        } @else {
          <!-- Empty State -->
          <div class="text-center py-16">
            <div class="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">No experiences found</h3>
            <p class="text-gray-600">Check back later for new experiences and events</p>
          </div>
        }
      </section>
    </main>
    <ui-footer />
  `,
})
export class ExperienceListPage implements OnInit {
  readonly experienceService = inject(ExperienceService);
  readonly favoriteService = inject(FavoriteService);
  readonly currentPage = signal(1);
  readonly activeFilters = signal<string[]>([]);

  readonly visiblePages = computed(() => {
    const total = this.experienceService.pagination().totalPages;
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
    this.loadExperiences();
  }

  loadExperiences(): void {
    const filters: ExperienceFilters = {
      page: this.currentPage(),
      limit: 20,
    };
    this.experienceService.getExperiences(filters).subscribe({
      next: () => {
        // Load favorited IDs for displayed experiences
        const ids = this.experienceService.experiences().map((e: { _id: string }) => e._id);
        if (ids.length > 0) {
          this.favoriteService.loadFavoritedIds('experience', ids);
        }
      },
    });
  }

  isItemFavorited(experienceId: string): boolean {
    return this.favoriteService.isFavorited('experience', experienceId);
  }

  async toggleFavorite(event: Event, experienceId: string): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    await this.favoriteService.toggleFavorite('experience', experienceId);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadExperiences();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleFilter(filter: string): void {
    this.activeFilters.update(filters => {
      if (filters.includes(filter)) {
        return filters.filter(f => f !== filter);
      }
      return [...filters, filter];
    });
    // TODO: Apply filters to API call
  }

  isFree(experience: { ticket?: { ticketType: string; ticketPrice: number }[] }): boolean {
    if (!experience.ticket?.length) return true;
    return experience.ticket.every(t => t.ticketType === 'Free' || t.ticketPrice === 0);
  }

  getPrice(experience: { ticket?: { ticketType: string; ticketPrice: number }[]; currency: string }): string {
    if (!experience.ticket?.length) return 'Free';
    const paidTickets = experience.ticket.filter(t => t.ticketType !== 'Free' && t.ticketPrice > 0);
    if (paidTickets.length === 0) return 'Free';
    const minPrice = Math.min(...paidTickets.map(t => t.ticketPrice));
    return `${experience.currency} ${minPrice}`;
  }
}
