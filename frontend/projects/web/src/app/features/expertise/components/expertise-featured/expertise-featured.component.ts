import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ExpertiseService } from '../../services/expertise.service';
import type { FeaturedExpertise } from '../../models';

export interface FeaturedCardData {
  id: string;
  slug?: string;
  title: string;
  hostName: string;
  coverPhoto: string;
  price: number;
  rating?: number;
  location?: string;
}

@Component({
  selector: 'app-expertise-featured',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './expertise-featured.component.html',
})
export class ExpertiseFeaturedComponent {
  readonly slug = input.required<string>();
  private readonly expertiseService = inject(ExpertiseService);

  readonly featuredList = computed<FeaturedCardData[]>(() => {
    const list = this.expertiseService.featuredList();
    return list.map((exp) => this.mapToCard(exp));
  });

  readonly hasFeatured = computed(() => this.featuredList().length > 0);

  private mapToCard(exp: FeaturedExpertise): FeaturedCardData {
    const lowestPrice = exp.ticket?.length
      ? Math.min(...exp.ticket.map((t) => t.standardRate))
      : 0;

    return {
      id: exp._id,
      slug: exp.slug,
      title: exp.expertiseTitle,
      hostName: exp.host?.name || '',
      coverPhoto: exp.coverPhoto || '',
      price: lowestPrice,
      rating: exp.rating,
      location: exp.location?.city,
    };
  }

  onViewAll(): void {
    // TODO: Navigate to expertise listing
    console.log('View all clicked');
  }
}
