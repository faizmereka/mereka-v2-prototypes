import { Component } from '@angular/core';
import { UIAnchor } from '@mereka/ui/ui-button/ui-button';
import { LottieComponent, AnimationOptions } from 'ngx-lottie';

/**
 * Home Banner Section
 * Migrated from mereka-web-ssr.
 *
 * @figma https://www.figma.com/design/TqJYVfwP9o1tx3A2UhR3Rz/Homepage%2C-Search-and-Collections?node-id=6243-117811&m=dev
 *
 * Static section — no data inputs required.
 */
@Component({
  selector: 'home-section-banner, [home-section-banner]',
  imports: [
    UIAnchor,
    LottieComponent,
  ],
  templateUrl: './home-section-banner.component.html',
  styleUrl: './home-section-banner.component.scss',
  host: {
    class: 'layout-section bg-underlay banner',
  },
})
export class HomeSectionBannerComponent {
  readonly banner: AnimationOptions = {
    path: '/assets/lottie/chat.json',
  };
}