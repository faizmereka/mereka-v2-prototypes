import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  inject,
  input,
  output,
  signal,
  ViewChild,
  ElementRef,
  NgZone,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icon';

declare const google: {
  maps: {
    Map: new (element: HTMLElement, options?: google.maps.MapOptions) => google.maps.Map;
    Marker: new (options?: google.maps.MarkerOptions) => google.maps.Marker;
    LatLng: new (lat: number, lng: number) => google.maps.LatLng;
    Geocoder: new () => google.maps.Geocoder;
    places: {
      Autocomplete: new (
        input: HTMLInputElement,
        options?: google.maps.places.AutocompleteOptions
      ) => google.maps.places.Autocomplete;
    };
    event: {
      addListener(instance: object, eventName: string, handler: (...args: any[]) => void): void;
    };
  };
};

declare namespace google.maps {
  interface MapOptions {
    center?: LatLngLiteral;
    zoom?: number;
    mapTypeControl?: boolean;
    fullscreenControl?: boolean;
    streetViewControl?: boolean;
  }

  interface Map {
    setCenter(latLng: LatLngLiteral): void;
    setZoom(zoom: number): void;
  }

  interface MarkerOptions {
    position?: LatLngLiteral;
    map?: Map;
    draggable?: boolean;
  }

  interface Marker {
    setPosition(latLng: LatLngLiteral): void;
    setMap(map: Map | null): void;
    getPosition(): LatLng | null;
  }

  interface LatLng {
    lat(): number;
    lng(): number;
  }

  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  interface Geocoder {
    geocode(
      request: { location?: LatLngLiteral; address?: string; },
      callback: (results: GeocoderResult[] | null, status: GeocoderStatus) => void
    ): void;
  }

  interface GeocoderResult {
    address_components?: AddressComponent[];
    formatted_address?: string;
    geometry?: {
      location: LatLng;
    };
  }

  interface AddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
  }

  type GeocoderStatus = 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';

  namespace places {
    interface AutocompleteOptions {
      types?: string[];
      componentRestrictions?: { country: string | string[]; };
    }

    interface Autocomplete {
      addListener(event: string, handler: () => void): void;
      getPlace(): PlaceResult;
    }

    interface PlaceResult {
      name?: string;
      formatted_address?: string;
      geometry?: {
        location: LatLng;
      };
      address_components?: AddressComponent[];
    }

    interface AddressComponent {
      long_name: string;
      short_name: string;
      types: string[];
    }
  }
}

export interface LocationPickerData {
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  formattedAddress: string;
  address?: string;
  state?: string;
  postcode?: string;
}

@Component({
  selector: 'ui-location-picker',
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './location-picker.component.html',
})
export class UiLocationPickerComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly ngZone = inject(NgZone);

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('mapContainer') mapContainerRef!: ElementRef<HTMLDivElement>;

  // Inputs
  readonly placeholder = input<string>('Search for a location...');
  readonly initialValue = input<string>('');
  readonly initialLat = input<number | null>(null);
  readonly initialLng = input<number | null>(null);
  readonly apiKey = input.required<string>();
  readonly disabled = input<boolean>(false);
  readonly showClearButton = input<boolean>(true);
  readonly mapHeight = input<string>('250px');

  // Outputs
  readonly locationSelected = output<LocationPickerData>();
  readonly locationCleared = output<void>();
  readonly markerDragged = output<{ lat: number; lng: number; }>();

  // State
  readonly inputValue = signal('');
  readonly isFocused = signal(false);
  readonly isLoading = signal(true);
  readonly hasLocation = signal(false);

  private autocomplete: google.maps.places.Autocomplete | null = null;
  private map: google.maps.Map | null = null;
  private marker: google.maps.Marker | null = null;
  private geocoder: google.maps.Geocoder | null = null;
  private initAttempts = 0;
  private readonly maxInitAttempts = 50;
  private lastInitialValue = '';
  private currentLocation: LocationPickerData | null = null;

  // Default center (Malaysia)
  private readonly defaultCenter = { lat: 4.1093195, lng: 109.45547499999998 };
  private readonly defaultZoom = 4;
  private readonly locationZoom = 15;

  constructor() {
    effect(() => {
      const value = this.initialValue();
      if (value && value !== this.lastInitialValue) {
        this.inputValue.set(value);
        this.lastInitialValue = value;
      }
    });

    effect(() => {
      const lat = this.initialLat();
      const lng = this.initialLng();
      if (lat && lng && this.map && this.marker) {
        this.updateMapPosition({ lat, lng });
        this.hasLocation.set(true);
      }
    });
  }

  ngOnInit(): void {
    this.loadGoogleMapsScript();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    // Cleanup
  }

  private loadGoogleMapsScript(): void {
    if (typeof google !== 'undefined' && google.maps?.places) {
      this.isLoading.set(false);
      return;
    }

    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        this.isLoading.set(false);
        this.initMap();
      });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey()}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.isLoading.set(false);
      this.initMap();
    };
    document.head.appendChild(script);
  }

  private initMap(): void {
    if (!this.mapContainerRef?.nativeElement || !this.searchInputRef?.nativeElement) {
      return;
    }

    if (typeof google === 'undefined' || !google.maps) {
      this.initAttempts++;
      if (this.initAttempts < this.maxInitAttempts) {
        setTimeout(() => this.initMap(), 100);
      }
      return;
    }

    this.isLoading.set(false);

    // Determine initial center
    const initialLat = this.initialLat();
    const initialLng = this.initialLng();
    const hasInitialCoords = initialLat !== null && initialLng !== null;

    const center = hasInitialCoords
      ? { lat: initialLat!, lng: initialLng! }
      : this.defaultCenter;

    const zoom = hasInitialCoords ? this.locationZoom : this.defaultZoom;

    // Initialize map
    this.map = new google.maps.Map(this.mapContainerRef.nativeElement, {
      center,
      zoom,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    });

    // Initialize marker
    this.marker = new google.maps.Marker({
      position: center,
      map: this.map,
      draggable: true,
    });

    // Initialize geocoder for reverse geocoding
    this.geocoder = new google.maps.Geocoder();

    // Listen for marker drag
    google.maps.event.addListener(this.marker, 'dragend', () => {
      this.ngZone.run(() => {
        const position = this.marker?.getPosition();
        if (position && this.geocoder) {
          const lat = position.lat();
          const lng = position.lng();
          this.markerDragged.emit({ lat, lng });

          // Reverse geocode to get address details
          this.geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            this.ngZone.run(() => {
              if (status === 'OK' && results && results[0]) {
                const place = results[0];
                const locationData = this.extractLocationDataFromGeocode(place, lat, lng);
                this.currentLocation = locationData;
                this.inputValue.set(`${locationData.city}, ${locationData.country}`);
                this.hasLocation.set(true);
                this.locationSelected.emit(locationData);
              } else {
                // Fallback: just update coordinates if geocoding fails
                if (this.currentLocation) {
                  this.currentLocation.lat = lat;
                  this.currentLocation.lng = lng;
                  this.locationSelected.emit(this.currentLocation);
                } else {
                  this.locationSelected.emit({
                    city: '',
                    country: '',
                    countryCode: '',
                    lat,
                    lng,
                    formattedAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                    address: '',
                    state: '',
                    postcode: '',
                  });
                }
              }
            });
          });
        }
      });
    });

    if (hasInitialCoords) {
      this.hasLocation.set(true);
    }

    // Set initial value
    if (this.initialValue()) {
      this.searchInputRef.nativeElement.value = this.initialValue();
    }

    // Initialize autocomplete
    this.autocomplete = new google.maps.places.Autocomplete(this.searchInputRef.nativeElement, {
      types: ['(cities)'],
    });

    this.autocomplete.addListener('place_changed', () => {
      this.ngZone.run(() => {
        const place = this.autocomplete?.getPlace();
        if (!place?.geometry?.location) {
          return;
        }

        const locationData = this.extractLocationData(place);
        this.currentLocation = locationData;
        this.inputValue.set(`${locationData.city}, ${locationData.country}`);
        this.hasLocation.set(true);

        // Update map and marker
        this.updateMapPosition({ lat: locationData.lat, lng: locationData.lng });

        this.locationSelected.emit(locationData);
      });
    });
  }

  private updateMapPosition(position: { lat: number; lng: number; }): void {
    if (this.map) {
      this.map.setCenter(position);
      this.map.setZoom(this.locationZoom);
    }
    if (this.marker) {
      this.marker.setPosition(position);
    }
  }

  private extractLocationData(place: google.maps.places.PlaceResult): LocationPickerData {
    const addressComponents = place.address_components || [];

    let city = place.name || '';
    let country = '';
    let countryCode = '';
    let state = '';
    let postcode = '';
    let streetNumber = '';
    let route = '';
    let premise = '';
    let subpremise = '';

    for (const component of addressComponents) {
      if (component.types.includes('locality')) {
        city = component.long_name;
      }
      if (component.types.includes('administrative_area_level_1')) {
        state = component.long_name;
      }
      if (component.types.includes('country')) {
        country = component.long_name;
        countryCode = component.short_name;
      }
      if (component.types.includes('postal_code')) {
        postcode = component.long_name;
      }
      if (component.types.includes('street_number')) {
        streetNumber = component.long_name;
      }
      if (component.types.includes('route')) {
        route = component.long_name;
      }
      if (component.types.includes('premise')) {
        premise = component.long_name;
      }
      if (component.types.includes('subpremise')) {
        subpremise = component.long_name;
      }
    }

    // Build full street address: [premise], [subpremise], [street number] [route]
    const addressParts: string[] = [];
    if (premise) addressParts.push(premise);
    if (subpremise) addressParts.push(subpremise);
    if (streetNumber && route) {
      addressParts.push(`${streetNumber} ${route}`);
    } else if (route) {
      addressParts.push(route);
    }
    const streetAddress = addressParts.join(', ');

    return {
      city,
      country,
      countryCode,
      lat: place.geometry?.location.lat() || 0,
      lng: place.geometry?.location.lng() || 0,
      formattedAddress: place.formatted_address || `${city}, ${country}`,
      address: streetAddress,
      state,
      postcode,
    };
  }

  private extractLocationDataFromGeocode(result: google.maps.GeocoderResult, lat: number, lng: number): LocationPickerData {
    const addressComponents = result.address_components || [];

    let city = '';
    let country = '';
    let countryCode = '';
    let state = '';
    let postcode = '';
    let streetNumber = '';
    let route = '';
    let premise = '';
    let subpremise = '';

    for (const component of addressComponents) {
      if (component.types.includes('locality') || component.types.includes('sublocality')) {
        city = component.long_name;
      }
      if (component.types.includes('administrative_area_level_1')) {
        state = component.long_name;
      }
      if (component.types.includes('country')) {
        country = component.long_name;
        countryCode = component.short_name;
      }
      if (component.types.includes('postal_code')) {
        postcode = component.long_name;
      }
      if (component.types.includes('street_number')) {
        streetNumber = component.long_name;
      }
      if (component.types.includes('route')) {
        route = component.long_name;
      }
      if (component.types.includes('premise')) {
        premise = component.long_name;
      }
      if (component.types.includes('subpremise')) {
        subpremise = component.long_name;
      }
    }

    // If city not found, try other types
    if (!city) {
      for (const component of addressComponents) {
        if (component.types.includes('administrative_area_level_2')) {
          city = component.long_name;
          break;
        }
      }
    }

    // Build full street address: [premise], [subpremise], [street number] [route]
    const addressParts: string[] = [];
    if (premise) addressParts.push(premise);
    if (subpremise) addressParts.push(subpremise);
    if (streetNumber && route) {
      addressParts.push(`${streetNumber} ${route}`);
    } else if (route) {
      addressParts.push(route);
    }
    const streetAddress = addressParts.join(', ');

    return {
      city: city || 'Unknown',
      country: country || '',
      countryCode: countryCode || '',
      lat,
      lng,
      formattedAddress: result.formatted_address || `${city}, ${country}`,
      address: streetAddress,
      state,
      postcode,
    };
  }

  onFocus(): void {
    this.isFocused.set(true);
  }

  onBlur(): void {
    this.isFocused.set(false);
  }

  clearInput(): void {
    this.inputValue.set('');
    this.hasLocation.set(false);
    this.currentLocation = null;
    if (this.searchInputRef?.nativeElement) {
      this.searchInputRef.nativeElement.value = '';
    }
    // Reset map to default view
    if (this.map) {
      this.map.setCenter(this.defaultCenter);
      this.map.setZoom(this.defaultZoom);
    }
    if (this.marker) {
      this.marker.setPosition(this.defaultCenter);
    }
    this.locationCleared.emit();
  }
}
