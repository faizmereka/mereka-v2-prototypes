import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ExpertListItem } from '../../models';

@Component({
  selector: 'app-expert-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a
      [routerLink]="['/expert', expert().username]"
      class="block bg-white rounded-xl overflow-hidden group"
    >
      <!-- Photo Section -->
      <div class="relative aspect-square bg-gray-100">
        @if (expert().profilePhoto) {
          <img
            [src]="expert().profilePhoto"
            [alt]="expert().name"
            class="w-full h-full object-cover"
          />
        } @else {
          <div
            class="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400"
          >
            {{ getInitials(expert().name) }}
          </div>
        }

        <!-- Heart Icon -->
        <button
          (click)="onFavoriteClick($event)"
          class="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white transition-colors"
          [attr.aria-label]="isFavorited() ? 'Remove from favorites' : 'Add to favorites'"
        >
          @if (isFavorited()) {
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

      <!-- Info Section -->
      <div class="pt-4">
        <!-- Name -->
        <h3 class="text-base font-semibold text-[#1a1623] uppercase tracking-wide">
          {{ expert().name }}
        </h3>

        <!-- Rating -->
        @if (expert().totalReviews) {
          <div class="flex items-center gap-1.5 mt-1">
            <svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span class="text-sm font-medium text-gray-900">{{ expert().rating?.toFixed(1) }}</span>
            <span class="text-sm text-gray-500">({{ expert().totalReviews }})</span>
          </div>
        }

        <!-- Professional Title / Bio -->
        @if (expert().professionalTitle || expert().bio) {
          <p class="mt-1 text-sm text-gray-600 line-clamp-3">
            {{ expert().professionalTitle || expert().bio }}
          </p>
        }

        <!-- Skills -->
        @if (expert().skills?.length) {
          <div class="mt-3 flex flex-wrap gap-2">
            @for (skill of expert().skills?.slice(0, 3); track skill._id) {
              <span
                class="px-3 py-1 text-xs font-medium border border-gray-300 text-gray-700 rounded-full"
              >
                {{ skill.name }}
              </span>
            }
            @if ((expert().skills?.length ?? 0) > 3) {
              <span class="px-3 py-1 text-xs font-medium text-gray-500">
                + more
              </span>
            }
          </div>
        }
      </div>
    </a>
  `,
})
export class ExpertCardComponent {
  readonly expert = input.required<ExpertListItem>();
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

  onFavoriteClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.favorite.emit(this.expert()._id);
  }
}
