import {
  Component,
  inject,
  OnDestroy,
  effect,
  computed,
  signal,
  afterNextRender,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

import { UiFooterComponent } from '@mereka/ui';
import { SeoService } from '@mereka/core';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { JobBookingWidgetComponent } from '../../components/job-booking-widget/job-booking-widget.component';
import { JobService } from '../../services/job.service';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-job-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, UiFooterComponent, JobBookingWidgetComponent],
  templateUrl: './job-detail.page.html',
  styleUrl: './job-detail.page.scss',
})
export class JobDetailPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly seoService = inject(SeoService);
  private readonly platformId = inject(PLATFORM_ID);
  readonly jobService = inject(JobService);
  private readonly authService = inject(AuthService);

  // Track hydration state to prevent duplicate fetches
  private readonly _hydrated = signal(false);
  // Track which ID we've already fetched to prevent loops
  private _fetchedId: string | null = null;

  // Get ID from route params
  readonly id = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? ''))
  );

  // Expose service signals for template
  readonly job = this.jobService.job;
  readonly loading = this.jobService.loading;
  readonly error = this.jobService.error;

  // Check if user is logged in
  readonly isLoggedIn = computed(() => this.authService.isLoggedIn());

  // Welcome URL for non-logged in users
  readonly welcomeUrl = `${environment.appUrls.app}/welcome/expert`;

  // Computed: show skeleton when loading OR when we have ID but no data yet
  readonly showSkeleton = computed(() => {
    const currentId = this.id();
    const job = this.job();
    const isLoading = this.loading();

    if (isLoading) return true;
    if (currentId && !job) return true;
    if (currentId && job && job._id !== currentId) return true;

    return false;
  });

  constructor() {
    // Initialize auth service
    this.authService.init(false);

    // Wait for hydration to complete before allowing client-side fetches
    afterNextRender(() => {
      this._hydrated.set(true);
    });

    // Effect to fetch data on client navigation when resolver returns null
    effect(() => {
      const currentId = this.id();
      const job = this.job();
      const isLoading = this.loading();
      const hydrated = this._hydrated();

      // Skip if not hydrated yet (let resolver handle SSR data)
      if (!hydrated) return;

      // Skip if already loading
      if (isLoading) return;

      // Skip if we already fetched this ID (prevents infinite loops)
      if (this._fetchedId === currentId) return;

      // Check if we need to fetch
      const needsFetch = currentId && (!job || job._id !== currentId);

      if (needsFetch) {
        // Mark as fetched BEFORE calling to prevent loops
        this._fetchedId = currentId;
        // Trigger fetch
        this.jobService.getJobById(currentId).subscribe((job) => {
          // Lazy load client reviews after job loads
          if (job?.client?.hubId) {
            this.jobService.getClientReviews(job.client.hubId);
          }
        });
        // Lazy load similar jobs (client-side only)
        this.jobService.getSimilarJobs(currentId);
      }
    });

    // Effect to update meta tags when job data changes (SEO)
    effect(() => {
      const job = this.jobService.job();
      if (job) {
        this.updateSeoTags(job);
      }
    });
  }

  ngOnDestroy(): void {
    this.seoService.removeJsonLd();
  }

  sendProposal(): void {
    const job = this.job();
    if (job && isPlatformBrowser(this.platformId)) {
      window.location.href = `${environment.appUrls.app}/jobs/${job._id}/apply`;
    }
  }

  signUp(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.location.href = this.welcomeUrl;
    }
  }

  share(): void {
    const job = this.job();
    if (job && isPlatformBrowser(this.platformId) && navigator.share) {
      navigator.share({
        title: job.jobTitle,
        text: job.jobSummary || 'Check out this job opportunity',
        url: window.location.href,
      });
    }
  }

  /**
   * Update SEO meta tags and JSON-LD structured data
   */
  private updateSeoTags(job: NonNullable<ReturnType<typeof this.job>>): void {
    const pageUrl = `${environment.appUrls.web}/job/${job._id}`;

    // Build keywords
    const keywords = this.seoService.generateKeywords(
      job.jobTitle,
      job.employmentType,
      job.serviceCategory?.category,
      job.serviceCategory?.serviceType,
      'job',
      'freelance',
      'work',
      ...(job.jobSkills || [])
    );

    // Update meta tags
    this.seoService.updateMetaTags({
      title: job.jobTitle,
      description: this.seoService.truncateText(job.jobSummary || job.jobDescription || '', 160),
      keywords,
      url: pageUrl,
      type: 'website',
      author: job.client?.organizationName || 'Mereka',
    });

    // Add JobPosting JSON-LD structured data
    this.addJobPostingJsonLd(job, pageUrl);
  }

  /**
   * Add JobPosting JSON-LD for SEO
   */
  private addJobPostingJsonLd(job: NonNullable<ReturnType<typeof this.job>>, pageUrl: string): void {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: job.jobTitle,
      description: job.jobDescription,
      datePosted: job.createdDate || job.createdAt,
      employmentType: this.mapEmploymentType(job.employmentType),
      hiringOrganization: job.client?.organizationName
        ? {
            '@type': 'Organization',
            name: job.client.organizationName,
          }
        : undefined,
      jobLocation: job.jobLocation
        ? {
            '@type': 'Place',
            address: job.preferredLocation?.[0] || job.jobLocation,
          }
        : undefined,
      baseSalary: job.jobBudget
        ? {
            '@type': 'MonetaryAmount',
            currency: job.jobCurrency,
            value: {
              '@type': 'QuantitativeValue',
              minValue: job.jobBudget.fromAmount,
              maxValue: job.jobBudget.upToAmount || job.jobBudget.fromAmount,
              unitText: job.jobBudget.pricingType === 'hourly' ? 'HOUR' : 'PROJECT',
            },
          }
        : undefined,
      skills: job.jobSkills?.join(', '),
      url: pageUrl,
    };

    this.seoService.addCustomJsonLd(jsonLd);
  }

  /**
   * Map employment type to schema.org format
   */
  private mapEmploymentType(type: string): string {
    switch (type) {
      case 'full-time':
        return 'FULL_TIME';
      case 'part-time':
        return 'PART_TIME';
      case 'freelance':
        return 'CONTRACTOR';
      default:
        return 'OTHER';
    }
  }
}
