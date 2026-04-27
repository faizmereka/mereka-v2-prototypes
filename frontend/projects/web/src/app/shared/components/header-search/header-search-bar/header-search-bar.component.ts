import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  ChangeDetectionStrategy,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SearchService } from '@mereka/core';

@Component({
  selector: 'web-header-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block relative',
    '(click)': 'focusSearchInput()',
  },
  template: `
    <div class="search-box h-12 flex" [class.search-box--mobile]="mobile">
      <div class="search-box__wrap flex w-full items-center gap-3 border-none bg-transparent"
           [class.search-box__wrap--desktop]="!mobile">
        <!-- Search Icon -->
        <svg class="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>

        <!-- Input -->
        <input
          #searchInput
          type="text"
          class="search-box__input w-full bg-transparent border-none outline-none text-gray-900 placeholder-gray-500"
          placeholder="What are you looking for?"
          [value]="searchService.searchTerm()"
          (input)="updateSearchInput(searchInput.value)"
        />

        <!-- Reset Button -->
        @if (searchService.searchTerm()) {
          <button
            type="button"
            class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Reset search"
            (click)="resetSearchInput($event); searchInput.value = ''">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
            </svg>
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .search-box {
      border-bottom: 1px solid #DDDDDE;
      padding: 0 1.25rem;
    }

    .search-box--mobile {
      border-bottom: 1px solid #DDDDDE;
    }

    .search-box__wrap {
      padding: 0.375rem 0;
    }

    .search-box__wrap--desktop {
      padding: 0.375rem 0.75rem 0.375rem 1.25rem;
    }

    .search-box__input:hover {
      cursor: pointer;
    }

    .search-box__input:focus {
      cursor: text;
    }

    @media (min-width: 1024px) {
      .search-box {
        border-radius: 30px;
        border: 1px solid #DDDDDE;
        background: #FFF;
        padding: 0;
      }
    }
  `],
})
export class HeaderSearchBarComponent {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  readonly searchService = inject(SearchService);

  /** Mobile mode flag */
  @Input() mobile = false;

  focusSearchInput(): void {
    this.searchInput?.nativeElement?.focus();
  }

  updateSearchInput(value: string): void {
    this.searchService.updateSearchTerm(value);
  }

  resetSearchInput(event: Event): void {
    event.stopPropagation();
    this.searchService.updateSearchTerm('');
    this.searchService.resetSearch();
  }
}
