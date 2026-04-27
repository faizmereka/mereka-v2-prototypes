import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { SiteFooter } from '@mereka/ui/layout/footer/footer.component';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { HomeService } from '../../services/home.service';
import { ExpertService } from '../../../experts/services/expert.service';
import { HubService } from '../../../hubs/services/hub.service';
import { JobService } from '../../../jobs/services';
import { HomeSectionHeroComponent } from '../../components/home-section-hero/home-section-hero.component';
import { HomeSectionExpertsComponent } from '../../components/home-section-experts/home-section-experts.component';
import { HomeSectionExpertisesComponent } from '../../components/home-section-expertises/home-section-expertises.component';
import { HomeSectionExperiencesComponent } from '../../components/home-section-experiences/home-section-experiences.component';
import { HomeSectionJobsComponent } from '../../components/home-section-jobs/home-section-jobs.component';
import { HomeSectionReviewsComponent } from '../../components/home-section-reviews/home-section-reviews.component';
import { HomeSectionMarketplaceComponent } from '../../components/home-section-marketplace/home-section-marketplace.component';
import { HomeSectionCorporateComponent } from '../../components/home-section-corporate/home-section-corporate.component';
import { HomeExperienceItem, HomeExpertiseItem } from '../../models';

/**
 * Home Page
 * Migrated from mereka-web-ssr.
 *
 * @figma https://www.figma.com/file/TqJYVfwP9o1tx3A2UhR3Rz/Homepage%2C-Discoverability-and-Collections?type=design&node-id=6231-1558
 *
 * @TODO: Meta tags - setMetaTitleHelper / setMetaHelper from @common not available in v2.
 *   Currently: Title and Meta set directly via Angular's Meta/Title services.
 *
 * @TODO: `no-review` query param dialog - UnableReviewDialog from @common not ported to v2.
 *   Currently: query param is ignored.
 *
 * @TODO: Mobile navbar - MobileNavbarComponent from @common not available in v2.
 *
 * @TODO: Reviews section - HomeSectionReviewsComponent hidden until API endpoint exists.
 *   See home-section-reviews.component.ts for details.
 *
 * @TODO: Hubs section - no HomeSectionHubsComponent migrated; rendered inline in this page.
 *   Consider extracting to a dedicated component once stable.
 */
@Component({
  selector: 'homepage',
  imports: [
    RouterModule,
    HeaderComponent,
    SiteFooter,
    HomeSectionHeroComponent,
    HomeSectionExpertsComponent,
    HomeSectionExpertisesComponent,
    HomeSectionExperiencesComponent,
    HomeSectionJobsComponent,
    HomeSectionReviewsComponent,
    HomeSectionMarketplaceComponent,
    HomeSectionCorporateComponent,
  ],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
})
export class HomePage implements OnInit {
  private readonly meta = inject(Meta);
  private readonly titleService = inject(Title);
  private readonly homeService = inject(HomeService);
  private readonly expertService = inject(ExpertService);
  private readonly hubService = inject(HubService);
  private readonly jobService = inject(JobService);

  // Home data signals (populated by route resolver)
  readonly expertises = this.homeService.expertises;
  readonly experiences = this.homeService.experiences;
  readonly reviews = this.homeService.reviews;
  readonly loading = this.homeService.loading;
  readonly reviewsLoading = this.homeService.reviewsLoading;

  // Expert signals
  readonly experts = this.expertService.experts;
  readonly expertsLoading = this.expertService.listLoading;


  // Job signals
  readonly jobs = this.jobService.jobs;
  readonly jobsLoading = this.jobService.listLoading;

  /** Placeholder list for hub loading skeleton (4 cards) */
  readonly placeholderList = new Array(4);

  ngOnInit(): void {
    this.titleService.setTitle('Mereka Connect');
    this.meta.updateTag({ name: 'description', content: 'Connect with leading Experts & Services.' });

    this.expertService.getExperts({ limit: 4 }).subscribe();
    this.hubService.getHubs({ limit: 4, featured: true }).subscribe();
    this.jobService.getJobs({ limit: 3 }).subscribe();
    this.homeService.getReviews().subscribe();
  }

  
  /**
   * Get lowest price for expertise
   */
  getExpertisePrice(expertise: HomeExpertiseItem): number | null {
    return this.homeService.getLowestExpertisePrice(expertise);
  }

  /**
   * Get lowest price for experience
   */
  getExperiencePrice(experience: HomeExperienceItem): number | null {
    return this.homeService.getLowestExperiencePrice(experience);
  }

  /**
   * Check if item has free tier
   */
  hasFree(item: HomeExpertiseItem | HomeExperienceItem): boolean {
    return this.homeService.hasFreeTier(item);
  }

  /**
   * Get location text
   */
  getLocation(location?: { city?: string; country?: string }): string {
    return this.homeService.getLocationText(location);
  }

  /**
   * Format price with currency
   */
  formatPrice(price: number | null, currency: string): string {
    if (price === null) return 'Free';
    if (price === 0) return 'Free';
    return `${currency} ${price.toLocaleString()}`;
  }
}
