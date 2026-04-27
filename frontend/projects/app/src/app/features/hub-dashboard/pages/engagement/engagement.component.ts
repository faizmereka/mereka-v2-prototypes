import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent, type IconName } from '@mereka/ui';
import { HubEngagementService, type FavoriteableType } from '../../services/hub-engagement.service';

interface FilterTab {
  id: FavoriteableType | 'all';
  label: string;
}

@Component({
  selector: 'app-hub-engagement',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-neutral-900">Engagement</h1>
          <p class="text-neutral-600 mt-1">See who's interested in your content</p>
        </div>
        <button
          (click)="refresh()"
          [disabled]="loading()"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            class="w-4 h-4"
            [class.animate-spin]="loading()"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <!-- Loading State -->
      @if (loading() && !initialized()) {
        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="bg-white rounded-xl border border-neutral-200 p-6 animate-pulse">
              <div class="h-4 bg-neutral-200 rounded w-1/2 mb-3"></div>
              <div class="h-8 bg-neutral-100 rounded w-3/4"></div>
            </div>
          }
        </div>
      }

      <!-- Error State -->
      @else if (error()) {
        <div class="bg-red-50 border border-red-100 rounded-xl p-6 text-center">
          <ui-icon name="error" class="w-12 h-12 mx-auto text-red-400 mb-4" />
          <h3 class="text-lg font-medium text-red-900 mb-2">Something went wrong</h3>
          <p class="text-red-600 mb-4">{{ error() }}</p>
          <button
            (click)="refresh()"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      }

      @else {
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <!-- Total Favorites -->
          <div class="bg-white rounded-xl border border-neutral-200 p-6">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <span class="text-sm text-neutral-500">Total Favorites</span>
            </div>
            <div class="text-3xl font-bold text-neutral-900">{{ totalFavorites() }}</div>
          </div>

          <!-- This Month -->
          <div class="bg-white rounded-xl border border-neutral-200 p-6">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <ui-icon name="calendar" class="w-5 h-5 text-blue-600" />
              </div>
              <span class="text-sm text-neutral-500">This Month</span>
            </div>
            <div class="flex items-end gap-2">
              <span class="text-3xl font-bold text-neutral-900">{{ thisMonthFavorites() }}</span>
              @if (favoritesTrend() !== 0) {
                <span
                  class="text-sm font-medium px-2 py-0.5 rounded-full"
                  [class.bg-green-100]="favoritesTrend() > 0"
                  [class.text-green-700]="favoritesTrend() > 0"
                  [class.bg-red-100]="favoritesTrend() < 0"
                  [class.text-red-700]="favoritesTrend() < 0"
                >
                  {{ favoritesTrend() > 0 ? '+' : '' }}{{ favoritesTrend() }}%
                </span>
              }
            </div>
          </div>

          <!-- By Type -->
          <div class="bg-white rounded-xl border border-neutral-200 p-6 md:col-span-1 lg:col-span-2">
            <div class="flex items-center gap-3 mb-3">
              <span class="text-sm text-neutral-500">Favorites by Type</span>
            </div>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div class="text-center">
                <div class="text-lg font-semibold text-purple-600">{{ countByType().expertise }}</div>
                <div class="text-xs text-neutral-500">Expertise</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-semibold text-blue-600">{{ countByType().experience }}</div>
                <div class="text-xs text-neutral-500">Experiences</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-semibold text-emerald-600">{{ countByType().expert }}</div>
                <div class="text-xs text-neutral-500">Experts</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-semibold text-amber-600">{{ countByType().hub }}</div>
                <div class="text-xs text-neutral-500">Hub</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Two Column Layout: Trending & Who Favorited -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Trending Content -->
          <div class="lg:col-span-1">
            <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div class="p-4 border-b border-neutral-100">
                <h2 class="font-semibold text-neutral-900">Trending Content</h2>
                <p class="text-sm text-neutral-500">Most favorited this week</p>
              </div>
              <div class="divide-y divide-neutral-100">
                @for (content of trendingContent(); track content._id) {
                  <div class="p-4 hover:bg-neutral-50 transition-colors">
                    <div class="flex items-start gap-3">
                      @if (content.coverPhoto) {
                        <img
                          [src]="content.coverPhoto"
                          [alt]="content.title"
                          class="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      } @else {
                        <div class="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                          <ui-icon [name]="getContentIcon(content.type)" class="w-6 h-6 text-neutral-400" />
                        </div>
                      }
                      <div class="min-w-0 flex-1">
                        <h3 class="font-medium text-neutral-900 truncate">{{ content.title }}</h3>
                        <div class="flex items-center gap-2 mt-1">
                          <span
                            class="px-2 py-0.5 text-xs rounded-full capitalize"
                            [ngClass]="engagementService.getTypeClass(content.type)"
                          >
                            {{ content.type }}
                          </span>
                          <span class="text-sm text-neutral-500">
                            {{ content.favoriteCount }} favorites
                          </span>
                        </div>
                        @if (content.recentCount > 0) {
                          <p class="text-xs text-green-600 mt-1">
                            +{{ content.recentCount }} this week
                          </p>
                        }
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="p-8 text-center text-neutral-500">
                    <ui-icon name="star" class="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                    <p>No trending content yet</p>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Who Favorited -->
          <div class="lg:col-span-2">
            <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div class="p-4 border-b border-neutral-100">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 class="font-semibold text-neutral-900">Who Favorited</h2>
                    <p class="text-sm text-neutral-500">People interested in your content</p>
                  </div>
                </div>
                <!-- Filter Tabs -->
                <div class="flex gap-2 mt-4 overflow-x-auto pb-1">
                  @for (tab of filterTabs; track tab.id) {
                    <button
                      (click)="setFilter(tab.id)"
                      class="px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors"
                      [class.bg-primary]="activeFilter() === tab.id"
                      [class.text-white]="activeFilter() === tab.id"
                      [class.bg-neutral-100]="activeFilter() !== tab.id"
                      [class.text-neutral-600]="activeFilter() !== tab.id"
                      [class.hover:bg-neutral-200]="activeFilter() !== tab.id"
                    >
                      {{ tab.label }}
                      <span class="ml-1 opacity-75">({{ getFilterCount(tab.id) }})</span>
                    </button>
                  }
                </div>
              </div>

              <div class="divide-y divide-neutral-100 max-h-[500px] overflow-y-auto">
                @for (user of filteredUsers(); track user._id) {
                  <div class="p-4 hover:bg-neutral-50 transition-colors">
                    <div class="flex items-center gap-4">
                      <!-- User Avatar -->
                      @if (user.profilePhoto) {
                        <img
                          [src]="user.profilePhoto"
                          [alt]="user.name"
                          class="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      } @else {
                        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span class="text-sm font-medium text-primary">
                            {{ getUserInitials(user.name) }}
                          </span>
                        </div>
                      }

                      <!-- User Info -->
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <h3 class="font-medium text-neutral-900">{{ user.name }}</h3>
                          <span class="text-xs text-neutral-400">
                            {{ engagementService.formatDate(user.favoritedAt) }}
                          </span>
                        </div>
                        <div class="flex items-center gap-2 mt-0.5">
                          <span class="text-sm text-neutral-500">Favorited:</span>
                          <span
                            class="px-2 py-0.5 text-xs rounded-full"
                            [ngClass]="engagementService.getTypeClass(user.contentType)"
                          >
                            {{ user.contentType }}
                          </span>
                          <span class="text-sm text-neutral-700 truncate">{{ user.contentTitle }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="p-12 text-center">
                    <svg class="w-16 h-16 mx-auto text-neutral-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <h3 class="text-lg font-medium text-neutral-900 mb-2">No favorites yet</h3>
                    <p class="text-neutral-500">
                      When users favorite your content, they'll appear here.
                    </p>
                  </div>
                }
              </div>

              <!-- Load More -->
              @if (hasMore()) {
                <div class="p-4 border-t border-neutral-100 text-center">
                  <button
                    (click)="loadMore()"
                    [disabled]="loading()"
                    class="text-sm font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {{ loading() ? 'Loading...' : 'Load More' }}
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class HubEngagementComponent implements OnInit {
  readonly engagementService = inject(HubEngagementService);

  // Service signals
  readonly loading = this.engagementService.loading;
  readonly error = this.engagementService.error;
  readonly initialized = this.engagementService.initialized;
  readonly trendingContent = this.engagementService.trendingContent;
  readonly filteredUsers = this.engagementService.filteredUsers;
  readonly activeFilter = this.engagementService.activeFilter;
  readonly hasMore = this.engagementService.hasMore;
  readonly totalFavorites = this.engagementService.totalFavorites;
  readonly thisMonthFavorites = this.engagementService.thisMonthFavorites;
  readonly favoritesTrend = this.engagementService.favoritesTrend;
  readonly countByType = this.engagementService.countByType;

  readonly filterTabs: FilterTab[] = [
    { id: 'all', label: 'All' },
    { id: 'expertise', label: 'Expertise' },
    { id: 'experience', label: 'Experiences' },
    { id: 'expert', label: 'Experts' },
    { id: 'hub', label: 'Hub' },
  ];

  ngOnInit(): void {
    void this.engagementService.loadEngagementData();
  }

  setFilter(filter: FavoriteableType | 'all'): void {
    this.engagementService.setFilter(filter);
  }

  getFilterCount(filter: FavoriteableType | 'all'): number {
    return this.countByType()[filter];
  }

  async refresh(): Promise<void> {
    await this.engagementService.refresh();
  }

  async loadMore(): Promise<void> {
    await this.engagementService.loadMore();
  }

  getUserInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  getContentIcon(type: FavoriteableType): IconName {
    switch (type) {
      case 'expert':
        return 'person';
      case 'hub':
        return 'building';
      case 'expertise':
        return 'star';
      case 'experience':
        return 'calendar';
      default:
        return 'star';
    }
  }
}
