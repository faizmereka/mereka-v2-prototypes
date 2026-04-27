import { Component, input, output, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiLocationAutocompleteComponent, type LocationData } from '../location-autocomplete';
import { UiLocationPickerComponent, type LocationPickerData } from '../location-picker';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export type LocationType = 'hub' | 'new' | 'other';

export interface LocationFormData {
  locationType?: LocationType;
  venueName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

@Component({
  selector: 'ui-location-form',
  imports: [CommonModule, FormsModule, UiLocationAutocompleteComponent, UiLocationPickerComponent],
  templateUrl: './location-form.component.html',
})
export class UiLocationFormComponent implements OnInit {
  private readonly sanitizer = inject(DomSanitizer);

  // Inputs
  readonly googleMapsApiKey = input.required<string>();
  readonly hubName = input<string>('');
  readonly hubLocation = input<LocationFormData | null>(null); // Hub's actual location data
  readonly initialLocation = input<LocationFormData | null>(null);
  readonly showVenueNameForOther = input<boolean>(true);
  readonly disabled = input<boolean>(false);

  // Tab labels (customizable)
  readonly hubTabLabel = input<string>('Hub Address');
  readonly newTabLabel = input<string>('New Address');
  readonly otherTabLabel = input<string>('Other Hub Venue');

  // Outputs
  readonly locationChange = output<LocationFormData>();

  // Internal state
  readonly locationType = signal<LocationType>('hub');
  readonly venueName = signal<string>('');
  readonly address = signal<string>('');
  readonly city = signal<string>('');
  readonly state = signal<string>('');
  readonly country = signal<string>('');
  readonly lat = signal<number | null>(null);
  readonly lng = signal<number | null>(null);

  // Computed
  readonly isHubType = computed(() => this.locationType() === 'hub');
  readonly isNewType = computed(() => this.locationType() === 'new');
  readonly isOtherType = computed(() => this.locationType() === 'other');
  readonly isLocationAutofill = computed(() => this.locationType() === 'hub');
  readonly showMap = computed(() => this.locationType() === 'new' || this.locationType() === 'other');

  ngOnInit(): void {
    const initial = this.initialLocation();
    const hubLoc = this.hubLocation();

    if (initial) {
      this.locationType.set(initial.locationType || 'hub');
      this.venueName.set(initial.venueName || '');
      this.address.set(initial.address || '');
      this.city.set(initial.city || '');
      this.state.set(initial.state || '');
      this.country.set(initial.country || '');
      this.lat.set(initial.lat ?? null);
      this.lng.set(initial.lng ?? null);
    }

    // If location type is 'hub', always use hub location data (overwrite any initial values)
    const currentType = this.locationType();
    if (currentType === 'hub' && hubLoc) {
      this.address.set(hubLoc.address || '');
      this.city.set(hubLoc.city || '');
      this.state.set(hubLoc.state || '');
      this.country.set(hubLoc.country || '');
      this.lat.set(hubLoc.lat ?? null);
      this.lng.set(hubLoc.lng ?? null);
    }
  }

  onLocationTypeChange(type: LocationType): void {
    if (this.disabled()) return;
    this.locationType.set(type);

    // When switching to hub, populate with hub location data
    if (type === 'hub') {
      const hubLoc = this.hubLocation();
      if (hubLoc) {
        this.address.set(hubLoc.address || '');
        this.city.set(hubLoc.city || '');
        this.state.set(hubLoc.state || '');
        this.country.set(hubLoc.country || '');
        this.lat.set(hubLoc.lat ?? null);
        this.lng.set(hubLoc.lng ?? null);
      }
    }

    this.emitChange();
  }

  updateField(field: 'venueName' | 'address' | 'city' | 'state' | 'country', value: string): void {
    if (this.disabled()) return;
    switch (field) {
      case 'venueName':
        this.venueName.set(value);
        break;
      case 'address':
        this.address.set(value);
        break;
      case 'city':
        this.city.set(value);
        break;
      case 'state':
        this.state.set(value);
        break;
      case 'country':
        this.country.set(value);
        break;
    }
    this.emitChange();
  }

  onLocationAutocompleteSelected(location: LocationData): void {
    if (this.disabled()) return;
    this.address.set(location.address || location.formattedAddress || '');
    this.city.set(location.city || '');
    this.state.set(location.state || '');
    this.country.set(location.country || '');
    this.lat.set(location.lat);
    this.lng.set(location.lng);
    this.emitChange();
  }

  onLocationAutocompleteCleared(): void {
    if (this.disabled()) return;
    this.address.set('');
    this.city.set('');
    this.state.set('');
    this.country.set('');
    this.lat.set(null);
    this.lng.set(null);
    this.emitChange();
  }

  onLocationPickerSelected(location: LocationPickerData): void {
    if (this.disabled()) return;
    this.address.set(location.address || location.formattedAddress || '');
    this.city.set(location.city || '');
    this.state.set(location.state || '');
    this.country.set(location.country || '');
    this.lat.set(location.lat);
    this.lng.set(location.lng);
    this.emitChange();
  }

  onMarkerDragged(coords: { lat: number; lng: number }): void {
    if (this.disabled()) return;
    this.lat.set(coords.lat);
    this.lng.set(coords.lng);
    this.emitChange();
  }

  getMapUrl(): SafeResourceUrl {
    const latitude = this.lat();
    const longitude = this.lng();
    if (!latitude || !longitude) {
      return this.sanitizer.bypassSecurityTrustResourceUrl('');
    }
    const url = `https://www.google.com/maps/embed/v1/place?key=${this.googleMapsApiKey()}&q=${latitude},${longitude}&zoom=15`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  private emitChange(): void {
    const data: LocationFormData = {
      locationType: this.locationType(),
      venueName: this.venueName(),
      address: this.address(),
      city: this.city(),
      state: this.state(),
      country: this.country(),
      lat: this.lat() ?? undefined,
      lng: this.lng() ?? undefined,
    };
    this.locationChange.emit(data);
  }
}
