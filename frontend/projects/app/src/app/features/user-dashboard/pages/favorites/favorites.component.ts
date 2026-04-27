import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconComponent, type IconName } from '@mereka/ui';
import { LearnerFavoriteService, type FavoriteType, type FavoriteItem } from '../../services/learner-favorite.service';
import { environment } from '../../../../../environments/environment';

interface FilterTab {
  id: FavoriteType | 'all';
  label: string;
}

@Component({
  selector: 'app-user-favorites',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-neutral-900">My Favorites</h1>
          <p class="text-neutral-600 mt-1">Manage your saved items</p>
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

      <!-- Filter Tabs -->
      <div class="flex gap-2 border-b border-neutral-200 pb-1 overflow-x-auto">
        @for (tab of filterTabs; track tab.id) {
          <button
            (click)="setFilter(tab.id)"
            [class.border-primary]="activeFilter() === tab.id"
            [class.text-primary]="activeFilter() === tab.id"
            [class.border-transparent]="activeFilter() !== tab.id"
            [class.text-neutral-500]="activeFilter() !== tab.id"
            class="px-4 py-2 font-medium border-b-2 -mb-[5px] transition-colors hover:text-primary whitespace-nowrap flex items-center gap-2"
          >
            {{ tab.label }}
            <span
              class="px-2 py-0.5 text-xs rounded-full"
              [class.bg-primary]="activeFilter() === tab.id"
              [class.text-white]="activeFilter() === tab.id"
              [class.bg-neutral-100]="activeFilter() !== tab.id"
              [class.text-neutral-600]="activeFilter() !== tab.id"
            >
              {{ getCount(tab.id) }}
            </span>
          </button>
        }
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden animate-pulse">
              <div class="h-40 bg-neutral-200"></div>
              <div class="p-4 space-y-3">
                <div class="h-5 bg-neutral-200 rounded w-3/4"></div>
                <div class="h-4 bg-neutral-100 rounded w-1/2"></div>
              </div>
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

      <!-- Empty State -->
      @else if (!hasFavorites()) {
        <div class="bg-white rounded-xl border border-neutral-200 p-12 text-center">
          <svg class="w-16 h-16 mx-auto text-neutral-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <h3 class="text-lg font-medium text-neutral-900 mb-2">No favorites yet</h3>
          <p class="text-neutral-600 mb-6">
            Browse and save experts, hubs, and services you're interested in.
          </p>
          <a
            [href]="webUrl"
            class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Explore Services
          </a>
        </div>
      }

      <!-- Favorites Grid -->
      @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (favorite of filteredFavorites(); track favorite._id) {
            <div class="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow group">
              <!-- Image -->
              <a [href]="getItemUrl(favorite)" class="block relative">
                @if (getItemImage(favorite)) {
                  <img
                    [src]="getItemImage(favorite)"
                    [alt]="getItemTitle(favorite)"
                    class="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                } @else {
                  <div class="w-full h-40 bg-neutral-100 flex items-center justify-center">
                    <ui-icon [name]="getItemIcon(favorite)" class="w-12 h-12 text-neutral-300" />
                  </div>
                }

                <!-- Type Badge -->
                <span
                  class="absolute top-3 left-3 px-2 py-1 text-xs font-medium rounded-full capitalize"
                  [class.bg-purple-100]="favorite.favoriteableType === 'expertise'"
                  [class.text-purple-700]="favorite.favoriteableType === 'expertise'"
                  [class.bg-blue-100]="favorite.favoriteableType === 'experience'"
                  [class.text-blue-700]="favorite.favoriteableType === 'experience'"
                  [class.bg-emerald-100]="favorite.favoriteableType === 'expert'"
                  [class.text-emerald-700]="favorite.favoriteableType === 'expert'"
                  [class.bg-amber-100]="favorite.favoriteableType === 'hub'"
                  [class.text-amber-700]="favorite.favoriteableType === 'hub'"
                >
                  {{ favorite.favoriteableType }}
                </span>
              </a>

              <!-- Content -->
              <div class="p-4">
                <a [href]="getItemUrl(favorite)" class="block">
                  <h3 class="font-semibold text-neutral-900 group-hover:text-primary transition-colors line-clamp-1">
                    {{ getItemTitle(favorite) }}
                  </h3>
                </a>

                @if (favorite.entity?.hub?.name) {
                  <p class="text-sm text-neutral-500 mt-1">
                    by {{ favorite.entity?.hub?.name }}
                  </p>
                }

                @if (favorite.entity?.location?.city) {
                  <p class="text-sm text-neutral-500 mt-1 flex items-center gap-1">
                    <ui-icon name="location" class="w-3 h-3" />
                    {{ favorite.entity?.location?.city }}
                    @if (favorite.entity?.location?.country) {
                      , {{ favorite.entity?.location?.country }}
                    }
                  </p>
                }

                <!-- Actions -->
                <div class="flex items-center justify-between mt-4 pt-4 border-t border-neutral-100">
                  <a
                    [href]="getItemUrl(favorite)"
                    class="text-sm font-medium text-primary hover:underline"
                  >
                    View Details
                  </a>
                  <button
                    (click)="toggleFavorite(favorite)"
                    class="p-2 rounded-lg transition-colors"
                    [class.text-red-500]="!isUnfavorited(favorite._id)"
                    [class.hover:text-red-600]="!isUnfavorited(favorite._id)"
                    [class.hover:bg-red-50]="!isUnfavorited(favorite._id)"
                    [class.text-neutral-400]="isUnfavorited(favorite._id)"
                    [class.hover:text-red-500]="isUnfavorited(favorite._id)"
                    [class.hover:bg-neutral-50]="isUnfavorited(favorite._id)"
                    [title]="isUnfavorited(favorite._id) ? 'Add to favorites' : 'Remove from favorites'"
                  >
                    @if (isUnfavorited(favorite._id)) {
                      <!-- Outline heart (unfavorited) -->
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                      </svg>
                    } @else {
                      <!-- Filled heart (favorited) -->
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    }
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class UserFavoritesComponent implements OnInit {
  private readonly favoriteService = inject(LearnerFavoriteService);
  readonly webUrl = environment.webUrl;

  // Track items that have been unfavorited (but still shown)
  private readonly _unfavoritedIds = signal<Set<string>>(new Set());

  // Service signals
  readonly loading = this.favoriteService.loading;
  readonly error = this.favoriteService.error;
  readonly hasFavorites = this.favoriteService.hasFavorites;
  readonly filteredFavorites = this.favoriteService.filteredFavorites;
  readonly activeFilter = this.favoriteService.activeFilter;
  readonly countByType = this.favoriteService.countByType;

  readonly filterTabs: FilterTab[] = [
    { id: 'all', label: 'All' },
    { id: 'expert', label: 'Experts' },
    { id: 'hub', label: 'Hubs' },
    { id: 'expertise', label: 'Expertise' },
    { id: 'experience', label: 'Experiences' },
  ];

  ngOnInit(): void {
    void this.favoriteService.loadFavorites();
  }

  setFilter(filter: FavoriteType | 'all'): void {
    this.favoriteService.setFilter(filter);
  }

  getCount(filter: FavoriteType | 'all'): number {
    return this.countByType()[filter];
  }

  /**
   * Check if an item has been unfavorited (but still showing on screen)
   */
  isUnfavorited(favoriteId: string): boolean {
    return this._unfavoritedIds().has(favoriteId);
  }

  /**
   * Toggle favorite status without immediately removing from list
   */
  async toggleFavorite(favorite: FavoriteItem): Promise<void> {
    const isCurrentlyUnfavorited = this._unfavoritedIds().has(favorite._id);

    if (isCurrentlyUnfavorited) {
      // Re-favorite: Remove from unfavorited set (heart becomes red again)
      this._unfavoritedIds.update(set => {
        const newSet = new Set(set);
        newSet.delete(favorite._id);
        return newSet;
      });
      // Add back to favorites in backend
      await this.favoriteService.addFavorite(
        favorite.favoriteableType,
        favorite.favoriteableId
      );
    } else {
      // Unfavorite: Add to unfavorited set (heart becomes outline)
      this._unfavoritedIds.update(set => {
        const newSet = new Set(set);
        newSet.add(favorite._id);
        return newSet;
      });
      // Remove from backend but keep in list (keepInList = true)
      await this.favoriteService.removeFavorite(favorite._id, true);
    }
  }

  async refresh(): Promise<void> {
    // Clear unfavorited tracking on refresh
    this._unfavoritedIds.set(new Set());
    await this.favoriteService.refresh();
  }

  getItemTitle(favorite: FavoriteItem): string {
    const entity = favorite.entity;
    if (!entity) return 'Unknown';
    return entity.title || entity.name || 'Unknown';
  }

  getItemImage(favorite: FavoriteItem): string | undefined {
    const entity = favorite.entity;
    if (!entity) return undefined;
    return entity.coverPhoto || entity.profilePhoto || entity.logo;
  }

  getItemUrl(favorite: FavoriteItem): string {
    const entity = favorite.entity;
    if (!entity?.slug) return '#';

    switch (favorite.favoriteableType) {
      case 'expert':
        return `${this.webUrl}/expert/${entity.slug}`;
      case 'hub':
        return `${this.webUrl}/hub/${entity.slug}`;
      case 'expertise':
        return `${this.webUrl}/expertise/${entity.slug}`;
      case 'experience':
        return `${this.webUrl}/experience/${entity.slug}`;
      default:
        return '#';
    }
  }

  getItemIcon(favorite: FavoriteItem): IconName {
    switch (favorite.favoriteableType) {
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
