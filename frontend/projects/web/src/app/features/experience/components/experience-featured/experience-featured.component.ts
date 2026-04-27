import { Component, input, inject, computed, effect, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ExperienceService } from '../../services/experience.service';

export interface FeaturedExperienceCard {
  id: string;
  slug: string;
  title: string;
  coverPhoto: string;
  price: number;
  currency: string;
  location: string;
  rating?: number;
  hostName: string;
  slotDates: string;
}

@Component({
  selector: 'app-experience-featured',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './experience-featured.component.html',
})
export class ExperienceFeaturedComponent {
  readonly slug = input.required<string>();
  private readonly experienceService = inject(ExperienceService);
  private readonly platformId = inject(PLATFORM_ID);

  // Loading state
  readonly loading = this.experienceService.featuredLoading;

  // Computed featured experiences from lazy loaded signal
  readonly featuredExperiences = computed<FeaturedExperienceCard[]>(() => {
    const featured = this.experienceService.featuredExperiences();
    const exp = this.experienceService.experience();
    if (!featured || featured.length === 0) return [];

    return featured.map((item) => {
      // Get lowest price from tickets
      const tickets = item.ticket || [];
      const prices = tickets.map((t) => t.ticketPrice);
      const price = prices.length > 0 ? Math.min(...prices) : 0;

      return {
        id: item._id,
        slug: item.slug,
        title: item.experienceTitle,
        coverPhoto: item.coverPhoto || '',
        price,
        currency: exp?.currency || 'MYR',
        location: '', // Featured doesn't include location
        hostName: exp?.hub?.name || '',
        slotDates: '', // TODO: Add slot dates if needed
      };
    });
  });

  readonly hasExperiences = computed(
    () => this.featuredExperiences().length > 0
  );

  constructor() {
    // Lazy load featured experiences after main experience loads (browser only)
    effect(() => {
      const currentSlug = this.slug();
      const exp = this.experienceService.experience();

      // Only load in browser (not during SSR) and when experience is loaded
      if (isPlatformBrowser(this.platformId) && exp && currentSlug) {
        this.experienceService.getFeaturedExperiences(currentSlug);
      }
    });
  }

  formatPrice(exp: FeaturedExperienceCard): string {
    if (exp.price === 0) return 'FREE';
    const symbol = exp.currency === 'MYR' ? 'RM' : '$';
    return `${symbol}${exp.price.toFixed(2)}`;
  }
}
