import { Component, inject, computed, effect, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

import { UiFooterComponent } from '@mereka/ui';
import { SeoService } from '@mereka/core';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { ExpertiseHeaderComponent } from '../../components/expertise-header/expertise-header.component';
import { ExpertiseAboutComponent } from '../../components/expertise-about/expertise-about.component';
import { ExpertiseAboutExpertComponent } from '../../components/expertise-about-expert/expertise-about-expert.component';
import { ExpertiseInstructionsComponent } from '../../components/expertise-instructions/expertise-instructions.component';
import { ExpertiseLocationComponent } from '../../components/expertise-location/expertise-location.component';
import { ExpertiseFeaturedComponent } from '../../components/expertise-featured/expertise-featured.component';
import { ExpertiseBookingWidgetComponent } from '../../components/expertise-booking-widget/expertise-booking-widget.component';
import { ExpertiseReviewsComponent } from '../../components/expertise-reviews/expertise-reviews.component';
import { ExpertiseService } from '../../services/expertise.service';
import { FavoriteService } from '../../../../core/services/favorite.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-expertise-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    UiFooterComponent,
    ExpertiseHeaderComponent,
    ExpertiseAboutComponent,
    ExpertiseAboutExpertComponent,
    ExpertiseInstructionsComponent,
    ExpertiseLocationComponent,
    ExpertiseFeaturedComponent,
    ExpertiseBookingWidgetComponent,
    ExpertiseReviewsComponent,
  ],
  templateUrl: './expertise-detail.page.html',
})
export class ExpertiseDetailPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly seoService = inject(SeoService);
  readonly expertiseService = inject(ExpertiseService);
  readonly favoriteService = inject(FavoriteService);

  readonly slug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('slug') ?? ''))
  );

  readonly expertise = this.expertiseService.expertise;
  readonly loading = this.expertiseService.loading;

  readonly isFavorited = computed(() => {
    const exp = this.expertise();
    if (!exp?._id) return false;
    // Check API response first (isFavorited from backend)
    if (exp.isFavorited !== undefined) return exp.isFavorited;
    // Check local state from favoriteService
    return this.favoriteService.isFavorited('expertise', exp._id);
  });

  readonly showSkeleton = computed(() => {
    const currentSlug = this.slug();
    const exp = this.expertise();
    const isLoading = this.loading();

    if (isLoading) return true;
    if (currentSlug && !exp) return true;
    if (currentSlug && exp && exp.slug !== currentSlug) return true;
    return false;
  });

  constructor() {
    // Effect to fetch data when slug changes (client-side navigation)
    effect(() => {
      const currentSlug = this.slug();
      const exp = this.expertise();

      if (!currentSlug) return;

      // Only fetch on browser if we don't have data for this slug
      if (isPlatformBrowser(this.platformId)) {
        if (!exp || exp.slug !== currentSlug) {
          this.expertiseService.getExpertiseBySlug(currentSlug).subscribe();
        }
      }
    });

    // Effect to load featured expertises after main data loads
    effect(() => {
      const exp = this.expertise();
      if (exp?.slug && isPlatformBrowser(this.platformId)) {
        this.expertiseService.getFeaturedExpertises(exp.slug);
      }
    });

    // Effect to update meta tags when expertise data changes
    effect(() => {
      const exp = this.expertise();
      if (exp) {
        this.updateSeoTags(exp);
      }
    });

    // Effect to fetch reviews when expertise is loaded
    effect(() => {
      const exp = this.expertise();
      if (exp?._id && isPlatformBrowser(this.platformId)) {
        this.expertiseService.getExpertiseReviews(exp._id, { limit: 20 });
      }
    });
  }

  ngOnDestroy(): void {
    this.seoService.removeJsonLd();
  }

  private updateSeoTags(exp: NonNullable<ReturnType<typeof this.expertise>>): void {
    const pageUrl = `${environment.appUrls.web}/expertise/${exp.slug}`;
    const imageUrl = exp.coverPhoto || exp.host?.profileUrl || '';

    // Get expertise mode from first ticket
    const firstTicket = exp.ticket?.[0];
    const expertiseMode = firstTicket?.expertiseMode || 'physical';

    // Build keywords
    const keywords = this.seoService.generateKeywords(
      exp.expertiseTitle,
      expertiseMode,
      exp.hub?.name,
      'expertise',
      'consultation',
      'coaching',
      'mentoring',
      exp.host?.name,
      ...(exp.tags || [])
    );

    // Update meta tags
    this.seoService.updateMetaTags({
      title: exp.expertiseTitle,
      description: this.seoService.truncateText(exp.expertiseDescription || '', 160),
      keywords,
      image: imageUrl,
      imageAlt: exp.expertiseTitle,
      url: pageUrl,
      type: 'website',
      author: exp.host?.name || exp.hub?.name,
      noIndex: exp.status === 'hidden',
    });

    // Get lowest price for structured data
    const tickets = exp.ticket || [];
    const lowestPrice = tickets.reduce((min, t) => {
      if (t.ticketType === 'Free') return min;
      return t.standardRate < min ? t.standardRate : min;
    }, Infinity);

    // Add Service JSON-LD
    this.seoService.addServiceJsonLd(
      {
        title: exp.expertiseTitle,
        description: exp.expertiseDescription || '',
        url: pageUrl,
        image: imageUrl,
      },
      {
        price: lowestPrice === Infinity ? undefined : lowestPrice,
        currency: exp.currency || 'MYR',
        providerName: exp.host?.name || exp.hub?.name || 'Mereka',
        providerUrl: exp.hub?.slug ? `${environment.appUrls.web}/hub/${exp.hub.slug}` : environment.appUrls.web,
        rating: exp.rating,
        reviewCount: exp.totalReviews,
        serviceType: expertiseMode === 'online' ? 'OnlineConsultation' : 'Consultation',
      }
    );
  }

  onShare(): void {
    const exp = this.expertise();
    if (!exp) return;

    if (navigator.share) {
      navigator.share({
        title: exp.expertiseTitle,
        text: `Check out ${exp.expertiseTitle}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }

  async onSave(): Promise<void> {
    const exp = this.expertise();
    if (!exp?._id) return;
    await this.favoriteService.toggleFavorite('expertise', exp._id);
  }
}
