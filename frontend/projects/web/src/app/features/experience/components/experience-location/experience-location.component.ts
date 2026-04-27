import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiMapDisplayComponent } from '@mereka/ui';
import { ExperienceService } from '../../services/experience.service';
import { environment } from '../../../../../environments/environment';

export interface LocationData {
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  lat?: number;
  lng?: number;
}

@Component({
  selector: 'app-experience-location',
  standalone: true,
  imports: [CommonModule, UiMapDisplayComponent],
  templateUrl: './experience-location.component.html',
})
export class ExperienceLocationComponent {
  readonly slug = input.required<string>();
  private readonly experienceService = inject(ExperienceService);
  readonly mapsApiKey = (environment as { google?: { maps?: { apiKey?: string } } }).google?.maps?.apiKey || '';

  // Computed location from service
  readonly location = computed<LocationData>(() => {
    const exp = this.experienceService.experience();
    if (!exp?.location) {
      return {
        streetAddress: '',
        city: '',
        state: '',
        country: '',
      };
    }

    return {
      streetAddress: exp.location.address || '',
      city: exp.location.city || '',
      state: exp.location.state || '',
      country: exp.location.country || '',
      lat: exp.location.lat,
      lng: exp.location.lng,
    };
  });

  // Only show for Physical or Hybrid experiences
  readonly showLocation = computed(() => {
    const exp = this.experienceService.experience();
    return exp?.experienceType === 'Physical' || exp?.experienceType === 'Hybrid';
  });

  readonly hasLocation = computed(() => {
    const loc = this.location();
    return (
      this.showLocation() &&
      (loc.city !== '' || loc.state !== '' || loc.country !== '')
    );
  });

  readonly addressLine = computed(() => {
    const loc = this.location();
    return [loc.city, loc.state, loc.country].filter(Boolean).join(', ');
  });

  readonly hasCoordinates = computed(() => {
    const loc = this.location();
    return loc.lat && loc.lng;
  });

  readonly mapUrl = computed(() => {
    const loc = this.location();
    if (!loc.lat || !loc.lng) return '';
    return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
  });

  readonly staticMapUrl = computed(() => {
    const loc = this.location();
    if (!loc.lat || !loc.lng) return '';
    // Using a placeholder for static map - in production, use Google Maps Static API or embed
    return `https://maps.googleapis.com/maps/api/staticmap?center=${loc.lat},${loc.lng}&zoom=15&size=800x400&markers=color:red%7C${loc.lat},${loc.lng}&key=YOUR_API_KEY`;
  });

  openGoogleMaps(): void {
    const loc = this.location();
    if (loc.lat && loc.lng) {
      window.open(this.mapUrl(), '_blank');
    }
  }
}
