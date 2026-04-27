import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SearchService, type SearchResultItem, type QuickLinkItem } from '@mereka/core';

@Component({
  selector: 'web-header-search-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full',
  },
  template: `
    <div class="search-list flex flex-col" role="list">
      <!-- Quick Links (when search term < 3 chars and no results/loading) -->
      @if (!searchService.isLoading() && !searchService.noMatches() && searchService.searchTerm().length < 3) {
        @for (link of quickLinks; track link.route) {
          <a
            class="search-item flex items-center gap-3 px-5 py-2 no-underline transition-colors hover:bg-gray-50 cursor-pointer"
            [routerLink]="link.route"
            (click)="onItemClick()"
            role="listitem">
            <div class="search-item__icon w-10 h-10 flex items-center justify-center rounded-lg bg-gray-50">
              <img [src]="link.icon" alt="" class="w-6 h-6" />
            </div>
            <div class="search-item__text flex flex-col gap-0.5">
              <span class="text-[17px] font-bold text-gray-900">{{ link.title }}</span>
              <span class="text-sm text-gray-500">{{ link.description }}</span>
            </div>
          </a>
        }
      }

      <!-- Search Results -->
      @for (result of searchService.searchResults(); track result.id) {
        <a
          class="search-item flex items-center gap-3 px-5 py-2 no-underline transition-colors hover:bg-gray-50 cursor-pointer focus:outline-2 focus:outline-black focus:-outline-offset-[3px]"
          [routerLink]="searchService.getRoute(result)"
          (click)="onItemClick()"
          role="listitem"
          tabindex="0">
          <div class="search-item__image w-10 h-10 flex flex-shrink-0 items-center justify-center border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
            @if (result.image) {
              <img [src]="result.image" alt="" class="w-full h-full object-cover aspect-square" />
            } @else {
              <div class="w-full h-full bg-gray-200 flex items-center justify-center">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
            }
          </div>
          <div class="search-item__text flex flex-col gap-0.5">
            <span class="text-xs font-bold text-gray-500 uppercase leading-none">{{ result.type }}</span>
            <span class="text-gray-900">{{ result.title }}</span>
          </div>
        </a>
      }

      <!-- No Results -->
      @if (searchService.noMatches()) {
        <div class="px-5 py-3 text-gray-400 text-center">
          There are no results for "{{ searchService.searchTerm() }}".
        </div>
      }

      <!-- Loading -->
      @if (searchService.isLoading()) {
        <div class="search-loading">
          @for (i of [1, 2, 3]; track i) {
            <div class="flex items-center gap-3 px-5 py-2 animate-pulse">
              <div class="w-10 h-10 bg-gray-200 rounded-lg"></div>
              <div class="flex-1">
                <div class="h-3 w-16 bg-gray-200 rounded mb-2"></div>
                <div class="h-4 w-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    @media (min-width: 1024px) {
      :host {
        padding: 1.25rem 0;
        border: 1px solid #DDDDDE;
        border-radius: 1.875rem;
        background: #FFF;
        box-shadow: 0px 10px 24px 0px rgba(0, 0, 0, 0.10);
        overflow: hidden;
        position: absolute;
        transform: translateY(12px);
        z-index: 100;
      }
    }
  `],
})
export class HeaderSearchPanelComponent {
  readonly searchService = inject(SearchService);

  readonly quickLinks: QuickLinkItem[] = [
    {
      title: 'View all Experts',
      description: 'Schedule 1-on-1 sessions',
      icon: '/assets/feat/homepage/icons/services-experts.svg',
      route: '/experts',
    },
    {
      title: 'View all Expertise',
      description: 'Browse services by our Experts',
      icon: '/assets/feat/homepage/icons/services-expertise.svg',
      route: '/expertise',
    },
    {
      title: 'View all Jobs',
      description: 'Opportunities for experts',
      icon: '/assets/feat/homepage/icons/services-jobs.svg',
      route: '/jobs',
    },
    {
      title: 'View all Experiences',
      description: 'Browse activities by Hubs',
      icon: '/assets/feat/homepage/icons/services-experiences.svg',
      route: '/experiences',
    },
    {
      title: 'View all Hubs',
      description: 'Explore organizations & spaces',
      icon: '/assets/feat/homepage/icons/services-hubs.svg',
      route: '/hubs',
    },
  ];

  onItemClick(): void {
    this.searchService.close();
  }
}
