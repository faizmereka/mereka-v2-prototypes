import {
  Component,
  inject,
  input,
  OnInit,
  PLATFORM_ID,
  ViewEncapsulation,
} from '@angular/core';
import { Location, NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ViewBreakpointService } from '@mereka/core';
import { UIAnchor, UIButton, UIButtonIconDirective } from '../../ui-button/ui-button';
import { UILoaderSkeleton } from '../../ui-loader-skeleton/ui-loader-skeleton';
import { MerekaLogoComponent } from '../../logo/site-logo/site-logo.component';
import { HeaderSearchComponent } from './header-search/header-search.component';
import { HeaderSearchPanelToggleComponent } from './header-search/header-search-panel-toggle/header-search-panel-toggle.component';

/**
 * Common header for home, collection and detail page.
 * Uses @defer on viewport. Host projects auth/user section via ng-content select="[headerUser]".
 */
@Component({
  selector: 'common-header',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    MerekaLogoComponent,
    HeaderSearchComponent,
    HeaderSearchPanelToggleComponent,
    UIAnchor,
    UIButton,
    UIButtonIconDirective,
    UILoaderSkeleton,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'common-header',
  },
})
export class HeaderComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  readonly view = inject(ViewBreakpointService);
  private readonly location = inject(Location);

  readonly showMobileSearchBar = input<boolean>(true);

  isBrowser = false;

  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  goBack(): void {
    this.location.back();
  }
}
