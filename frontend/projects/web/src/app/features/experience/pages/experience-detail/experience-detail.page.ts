import { Component, inject, OnDestroy, effect, computed, signal, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

import { UiFooterComponent } from '@mereka/ui';
import { SeoService } from '@mereka/core';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { ExperienceHeaderComponent } from '../../components/experience-header/experience-header.component';
import { ExperienceThemesTopicsComponent } from '../../components/experience-themes-topics/experience-themes-topics.component';
import { ExperienceAboutComponent } from '../../components/experience-about/experience-about.component';
import { ExperienceInstructionsComponent } from '../../components/experience-instructions/experience-instructions.component';
import { ExperienceBookingWidgetComponent } from '../../components/experience-booking-widget/experience-booking-widget.component';
import { ExperienceAboutHostComponent } from '../../components/experience-about-host/experience-about-host.component';
import { ExperienceLocationComponent } from '../../components/experience-location/experience-location.component';
import { ExperienceReviewsComponent } from '../../components/experience-reviews/experience-reviews.component';
import { ExperienceFeaturedComponent } from '../../components/experience-featured/experience-featured.component';
import { ExperienceService } from '../../services/experience.service';
import { FavoriteService } from '../../../../core/services/favorite.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-experience-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    UiFooterComponent,
    ExperienceHeaderComponent,
    ExperienceThemesTopicsComponent,
    ExperienceAboutComponent,
    ExperienceInstructionsComponent,
    ExperienceBookingWidgetComponent,
    ExperienceAboutHostComponent,
    ExperienceLocationComponent,
    ExperienceReviewsComponent,
    ExperienceFeaturedComponent,
  ],
  templateUrl: './experience-detail.page.html',
})
export class ExperienceDetailPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly seoService = inject(SeoService);
  readonly experienceService = inject(ExperienceService);
  readonly favoriteService = inject(FavoriteService);

  // Track hydration state to prevent duplicate fetches
  private readonly _hydrated = signal(false);
  // Track which slug we've already fetched to prevent loops
  private _fetchedSlug: string | null = null;

  // Get slug from route params (needed for child components)
  readonly slug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('slug') ?? ''))
  );

  // Expose service signals for template (populated by route resolver or client fetch)
  readonly experience = this.experienceService.experience;
  readonly loading = this.experienceService.loading;
  readonly error = this.experienceService.error;

  // Computed: show skeleton when loading OR when we have slug but no data yet
  readonly showSkeleton = computed(() => {
    const currentSlug = this.slug();
    const exp = this.experience();
    const isLoading = this.loading();

    // Show skeleton if:
    // 1. Currently loading
    // 2. Have slug but no experience data yet (client navigation, fetch not started)
    // 3. Slug changed but experience data is for different slug
    if (isLoading) return true;
    if (currentSlug && !exp) return true;
    if (currentSlug && exp && exp.slug !== currentSlug) return true;

    return false;
  });

  // Computed: check if experience is favorited
  readonly isFavorited = computed(() => {
    const exp = this.experience();
    if (!exp?._id) return false;
    // Check API response first (isFavorited from backend)
    if (exp.isFavorited !== undefined) return exp.isFavorited;
    // Check local state from favoriteService
    return this.favoriteService.isFavorited('experience', exp._id);
  });

  constructor() {
    // Wait for hydration to complete before allowing client-side fetches
    // This prevents duplicate API calls (resolver + effect) during SSR hydration
    afterNextRender(() => {
      this._hydrated.set(true);
    });

    // Effect to fetch data on client navigation when resolver returns null
    // Only runs AFTER hydration to prevent duplicate calls
    effect(() => {
      const currentSlug = this.slug();
      const exp = this.experience();
      const isLoading = this.loading();
      const hydrated = this._hydrated();

      // Skip if not hydrated yet (let resolver handle SSR data)
      if (!hydrated) return;

      // Skip if already loading
      if (isLoading) return;

      // Skip if we already fetched this slug (prevents infinite loops)
      if (this._fetchedSlug === currentSlug) return;

      // Check if we need to fetch
      const needsFetch = currentSlug && (!exp || exp.slug !== currentSlug);

      if (needsFetch) {
        // Mark as fetched BEFORE calling to prevent loops
        this._fetchedSlug = currentSlug;
        // Trigger fetch - this will update the service signals
        this.experienceService.getExperienceBySlug(currentSlug).subscribe();
      }
    });

    // Effect to update meta tags when experience data changes
    effect(() => {
      const exp = this.experienceService.experience();
      if (exp) {
        this.updateSeoTags(exp);
      }
    });

    // Effect to fetch reviews when experience is loaded
    effect(() => {
      const exp = this.experienceService.experience();
      const hydrated = this._hydrated();

      // Only fetch reviews after hydration and when we have experience data
      if (hydrated && exp?._id) {
        this.experienceService.getExperienceReviews(exp._id, { limit: 20 });
      }
    });
  }

  ngOnDestroy(): void {
    this.seoService.removeJsonLd();
  }

  private updateSeoTags(exp: NonNullable<ReturnType<typeof this.experience>>): void {
    const pageUrl = `${environment.appUrls.web}/experience/${exp.slug}`;
    const imageUrl = exp.coverPhoto || exp.gallery?.[0] || '';

    // Build keywords
    const keywords = this.seoService.generateKeywords(
      exp.experienceTitle,
      exp.experienceType,
      exp.hub?.name,
      'experience',
      'learning',
      'workshop',
      ...(exp.experienceTopics?.flatMap((t) => [t.theme?.name, t.topic?.name]) || []),
      exp.location?.city,
      exp.location?.country,
      exp.experienceCategory?.name
    );

    // Update meta tags
    this.seoService.updateMetaTags({
      title: exp.experienceTitle,
      description: this.seoService.truncateText(exp.experienceDescription || '', 160),
      keywords,
      image: imageUrl,
      imageAlt: exp.experienceTitle,
      url: pageUrl,
      type: 'event',
      author: exp.hub?.name,
      noIndex: exp.audienceType === 'Hidden',
    });

    // Get upcoming event for dates
    const upcomingEvents = this.experienceService.upcomingEvents();
    const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

    // Add Event JSON-LD
    this.seoService.addEventJsonLd(
      {
        title: exp.experienceTitle,
        description: exp.experienceDescription || '',
        url: pageUrl,
        image: imageUrl,
      },
      {
        startDate: nextEvent?.startTime,
        endDate: nextEvent?.endTime,
        price: this.experienceService.lowestPrice() ?? undefined,
        currency: exp.currency || 'MYR',
        attendanceMode:
          exp.experienceType === 'Virtual'
            ? 'online'
            : exp.experienceType === 'Hybrid'
              ? 'mixed'
              : 'offline',
        organizerName: exp.hub?.name || 'Mereka',
        organizerUrl: exp.hub?.slug ? `${environment.appUrls.web}/hub/${exp.hub.slug}` : environment.appUrls.web,
        rating: exp.rating,
        reviewCount: exp.totalReviews,
        location: exp.location
          ? {
              city: exp.location.city,
              state: exp.location.state,
              country: exp.location.country,
              lat: exp.location.lat,
              lng: exp.location.lng,
            }
          : undefined,
      }
    );
  }

  onShare(): void {
    const exp = this.experience();
    if (!exp) return;

    if (navigator.share) {
      navigator.share({
        title: exp.experienceTitle,
        text: `Check out ${exp.experienceTitle}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }

  async onSave(): Promise<void> {
    const exp = this.experience();
    if (!exp?._id) return;
    await this.favoriteService.toggleFavorite('experience', exp._id);
  }
}
