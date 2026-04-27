import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { UIAnchor } from '@mereka/ui/ui-button/ui-button';
import { UILoaderSkeleton, UILoaderSkeletonGroup } from '@mereka/ui/ui-loader-skeleton/ui-loader-skeleton';
import { UISwiper } from '@mereka/ui/ui-swiper/ui-swiper';
import { UISwiperSlide } from '@mereka/ui/ui-swiper/ui-swiper-slide';
import { UISwiperPagination } from '@mereka/ui/ui-swiper/ui-swiper-pagination';
import { FreeMode, Navigation, Pagination } from 'swiper/modules';
import { SwiperOptions } from 'swiper/types';
import type { HomeReviewItem } from '../../models/home.model';

/**
 * Home Reviews Section
 * Migrated from mereka-web-ssr.
 *
 * @figma desktop https://www.figma.com/file/TqJYVfwP9o1tx3A2UhR3Rz/Homepage%2C-Discoverability-and-Collections?type=design&node-id=6242-20567
 * @figma mobile https://www.figma.com/file/TqJYVfwP9o1tx3A2UhR3Rz/Homepage%2C-Discoverability-and-Collections?type=design&node-id=6243-122174
 *
 * Data is passed via input() from the parent HomePage.
 *
 * @TODO: Reviews API - requires a new v2 backend endpoint for featured reviews.
 *   1. Create GET /home/reviews endpoint in backend-v2.
 *   2. Create ReviewService in the web project.
 *   3. Add reviews fetching to home.resolver.ts.
 *   4. Pass via [reviews]="reviews()" in home.page.html.
 *   Until then, the section is hidden when reviews array is empty (default).
 *
 * @TODO: Mobile read-more/read-less truncation - ConstructPipe and TruncatePipe
 *   from @common are not available in v2.
 *   Currently: full review text always shown (ratingRange() replaces ConstructPipe).
 *
 * @TODO: ImageKit image optimization - ImageKitPipe not available in v2 yet.
 * @TODO: Mobile/desktop detection - ViewBreakpointService not yet ported.
 *   Currently: desktop layout (with side review image) always shown.
 */
@Component({
  selector: 'home-section-reviews, [home-section-reviews]',
  imports: [
    RouterLink,
    MatIcon,
    UIAnchor,
    UILoaderSkeleton,
    UILoaderSkeletonGroup,
    UISwiper,
    UISwiperSlide,
    UISwiperPagination,
  ],
  templateUrl: './home-section-reviews.component.html',
  styleUrl: './home-section-reviews.component.scss',
  host: {
    'class': 'layout-section bg-underlay reviews',
  },
})
export class HomeSectionReviewsComponent {
  /** Featured reviews from parent. TODO: Wire up via ReviewService once v2 endpoint exists. */
  readonly reviews = input<HomeReviewItem[]>([]);
  readonly loading = input<boolean>(false);

  readonly configReviews: SwiperOptions = {
    modules: [Navigation, Pagination, FreeMode],
    direction: 'horizontal',
    spaceBetween: 12,
    centeredSlides: false,
    slidesPerView: 1,
    slidesPerGroup: 1,
    roundLengths: true,
    allowTouchMove: true,
    pagination: {
      el: '.ui-swiper-pagination',
      type: 'bullets',
      clickable: true,
      dynamicBullets: true,
      dynamicMainBullets: 5,
    },
  };

  /** Returns an array of `count` items for star rating @for iteration (replaces ConstructPipe) */
  ratingRange(count: number): number[] {
    return Array.from({ length: Math.max(0, Math.round(count)) }, (_, i) => i);
  }
}
