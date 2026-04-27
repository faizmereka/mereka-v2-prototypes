import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ExpertiseService } from '../../services/expertise.service';

export interface LocationData {
  venueName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

@Component({
  selector: 'app-expertise-location',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './expertise-location.component.html',
})
export class ExpertiseLocationComponent {
  readonly slug = input.required<string>();
  private readonly expertiseService = inject(ExpertiseService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly location = computed<LocationData | null>(() => {
    const exp = this.expertiseService.expertise();
    return exp?.location || null;
  });

  readonly mode = computed(() => this.expertiseService.expertiseMode());

  readonly isHybrid = computed(() => this.mode() === 'hybrid');
  readonly hasPhysical = computed(
    () => this.mode() === 'physical' || this.mode() === 'hybrid'
  );

  readonly hasLocation = computed(() => !!this.location());

  readonly fullAddress = computed(() => {
    const loc = this.location();
    if (!loc) return '';
    return [loc.venueName, loc.address, loc.city, loc.state, loc.country]
      .filter(Boolean)
      .join(', ');
  });

  readonly mapUrl = computed<SafeResourceUrl | null>(() => {
    const loc = this.location();
    if (!loc?.lat || !loc?.lng) return null;
    const url = `https://maps.google.com/maps?q=${loc.lat},${loc.lng}&z=15&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  readonly hasMap = computed(() => !!this.mapUrl());
}
