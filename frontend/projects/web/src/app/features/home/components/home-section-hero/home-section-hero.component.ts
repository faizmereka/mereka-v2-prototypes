import { Component, inject } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { RouterModule } from '@angular/router';
import { LottieComponent, AnimationOptions } from 'ngx-lottie';
import { ViewBreakpointService } from '@mereka/core';

/**
 * Home Hero Section
 * Migrated from mereka-web-ssr.
 *
 * @figma desktop https://www.figma.com/file/TqJYVfwP9o1tx3A2UhR3Rz/Homepage%2C-Discoverability-and-Collections?type=design&node-id=6231-1585
 * @figma mobile https://www.figma.com/file/TqJYVfwP9o1tx3A2UhR3Rz/Homepage%2C-Discoverability-and-Collections?type=design&node-id=6243-121916
 *
 * @TODO: HeaderSearchPanelToggleComponent not available in v2 yet.
 *   - Re-add once common search panel is ported.
 */
@Component({
  selector: 'home-section-hero, [home-section-hero]',
  imports: [
    RouterModule,
    LottieComponent,
  ],
  templateUrl: './home-section-hero.component.html',
  styleUrl: './home-section-hero.component.scss',
  host: {
    'class': 'layout-section hero',
  },
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: 0 })),
      transition(':enter', animate('750ms ease')),
    ]),
  ],
})
export class HomeSectionHeroComponent {
  readonly view = inject(ViewBreakpointService);

  readonly options: AnimationOptions = {
    path: '/assets/feat/homepage/lottie/homepage-hero.json',
  };
}
