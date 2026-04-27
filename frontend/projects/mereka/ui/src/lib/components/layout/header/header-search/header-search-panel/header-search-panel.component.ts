import {
  Component,
  inject,
  ViewEncapsulation,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { SearchService } from '@mereka/core';
import type { QuickLinkItem } from '@mereka/core';

@Component({
  selector: 'common-header-search-panel',
  imports: [RouterLink],
  templateUrl: './header-search-panel.component.html',
  styleUrl: './header-search-panel.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'common-header-search-panel',
  },
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
