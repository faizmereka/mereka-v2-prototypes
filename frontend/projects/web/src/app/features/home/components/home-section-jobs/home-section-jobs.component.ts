import { Component, input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ViewBreakpointService } from '@mereka/core';
import { UIAnchor } from '@mereka/ui/ui-button/ui-button';
import { UICardJob } from '@mereka/ui/ui-card/templates/ui-card-job';
import { UILoaderSkeletonCardJob } from '@mereka/ui/ui-loader-skeleton/templates/ui-loader-skeleton-card-job';
import { UISwiper } from '@mereka/ui/ui-swiper/ui-swiper';
import { UISwiperSlide } from '@mereka/ui/ui-swiper/ui-swiper-slide';
import { UI_SWIPER_BASE_CONFIG } from '@mereka/ui/ui-swiper/ui-swiper-config';
import { SwiperOptions } from 'swiper/types';
import type { JobListItem } from '../../../jobs/models/job.model';

/**
 * Home Jobs Section
 * Migrated from mereka-web-ssr.
 *
 * @figma https://www.figma.com/design/TqJYVfwP9o1tx3A2UhR3Rz/Homepage%2C-Search-and-Collections?node-id=6243-117811&m=dev
 *
 * Data is passed via input() from the parent HomePage (JobService).
 *
 * @TODO: Client visibility gating (isClientViewable) removed.
 *   - Old: Job details hidden from non-authenticated / non-role users via GetAuthStateUseCase.
 *   - Currently: isPrivate always false (all job details shown publicly).
 *   - Re-add once auth state integration is available in v2.
 *
 * ViewBreakpointService wired: Swiper carousel on mobile, grid on desktop.
 */
@Component({
  selector: 'home-section-jobs, [home-section-jobs]',
  imports: [
    RouterModule,
    UIAnchor,
    UICardJob,
    UILoaderSkeletonCardJob,
    UISwiper,
    UISwiperSlide,
  ],
  templateUrl: './home-section-jobs.component.html',
  styleUrl: './home-section-jobs.component.scss',
  host: {
    'class': 'layout-section bg-underlay job',
  },
})
export class HomeSectionJobsComponent {
  readonly view = inject(ViewBreakpointService);
  readonly config: SwiperOptions = UI_SWIPER_BASE_CONFIG;

  /** Jobs list from parent - fetched via JobService */
  readonly jobs = input<JobListItem[]>([]);
  readonly loading = input<boolean>(false);

  readonly placeholderList = new Array(3);
}
