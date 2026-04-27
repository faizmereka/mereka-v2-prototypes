import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { HubListItem } from '../../models';

@Component({
  selector: 'app-hub-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a
      [routerLink]="['/hub', hub().slug]"
      class="block bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden group h-full"
    >
      <div class="p-6">
        <!-- Action Icons -->
        <div class="flex justify-end gap-2 mb-4">
          <button
            (click)="onFavoriteClick($event)"
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            [attr.aria-label]="isFavorited() ? 'Remove from favorites' : 'Add to favorites'"
          >
            @if (isFavorited()) {
              <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            } @else {
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
            }
          </button>
          <button
            (click)="$event.preventDefault(); $event.stopPropagation()"
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </button>
        </div>

        <!-- Logo -->
        <div class="mb-4">
          @if (hub().logo) {
            <img
              [src]="hub().logo"
              [alt]="hub().name"
              class="w-20 h-20 rounded-lg object-cover"
            />
          } @else {
            <div
              class="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-400"
            >
              {{ getInitials(hub().name) }}
            </div>
          }
        </div>

        <!-- Hub Name -->
        <h3 class="text-lg font-semibold text-[#1a1623] group-hover:text-[#276EF1] transition-colors mb-1">
          {{ hub().name }}
        </h3>

        <!-- Company Type -->
        @if (hub().companyType) {
          <p class="text-sm text-gray-500 mb-2">
            {{ hub().companyType?.name }}
          </p>
        }

        <!-- Rating -->
        @if (hub().totalReviews) {
          <div class="flex items-center gap-1.5 mb-3">
            <svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span class="text-sm font-medium text-gray-900">{{ hub().rating?.toFixed(1) }}</span>
            <span class="text-sm text-gray-500">({{ hub().totalReviews }})</span>
          </div>
        }

        <!-- Location -->
        @if (getLocationText()) {
          <div class="flex items-center gap-1.5 text-sm text-gray-500">
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {{ getLocationText() }}
          </div>
        }
      </div>
    </a>
  `,
})
export class HubCardComponent {
  readonly hub = input.required<HubListItem>();
  readonly isFavorited = input<boolean>(false);
  readonly favorite = output<string>();

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getLocationText(): string {
    const loc = this.hub().location;
    if (!loc) return '';
    const parts = [loc.city, loc.country].filter(Boolean);
    return parts.join(', ');
  }

  onFavoriteClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.favorite.emit(this.hub()._id);
  }
}
