import {
  ChangeDetectionStrategy,
  Component,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { UIButton, UIButtonIconDirective } from '../../../ui-button/ui-button';
import { ViewBreakpointService, SearchService } from '@mereka/core';
import { HeaderSearchBarComponent } from './header-search-bar/header-search-bar.component';
import { HeaderSearchPanelComponent } from './header-search-panel/header-search-panel.component';
import { HeaderAnimation } from '../header.animations';

@Component({
  selector: 'common-header-search',
  imports: [
    HeaderSearchBarComponent,
    HeaderSearchPanelComponent,
    UIButton,
    UIButtonIconDirective,
  ],
  templateUrl: './header-search.component.html',
  styleUrl: './header-search.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [HeaderAnimation.fadeInOut, HeaderAnimation.panelSlideUpDown],
  host: {
    class: 'common-header-search',
    '(document:click)': 'onClickOutside()',
  },
})
export class HeaderSearchComponent {
  readonly view = inject(ViewBreakpointService);
  readonly searchService = inject(SearchService);

  searchBarToggle(e: Event): void {
    e.stopPropagation();
    if (this.view.isTabletMax()) {
      this.searchService.close();
    }
  }

  searchBarOpen(e: Event): void {
    e.stopPropagation();
    if (!this.view.isTabletMax()) {
      this.searchService.open();
    }
  }

  onSearchClicked(): void {
    this.searchService.open();
  }

  onClickOutside(): void {
    if (!this.view.isTabletMax()) {
      this.searchService.close();
    }
  }

  onBack(): void {
    this.searchService.close();
  }
}
