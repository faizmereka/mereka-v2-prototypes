import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UIButton } from '@mereka/ui/ui-button/ui-button';
import { SearchService } from '@mereka/core';

@Component({
  selector: 'common-header-search-bar',
  imports: [FormsModule, UIButton],
  templateUrl: './header-search-bar.component.html',
  styleUrl: './header-search-bar.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'common-header-search-bar',
    '(click)': 'focusSearchInput()',
  },
})
export class HeaderSearchBarComponent {
  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  readonly searchService = inject(SearchService);

  focusSearchInput(): void {
    this.searchInputRef?.nativeElement?.focus();
  }

  updateSearchInput(value: string): void {
    this.searchService.updateSearchTerm(value);
  }

  resetSearchInput(e: Event): void {
    e?.stopPropagation();
    this.searchService.updateSearchTerm('');
    this.searchService.resetSearch();
  }
}
