import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExpertiseService } from '../../services';
import { HeaderComponent } from '../../../../shared/components/header';
import { UiFooterComponent } from '@mereka/ui';
import { FavoriteService } from '../../../../core/services/favorite.service';
import type { ExpertiseFilters } from '../../models';

@Component({
  selector: 'app-expertise-list',
  standalone: true,
  imports: [RouterLink, HeaderComponent, UiFooterComponent],
  template: `
    <web-header />
    <main class="min-h-screen bg-white">
      <!-- Category Tabs -->
      <section class="border-b border-gray-200 bg-white sticky top-[64px] z-10">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav class="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
            <!-- All Tab -->
            <button
              (click)="resetCategory()"
              class="category-tab"
              [class.category-tab-active]="!selectedCategory()"
            >
              <img src="assets/icons/collections/collection-all.svg" alt="All" class="w-5 h-5" />
              <span>All</span>
            </button>

            @for (category of categories; track category.id) {
              <button
                (click)="setSelectedCategory(category)"
                class="category-tab"
                [class.category-tab-active]="selectedCategory()?.id === category.id"
              >
                <img [src]="category.icon" [alt]="category.label" class="w-5 h-5" />
                <span>{{ category.label }}</span>
              </button>
            }
          </nav>
        </div>
      </section>

      <!-- Hero Section -->
      <section class="bg-white py-6 lg:py-8">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 class="text-xl lg:text-2xl font-bold text-[#1a1623]">Explore Services offered by our Experts</h1>
        </div>
      </section>

      <!-- Main Content -->
      <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <!-- Loading State -->
        @if (expertiseService.listLoading()) {
          <div class="space-y-10">
            @for (i of [1, 2]; track i) {
              <div>
                <div class="h-7 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  @for (j of [1, 2, 3, 4]; track j) {
                    <div class="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
                      <div class="aspect-[4/3] bg-gray-200"></div>
                      <div class="p-3">
                        <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div class="h-3 bg-gray-200 rounded w-full mb-2"></div>
                        <div class="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        } @else if (expertiseService.hasExpertises()) {
          <!-- Category Sections -->
          <div class="space-y-10">
            @for (category of displayCategories(); track category.id) {
              @if (getExpertisesForCategory(category.id).length > 0) {
                <section [id]="category.id">
                  <h2 class="text-lg font-bold text-[#1a1623] mb-4">{{ category.label }}</h2>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    @for (expertise of getExpertisesForCategory(category.id); track expertise._id) {
                      <a
                        [routerLink]="['/expertises', expertise.slug]"
                        class="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
                      >
                        <!-- Cover Image -->
                        <div class="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                          @if (expertise.coverPhoto) {
                            <img
                              [src]="expertise.coverPhoto"
                              [alt]="expertise.expertiseTitle"
                              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          } @else {
                            <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                              <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                              </svg>
                            </div>
                          }
                          <!-- Favorite Button -->
                          <button
                            (click)="toggleFavorite($event, expertise._id)"
                            class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                            [attr.aria-label]="isFavorited(expertise._id) ? 'Remove from favorites' : 'Add to favorites'"
                          >
                            @if (isFavorited(expertise._id)) {
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
                        </div>

                        <!-- Content -->
                        <div class="p-3">
                          <h3 class="font-medium text-[#1a1623] line-clamp-2 text-sm mb-2 group-hover:text-[#276EF1] transition-colors">
                            {{ expertise.expertiseTitle }}
                          </h3>

                          <!-- Host Info -->
                          @if (expertise.host?.name) {
                            <div class="flex items-center gap-1.5 mb-2">
                              @if (expertise.host?.profileUrl) {
                                <img [src]="expertise.host?.profileUrl" [alt]="expertise.host?.name"
                                     class="w-5 h-5 rounded-full object-cover" />
                              } @else {
                                <div class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600">
                                  {{ expertise.host?.name?.charAt(0) }}
                                </div>
                              }
                              <span class="text-xs text-gray-500 truncate">{{ expertise.host?.name }}</span>
                            </div>
                          }

                          <!-- Location -->
                          @if (expertise.location?.city) {
                            <div class="flex items-center gap-1 text-xs text-gray-500 mb-2">
                              <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                              </svg>
                              <span class="truncate">{{ expertise.location?.city }}</span>
                            </div>
                          }

                          <!-- Price -->
                          <div class="pt-2 border-t border-gray-100">
                            @if (isFree(expertise)) {
                              <span class="text-xs font-semibold text-[#1a1623] bg-yellow-100 px-2 py-0.5 rounded">Free</span>
                            } @else {
                              <span class="text-xs font-semibold text-[#1a1623]">{{ getPrice(expertise) }}</span>
                              <span class="text-xs text-gray-500">/ session</span>
                            }
                          </div>
                        </div>
                      </a>
                    }
                  </div>
                </section>
              }
            }
          </div>

          <!-- Pagination -->
          @if (expertiseService.pagination().totalPages > 1) {
            <div class="mt-10 flex justify-center">
              <nav class="flex items-center gap-1">
                <button
                  [disabled]="currentPage() === 1"
                  (click)="goToPage(currentPage() - 1)"
                  class="p-2 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>

                @for (page of visiblePages(); track page) {
                  @if (page === '...') {
                    <span class="px-2 py-1 text-gray-400">...</span>
                  } @else {
                    <button
                      (click)="goToPage(+page)"
                      [class.bg-[#1a1623]]="currentPage() === +page"
                      [class.text-white]="currentPage() === +page"
                      [class.text-gray-700]="currentPage() !== +page"
                      [class.hover:bg-gray-100]="currentPage() !== +page"
                      class="min-w-[36px] h-9 rounded font-medium text-sm transition-colors"
                    >
                      {{ page }}
                    </button>
                  }
                }

                <button
                  [disabled]="currentPage() === expertiseService.pagination().totalPages"
                  (click)="goToPage(currentPage() + 1)"
                  class="p-2 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div class="text-center py-12">
            <div class="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-1">No Expertise Found</h3>
            <p class="text-sm text-gray-600">We couldn't find any expertise matching your criteria.</p>
          </div>
        }
      </section>

      <!-- CTA Section -->
      <section class="bg-[#1a1623] py-10">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 class="text-xl lg:text-2xl font-bold text-white mb-4">
            Looking for Expertise? List a job and get matched to an Expert.
          </h2>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-3 mt-5">
            <a href="#" class="px-5 py-2.5 bg-white text-[#1a1623] font-medium rounded-full hover:bg-gray-100 transition-colors text-sm">
              Post a job
            </a>
            <a href="#" class="text-white text-sm underline hover:no-underline">
              Are you an Expert? Explore Job Opportunities
            </a>
          </div>
        </div>
      </section>
    </main>
    <ui-footer />
  `,
  styles: [`
    .category-tab {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #6b7280;
      white-space: nowrap;
      border-radius: 9999px;
      transition: all 0.2s;
    }
    .category-tab:hover {
      color: #1a1623;
      background-color: #f3f4f6;
    }
    .category-tab-active {
      color: #1a1623;
      background-color: #f3f4f6;
    }
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `]
})
export class ExpertiseListPage implements OnInit {
  readonly expertiseService = inject(ExpertiseService);
  readonly favoriteService = inject(FavoriteService);
  readonly currentPage = signal(1);
  readonly selectedCategory = signal<{ id: string; label: string; icon: string } | null>(null);

  // Categories with icon paths from assets
  readonly categories = [
    { id: 'trainer', label: 'Trainer', icon: 'assets/icons/collections/collection-training.svg' },
    { id: 'coach', label: 'Coach', icon: 'assets/icons/collections/collection-coaching.svg' },
    { id: 'consultant', label: 'Consultant', icon: 'assets/icons/collections/collection-consultancy.svg' },
    { id: 'project-manager', label: 'Project Manager', icon: 'assets/icons/collections/collection-project-manager.svg' },
    { id: 'service-retainer', label: 'Service Retainer', icon: 'assets/icons/collections/collection-retainer.svg' },
  ];

  readonly displayCategories = computed(() => {
    const selected = this.selectedCategory();
    if (selected) {
      return [selected];
    }
    return this.categories;
  });

  readonly visiblePages = computed(() => {
    const total = this.expertiseService.pagination().totalPages;
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
    this.loadExpertises();
  }

  loadExpertises(): void {
    const filters: ExpertiseFilters = {
      page: this.currentPage(),
      limit: 100,
    };
    this.expertiseService.getExpertises(filters).subscribe({
      next: () => {
        // Load favorited IDs for displayed expertises
        const ids = this.expertiseService.expertises().map((e: { _id: string }) => e._id);
        if (ids.length > 0) {
          this.favoriteService.loadFavoritedIds('expertise', ids);
        }
      },
    });
  }

  isFavorited(expertiseId: string): boolean {
    return this.favoriteService.isFavorited('expertise', expertiseId);
  }

  async toggleFavorite(event: Event, expertiseId: string): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    await this.favoriteService.toggleFavorite('expertise', expertiseId);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    this.loadExpertises();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  resetCategory(): void {
    this.selectedCategory.set(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setSelectedCategory(category: { id: string; label: string; icon: string }): void {
    this.selectedCategory.set(category);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getExpertisesForCategory(categoryId: string): any[] {
    const expertises = this.expertiseService.expertises();
    const categoryIndex = this.categories.findIndex(c => c.id === categoryId);
    const itemsPerCategory = Math.ceil(expertises.length / this.categories.length);
    const start = categoryIndex * itemsPerCategory;
    const end = start + itemsPerCategory;
    return expertises.slice(start, end);
  }

  isFree(expertise: { ticket: { ticketType: string; standardRate: number }[] }): boolean {
    if (!expertise.ticket?.length) return true;
    return expertise.ticket.some(t => t.ticketType === 'Free' || t.standardRate === 0);
  }

  getPrice(expertise: { ticket: { ticketType: string; standardRate: number }[]; currency: string }): string {
    if (!expertise.ticket?.length) return 'Free';
    const paidTickets = expertise.ticket.filter(t => t.ticketType !== 'Free' && t.standardRate > 0);
    if (paidTickets.length === 0) return 'Free';
    const minPrice = Math.min(...paidTickets.map(t => t.standardRate));
    return `${expertise.currency} ${minPrice}`;
  }
}
