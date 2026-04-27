import {
  Component,
  inject,
  ChangeDetectionStrategy,
  PLATFORM_ID,
  HostListener,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SearchService } from '@mereka/core';
import { HeaderSearchBarComponent } from './header-search-bar/header-search-bar.component';
import { HeaderSearchPanelComponent } from './header-search-panel/header-search-panel.component';

@Component({
  selector: 'web-header-search',
  standalone: true,
  imports: [CommonModule, HeaderSearchBarComponent, HeaderSearchPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block relative',
  },
  template: `
    <!-- Desktop View -->
    @if (!isMobile) {
      <web-header-search-bar (click)="searchBarOpen($event)" />
      @if (searchService.panelExpanded()) {
        <web-header-search-panel />
      }
    } @else {
      <!-- Mobile View - Full Screen Overlay -->
      @if (searchService.panelExpanded()) {
        <div class="header-search-overlay fixed inset-0 z-[100] bg-[#F5F6F7] flex flex-col justify-end overflow-hidden">
          <div class="header-search-container relative">
            <!-- Header -->
            <div class="flex gap-4 px-6 py-5">
              <button
                type="button"
                class="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                (click)="onBack()">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
              </button>
              <div class="flex flex-col gap-2">
                <span class="text-[1.375rem] font-bold leading-none tracking-[-0.15px]">What are you looking for?</span>
              </div>
            </div>

            <!-- Search Main -->
            <div class="header-search-main pt-6 bg-white rounded-t-[1.25rem]">
              <web-header-search-bar [mobile]="true" (click)="searchBarToggle($event)" />
              <web-header-search-panel class="block w-full overflow-y-auto h-[60svh] scrollbar" />
            </div>
          </div>
        </div>
      }
    }
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
    }

    .scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #d1d5db transparent;
    }

    .scrollbar::-webkit-scrollbar {
      width: 6px;
    }

    .scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }

    .scrollbar::-webkit-scrollbar-thumb {
      background-color: #d1d5db;
      border-radius: 3px;
    }
  `],
})
export class HeaderSearchComponent {
  readonly searchService = inject(SearchService);
  private readonly platformId = inject(PLATFORM_ID);

  get isMobile(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false; // Default to desktop on SSR
    }
    return window.innerWidth < 1024;
  }

  @HostListener('document:click')
  onClickOutside(): void {
    if (!this.isMobile) {
      this.searchService.close();
    }
  }

  searchBarToggle(event: Event): void {
    event.stopPropagation();
    if (!this.isMobile) {
      this.searchService.close();
    }
  }

  searchBarOpen(event: Event): void {
    event.stopPropagation();
    if (!this.isMobile) {
      this.searchService.open();
    }
  }

  onSearchClicked(): void {
    this.searchService.open();
  }

  onBack(): void {
    this.searchService.close();
  }
}
