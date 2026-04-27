import { Component, input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ViewBreakpointService } from '@mereka/core';
import { UIAnchor } from '@mereka/ui/ui-button/ui-button';
import { UICardExperience } from '@mereka/ui/ui-card/templates/ui-card-experience';
import { UILoaderSkeletonCardExperience } from '@mereka/ui/ui-loader-skeleton/templates/ui-loader-skeleton-card-experience';
import { UISwiper } from '@mereka/ui/ui-swiper/ui-swiper';
import { UISwiperSlide } from '@mereka/ui/ui-swiper/ui-swiper-slide';
import { UI_SWIPER_BASE_CONFIG } from '@mereka/ui/ui-swiper/ui-swiper-config';
import { SwiperOptions } from 'swiper/types';
import type { HomeExperienceItem } from '../../models/home.model';

/**
 * Home Experiences Section
 * Migrated from mereka-web-ssr.
 *
 * @figma https://www.figma.com/design/TqJYVfwP9o1tx3A2UhR3Rz/Homepage%2C-Search-and-Collections?node-id=6243-117811&m=dev
 *
 * Data is passed via input() from the parent HomePage (HomeService).
 *
 * @TODO: Experience filters (Today / The Weekend / Free) - filter API not yet integrated.
 *   - Old: selectFilterType(filterType) triggered a new use case call.
 *   - Currently: Filter buttons are commented out; all experiences shown.
 *
 * @TODO: Favourite/bookmark toggle - ToggleFavouriteUseCase + IsFavouriteUseCase not yet in v2.
 * @TODO: ImageKit image optimization - ImageKitPipe not available in v2 yet.
 * @TODO: Google Analytics tracking (cardClick event) - GoogleAnalyticsService not yet in v2.
 * ViewBreakpointService wired: Swiper carousel on mobile, grid on desktop.
 */
@Component({
  selector: 'home-section-experiences, [home-section-experiences]',
  imports: [
    RouterModule,
    UIAnchor,
    UICardExperience,
    UILoaderSkeletonCardExperience,
    UISwiper,
    UISwiperSlide,
  ],
  templateUrl: './home-section-experiences.component.html',
  styleUrl: './home-section-experiences.component.scss',
  host: {
    'class': 'layout-section bg-underlay experiences',
  },
})
export class HomeSectionExperiencesComponent {
  readonly view = inject(ViewBreakpointService);
  readonly config: SwiperOptions = UI_SWIPER_BASE_CONFIG;

  /** Experiences list from parent - fetched via HomeService */
  readonly experiences = input<HomeExperienceItem[]>([]);
  readonly loading = input<boolean>(false);

  readonly placeholderList = new Array(4);

  /** Format price from ticket data for UICardExperience */
  formatPrice(experience: HomeExperienceItem): { beforeLabel: string; amount: string; afterLabel: string } {
    const tickets = experience.ticket ?? [];
    const hasFree = tickets.some(t => t.ticketType === 'Free');

    if (hasFree || tickets.length === 0) {
      return { beforeLabel: '', amount: 'FREE', afterLabel: '' };
    }

    const prices = tickets.map(t => t.ticketPrice);
    const minPrice = Math.min(...prices);
    const beforeLabel = tickets.length > 1 ? 'From' : '';
    const amount = `${experience.currency} ${minPrice.toLocaleString()}`;

    return { beforeLabel, amount, afterLabel: '/ ticket' };
  }
}
