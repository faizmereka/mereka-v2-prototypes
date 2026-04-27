import {
  Component,
  inject,
  ViewEncapsulation,
  ChangeDetectionStrategy,
} from '@angular/core';
import { SearchService } from '@mereka/core';

@Component({
  selector: 'common-header-search-panel-toggle',
  imports: [],
  templateUrl: './header-search-panel-toggle.component.html',
  styleUrl: './header-search-panel-toggle.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'common-header-search-panel-toggle',
  },
})
export class HeaderSearchPanelToggleComponent {
  private readonly searchService = inject(SearchService);

  openSearch(): void {
    this.searchService.open();
  }
}
