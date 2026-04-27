import { Component, input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ViewBreakpointService } from '@mereka/core';
import { UIAnchor } from '@mereka/ui/ui-button/ui-button';
import { UICardExpert } from '@mereka/ui/ui-card/templates/ui-card-expert';
import { UILoaderSkeletonCardExpert } from '@mereka/ui/ui-loader-skeleton/templates/ui-loader-skeleton-card-expert';
import { UISwiper } from '@mereka/ui/ui-swiper/ui-swiper';
import { UISwiperSlide } from '@mereka/ui/ui-swiper/ui-swiper-slide';
import { UI_SWIPER_BASE_CONFIG } from '@mereka/ui/ui-swiper/ui-swiper-config';
import { SwiperOptions } from 'swiper/types';
import type { ExpertListItem } from '../../../experts/models/expert.model';

/**
 * Home Experts Section
 * Migrated from mereka-web-ssr.
 *
 * @figma https://www.figma.com/design/TqJYVfwP9o1tx3A2UhR3Rz/Homepage%2C-Search-and-Collections?node-id=6243-117811&m=dev
 *
 * Data is passed via input() from the parent HomePage.
 *
 * @TODO: Favourite/bookmark toggle - ToggleFavouriteUseCase + IsFavouriteUseCase not yet in v2.
 *   - isFavourite is always false; (favorite) output is ignored.
 *
 * @TODO: ImageKit image optimization - ImageKitPipe not available in v2 yet.
 *
 * ViewBreakpointService wired: Swiper carousel on mobile, grid on desktop.
 */
@Component({
  selector: 'home-section-experts, [home-section-experts]',
  imports: [
    RouterModule,
    UIAnchor,
    UICardExpert,
    UILoaderSkeletonCardExpert,
    UISwiper,
    UISwiperSlide,
  ],
  templateUrl: './home-section-experts.component.html',
  styleUrl: './home-section-experts.component.scss',
  host: {
    'class': 'layout-section bg-underlay experts',
  },
})
export class HomeSectionExpertsComponent {
  readonly view = inject(ViewBreakpointService);
  readonly config: SwiperOptions = UI_SWIPER_BASE_CONFIG;

  /** Expert list from parent - fetched via ExpertService */
  readonly experts = input<ExpertListItem[]>([]);
  readonly loading = input<boolean>(false);

  readonly placeholderList = new Array(8);
}
