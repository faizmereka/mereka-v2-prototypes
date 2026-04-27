import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { BookingLocation } from '../booking-detail.service';

@Component({
  selector: 'app-booking-location',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl border border-neutral-200 p-6" data-testid="booking-location">
      <h3 class="text-lg font-semibold text-neutral-900 mb-4">Location</h3>

      <!-- Address -->
      <div class="mb-4" data-testid="booking-location-address">
        @if (location.streetAddress) {
          <p class="text-neutral-700">{{ location.streetAddress }}</p>
        }
        <p class="text-neutral-700">{{ formattedCityState() }}</p>
        @if (showCountry()) {
          <p class="text-neutral-700">{{ location.country }}</p>
        }
      </div>

      <!-- Map -->
      @if (location.lat && location.lng) {
        <div
          class="w-full h-64 rounded-lg overflow-hidden bg-neutral-100"
          data-testid="booking-location-map"
        >
          <!-- OpenStreetMap static image (no API key required) -->
          <img
            [src]="getMapUrl()"
            alt="Location map"
            class="w-full h-full object-cover"
            loading="lazy"
            (error)="onMapError($event)"
          />
        </div>

        <!-- Directions Link -->
        <a
          [href]="getDirectionsUrl()"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 mt-4 text-primary hover:underline"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Get Directions
        </a>
      }
    </div>
  `,
})
export class BookingLocationComponent {
  @Input({ required: true }) location!: BookingLocation;

  // Format city and state, avoiding duplicates
  formattedCityState(): string {
    const parts: string[] = [];

    if (this.location.city) {
      parts.push(this.location.city);
    }

    // Only add state if it's different from city
    if (this.location.state && this.location.state !== this.location.city) {
      parts.push(this.location.state);
    }

    // Add postal code if available
    if (this.location.postalCode) {
      parts.push(this.location.postalCode);
    }

    return parts.join(', ') || 'Location not specified';
  }

  // Only show country if it's different from city/state
  showCountry(): boolean {
    return !!(
      this.location.country &&
      this.location.country !== this.location.city &&
      this.location.country !== this.location.state
    );
  }

  getMapUrl(): string {
    const { lat, lng } = this.location;
    // Using OpenStreetMap static tiles (no API key required)
    // Alternative: use a placeholder or embed map
    const zoom = 15;
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=600x300&markers=${lat},${lng},red-pushpin`;
  }

  getDirectionsUrl(): string {
    const { lat, lng } = this.location;
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  onMapError(event: Event): void {
    // Fallback to a simple placeholder if map fails to load
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    // Parent div will show as gray background
  }
}
