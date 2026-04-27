import { Component, input, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ViewBreakpointService } from '@mereka/core';
import { UIAnchor } from '@mereka/ui/ui-button/ui-button';
import { UICardExpertise } from '@mereka/ui/ui-card/templates/ui-card-expertise';
import { UILoaderSkeletonCardExpertise } from '@mereka/ui/ui-loader-skeleton/templates/ui-loader-skeleton-card-expertise';
import { UISwiper } from '@mereka/ui/ui-swiper/ui-swiper';
import { UISwiperSlide } from '@mereka/ui/ui-swiper/ui-swiper-slide';
import { UI_SWIPER_BASE_CONFIG } from '@mereka/ui/ui-swiper/ui-swiper-config';
import { SwiperOptions } from 'swiper/types';
import type { HomeExpertiseItem } from '../../models/home.model';

/**
 * Home Expertises Section
 * Migrated from mereka-web-ssr.
 *
 * @figma https://www.figma.com/design/TqJYVfwP9o1tx3A2UhR3Rz/Homepage%2C-Search-and-Collections?node-id=6243-117811&m=dev
 *
 * Data is passed via input() from the parent HomePage (HomeService).
 *
 * @TODO: Favourite/bookmark toggle - ToggleFavouriteUseCase + IsFavouriteUseCase not yet in v2.
 * @TODO: ImageKit image optimization - ImageKitPipe not available in v2 yet.
 * ViewBreakpointService wired: Swiper carousel on mobile, grid on desktop.
 * @TODO: Expert image on expertise card - expertImage field not available in HomeExpertiseItem yet.
 */
@Component({
  selector: 'home-section-expertises, [home-section-expertises]',
  imports: [
    RouterModule,
    UIAnchor,
    UICardExpertise,
    UILoaderSkeletonCardExpertise,
    UISwiper,
    UISwiperSlide,
  ],
  templateUrl: './home-section-expertises.component.html',
  styleUrl: './home-section-expertises.component.scss',
  host: {
    'class': 'layout-section bg-underlay expertise',
  },
})
export class HomeSectionExpertisesComponent {
  readonly view = inject(ViewBreakpointService);
  readonly config: SwiperOptions = UI_SWIPER_BASE_CONFIG;

  /** Expertises list from parent - fetched via HomeService */
  readonly expertises = input<HomeExpertiseItem[]>([]);
  readonly loading = input<boolean>(false);

  readonly placeholderList = new Array(3);

  /** Format price from ticket data for UICardExpertise */
  formatPrice(expertise: HomeExpertiseItem): { beforeLabel: string; amount: string; afterLabel: string } {
    const tickets = expertise.ticket ?? [];
    const hasFree = tickets.some(t => t.ticketType === 'Free');

    if (hasFree || tickets.length === 0) {
      return { beforeLabel: '', amount: 'FREE', afterLabel: '' };
    }

    const prices = tickets.map(t => t.standardRate);
    const minPrice = Math.min(...prices);
    const beforeLabel = tickets.length > 1 ? 'From' : '';
    const amount = `${expertise.currency} ${minPrice.toLocaleString()}`;
    const afterLabel = '/ session';

    return { beforeLabel, amount, afterLabel };
  }
}
