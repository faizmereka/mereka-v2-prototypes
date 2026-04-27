import { Component, input, inject, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExperienceService } from '../../services/experience.service';

export interface ExperienceHeaderData {
  title: string;
  type: 'Physical' | 'Virtual' | 'Hybrid';
  category: string;
  location?: {
    city: string;
    country: string;
  };
  rating?: number;
  totalReviews?: number;
  gallery: string[];
  audienceType?: string;
}

@Component({
  selector: 'app-experience-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experience-header.component.html',
})
export class ExperienceHeaderComponent {
  readonly slug = input.required<string>();
  readonly isFavorited = input<boolean>(false);
  readonly saveClicked = output<void>();
  readonly shareClicked = output<void>();
  private readonly experienceService = inject(ExperienceService);

  // Computed header data from service
  readonly header = computed<ExperienceHeaderData>(() => {
    const exp = this.experienceService.experience();
    if (!exp) {
      return {
        title: '',
        type: 'Physical',
        category: '',
        gallery: [],
        audienceType: 'Everyone',
      };
    }
    return {
      title: exp.experienceTitle,
      type: exp.experienceType,
      category: exp.experienceCategory?.name || '',
      location: exp.location
        ? { city: exp.location.city, country: exp.location.country }
        : undefined,
      rating: exp.rating,
      totalReviews: exp.totalReviews,
      gallery: exp.coverPhoto
        ? [exp.coverPhoto, ...(exp.gallery || [])]
        : exp.gallery || [],
      audienceType: exp.audienceType,
    };
  });

  readonly isHidden = computed(() => this.header().audienceType === 'Hidden');

  readonly locationText = computed(() => {
    const loc = this.header().location;
    if (!loc) return '';
    return [loc.city, loc.country].filter(Boolean).join(', ');
  });

  readonly hasReviews = computed(
    () => (this.header().totalReviews ?? 0) > 0
  );

  onSave(): void {
    this.saveClicked.emit();
  }

  onShare(): void {
    this.shareClicked.emit();
  }
}
