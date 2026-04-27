import { Component, input, inject, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExpertiseService } from '../../services/expertise.service';

export interface ExpertiseHeaderData {
  title: string;
  hostName: string;
  mode: 'online' | 'physical' | 'hybrid';
  location?: { city?: string; country?: string };
  rating?: number;
  totalReviews?: number;
  gallery: string[];
}

@Component({
  selector: 'app-expertise-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './expertise-header.component.html',
})
export class ExpertiseHeaderComponent {
  readonly slug = input.required<string>();
  readonly isFavorited = input<boolean>(false);
  readonly shareClicked = output<void>();
  readonly saveClicked = output<void>();

  private readonly expertiseService = inject(ExpertiseService);

  readonly header = computed<ExpertiseHeaderData>(() => {
    const exp = this.expertiseService.expertise();
    if (!exp) {
      return { title: '', hostName: '', mode: 'physical', gallery: [] };
    }
    return {
      title: exp.expertiseTitle,
      hostName: exp.host?.name || '',
      mode: this.expertiseService.expertiseMode(),
      location: exp.location
        ? { city: exp.location.city, country: exp.location.country }
        : undefined,
      rating: exp.rating,
      totalReviews: exp.totalReviews,
      gallery: this.expertiseService.galleryImages(),
    };
  });

  readonly fullTitle = computed(() => {
    const h = this.header();
    if (!h.title) return '';
    return h.hostName ? `${h.title} with ${h.hostName}` : h.title;
  });

  readonly modeLabel = computed(() => {
    const mode = this.header().mode;
    if (mode === 'hybrid') return 'Hybrid';
    if (mode === 'online') return 'Online';
    return this.header().location?.city || 'Physical';
  });

  readonly locationText = computed(() => {
    const loc = this.header().location;
    if (!loc) return '';
    return [loc.city, loc.country].filter(Boolean).join(', ');
  });

  readonly hasReviews = computed(() => (this.header().totalReviews ?? 0) > 0);

  onSave(): void {
    this.saveClicked.emit();
  }

  onShare(): void {
    this.shareClicked.emit();
  }
}
