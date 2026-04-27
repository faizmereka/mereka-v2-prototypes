import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FavoritesService, type PeriodFilter, type FavoriteableType } from './favorites.service';
import { CardComponent, SectionHeaderComponent } from '../../shared/ui';

@Component({
  selector: 'app-favorites-analytics',
  standalone: true,
  imports: [CommonModule, RouterLink, DecimalPipe, CardComponent, SectionHeaderComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-neutral-900">Favorites Analytics</h1>
          <p class="text-neutral-600 mt-1">Track user engagement with favorites</p>
        </div>
        <div class="flex items-center gap-3">
          <!-- Period Filter -->
          <select
            [value]="selectedPeriod()"
            (change)="onPeriodChange($event)"
            class="px-4 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            @for (period of periods; track period.value) {
              <option [value]="period.value">{{ period.label }}</option>
            }
          </select>

          <!-- Export Button -->
          <button
            (click)="exportData()"
            [disabled]="exporting"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-50"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {{ exporting ? 'Exporting...' : 'Export CSV' }}
          </button>

          <!-- Refresh Button -->
          <button
            (click)="refresh()"
            [disabled]="loading()"
            class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 disabled:opacity-50"
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
      </div>

      <!-- Loading State -->
      @if (loading() && !hasData()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <svg class="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
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
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div class="text-3xl font-bold text-neutral-900">{{ totalFavorites() | number }}</div>
          </div>

          <!-- Active Users -->
          <div class="bg-white rounded-xl border border-neutral-200 p-6">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span class="text-sm text-neutral-500">Active Users</span>
            </div>
            <div class="text-3xl font-bold text-neutral-900">{{ activeUsers() | number }}</div>
          </div>

          <!-- This Month -->
          <div class="bg-white rounded-xl border border-neutral-200 p-6">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span class="text-sm text-neutral-500">This Month</span>
            </div>
            <div class="flex items-end gap-2">
              <span class="text-3xl font-bold text-neutral-900">{{ thisMonthFavorites() | number }}</span>
              @if (favoritesTrend() !== 0) {
                <span
                  class="text-sm font-medium px-2 py-0.5 rounded-full mb-1"
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

          <!-- Avg Per User -->
          <div class="bg-white rounded-xl border border-neutral-200 p-6">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span class="text-sm text-neutral-500">Avg per User</span>
            </div>
            <div class="text-3xl font-bold text-neutral-900">{{ avgPerUser() | number:'1.1-1' }}</div>
          </div>
        </div>

        <!-- By Type Breakdown -->
        <div class="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 class="font-semibold text-neutral-900 mb-4">Favorites by Type</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center p-4 bg-purple-50 rounded-lg">
              <div class="text-2xl font-bold text-purple-600">{{ countByType().expertise | number }}</div>
              <div class="text-sm text-neutral-600">Expertise</div>
            </div>
            <div class="text-center p-4 bg-blue-50 rounded-lg">
              <div class="text-2xl font-bold text-blue-600">{{ countByType().experience | number }}</div>
              <div class="text-sm text-neutral-600">Experiences</div>
            </div>
            <div class="text-center p-4 bg-emerald-50 rounded-lg">
              <div class="text-2xl font-bold text-emerald-600">{{ countByType().expert | number }}</div>
              <div class="text-sm text-neutral-600">Experts</div>
            </div>
            <div class="text-center p-4 bg-amber-50 rounded-lg">
              <div class="text-2xl font-bold text-amber-600">{{ countByType().hub | number }}</div>
              <div class="text-sm text-neutral-600">Hubs</div>
            </div>
          </div>
        </div>

        <!-- Two Column Layout -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Top Favorited Content -->
          <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div class="p-4 border-b border-neutral-100">
              <h2 class="font-semibold text-neutral-900">Top Favorited Content</h2>
              <p class="text-sm text-neutral-500">Most popular content by favorites</p>
            </div>
            <div class="divide-y divide-neutral-100 max-h-[400px] overflow-y-auto">
              @for (content of topContent(); track content._id; let i = $index) {
                <div class="p-4 hover:bg-neutral-50 transition-colors">
                  <div class="flex items-center gap-4">
                    <span class="text-sm font-medium text-neutral-400 w-6">{{ i + 1 }}</span>
                    @if (content.coverPhoto) {
                      <img
                        [src]="content.coverPhoto"
                        [alt]="content.title"
                        class="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                    } @else {
                      <div class="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                        <svg class="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    }
                    <div class="min-w-0 flex-1">
                      <h3 class="font-medium text-neutral-900 truncate">{{ content.title }}</h3>
                      <div class="flex items-center gap-2 mt-1">
                        <span
                          class="px-2 py-0.5 text-xs rounded-full capitalize"
                          [ngClass]="favoritesService.getTypeClass(content.type)"
                        >
                          {{ content.type }}
                        </span>
                        @if (content.hubName) {
                          <span class="text-xs text-neutral-500">{{ content.hubName }}</span>
                        }
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-lg font-semibold text-neutral-900">{{ content.favoriteCount }}</div>
                      <div class="text-xs text-neutral-500">favorites</div>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="p-8 text-center text-neutral-500">
                  <svg class="w-12 h-12 mx-auto text-neutral-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No favorited content yet</p>
                </div>
              }
            </div>
            @if (hasMoreContent()) {
              <div class="p-3 border-t border-neutral-100 text-center">
                <button
                  (click)="loadMoreContent()"
                  class="text-sm font-medium text-primary hover:underline"
                >
                  Load More
                </button>
              </div>
            }
          </div>

          <!-- User Engagement -->
          <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div class="p-4 border-b border-neutral-100">
              <h2 class="font-semibold text-neutral-900">User Engagement</h2>
              <p class="text-sm text-neutral-500">Most active users by favorites</p>
            </div>
            <div class="divide-y divide-neutral-100 max-h-[400px] overflow-y-auto">
              @for (user of userEngagement(); track user._id; let i = $index) {
                <div class="p-4 hover:bg-neutral-50 transition-colors">
                  <div class="flex items-center gap-4">
                    <span class="text-sm font-medium text-neutral-400 w-6">{{ i + 1 }}</span>
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
                    <div class="min-w-0 flex-1">
                      <h3 class="font-medium text-neutral-900">{{ user.name }}</h3>
                      <p class="text-sm text-neutral-500 truncate">{{ user.email }}</p>
                    </div>
                    <div class="text-right">
                      <div class="text-lg font-semibold text-neutral-900">{{ user.favoriteCount }}</div>
                      <div class="text-xs text-neutral-500">favorites</div>
                    </div>
                  </div>
                </div>
              } @empty {
                <div class="p-8 text-center text-neutral-500">
                  <svg class="w-12 h-12 mx-auto text-neutral-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p>No user engagement data yet</p>
                </div>
              }
            </div>
            @if (hasMoreUsers()) {
              <div class="p-3 border-t border-neutral-100 text-center">
                <button
                  (click)="loadMoreUsers()"
                  class="text-sm font-medium text-primary hover:underline"
                >
                  Load More
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class FavoritesComponent implements OnInit {
  readonly favoritesService = inject(FavoritesService);

  // Service signals
  readonly loading = this.favoritesService.loading;
  readonly error = this.favoritesService.error;
  readonly hasData = this.favoritesService.hasData;
  readonly selectedPeriod = this.favoritesService.selectedPeriod;
  readonly totalFavorites = this.favoritesService.totalFavorites;
  readonly activeUsers = this.favoritesService.activeUsers;
  readonly thisMonthFavorites = this.favoritesService.thisMonthFavorites;
  readonly avgPerUser = this.favoritesService.avgPerUser;
  readonly favoritesTrend = this.favoritesService.favoritesTrend;
  readonly countByType = this.favoritesService.countByType;
  readonly topContent = this.favoritesService.topContent;
  readonly userEngagement = this.favoritesService.userEngagement;
  readonly hasMoreContent = this.favoritesService.hasMoreContent;
  readonly hasMoreUsers = this.favoritesService.hasMoreUsers;

  exporting = false;

  readonly periods: { value: PeriodFilter; label: string }[] = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '12m', label: 'Last 12 months' },
  ];

  ngOnInit(): void {
    this.favoritesService.loadAnalytics();
  }

  onPeriodChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.favoritesService.setPeriod(select.value as PeriodFilter);
  }

  refresh(): void {
    this.favoritesService.refresh();
  }

  loadMoreContent(): void {
    this.favoritesService.loadMoreContent();
  }

  loadMoreUsers(): void {
    this.favoritesService.loadMoreUsers();
  }

  exportData(): void {
    this.exporting = true;
    this.favoritesService.exportCsv().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `favorites-analytics-${this.selectedPeriod()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.exporting = false;
      },
      error: (err) => {
        console.error('Error exporting data:', err);
        this.exporting = false;
      },
    });
  }

  getUserInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }
}
