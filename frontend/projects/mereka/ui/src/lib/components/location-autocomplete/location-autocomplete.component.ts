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

declare const google: {
  maps: {
    places: {
      Autocomplete: new (
        input: HTMLInputElement,
        options?: google.maps.places.AutocompleteOptions
      ) => google.maps.places.Autocomplete;
      RankBy: { DISTANCE: number; };
    };
  };
};

declare namespace google.maps.places {
  interface AutocompleteOptions {
    types?: string[];
    componentRestrictions?: { country: string | string[]; };
  }

  interface Autocomplete {
    addListener(event: string, handler: () => void): void;
    getPlace(): PlaceResult;
    setComponentRestrictions(restrictions?: { country: string | string[]; }): void;
  }

  interface PlaceResult {
    name?: string;
    formatted_address?: string;
    geometry?: {
      location: {
        lat(): number;
        lng(): number;
      };
    };
    address_components?: AddressComponent[];
  }

  interface AddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
  }
}

export interface LocationData {
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
  selector: 'ui-location-autocomplete',
  imports: [CommonModule, FormsModule],
  templateUrl: './location-autocomplete.component.html',
})
export class UiLocationAutocompleteComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly ngZone = inject(NgZone);

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  // Inputs
  readonly placeholder = input<string>('Search for a city...');
  readonly initialValue = input<string>('');
  readonly apiKey = input.required<string>();
  readonly disabled = input<boolean>(false);
  readonly showClearButton = input<boolean>(true);
  readonly restrictCountries = input<string[]>([]);

  // Outputs
  readonly locationSelected = output<LocationData>();
  readonly locationCleared = output<void>();
  readonly inputFocused = output<void>();
  readonly inputBlurred = output<void>();

  // State
  readonly inputValue = signal('');
  readonly isFocused = signal(false);
  readonly isLoading = signal(true);

  private autocomplete: google.maps.places.Autocomplete | null = null;
  private initAttempts = 0;
  private readonly maxInitAttempts = 50;
  private lastInitialValue = '';

  constructor() {
    // Watch for initialValue changes
    effect(() => {
      const value = this.initialValue();
      // Only update if the initial value changed and is not empty
      if (value && value !== this.lastInitialValue) {
        this.inputValue.set(value);
        this.lastInitialValue = value;
      }
    });
  }

  ngOnInit(): void {
    this.loadGoogleMapsScript();
  }

  ngAfterViewInit(): void {
    this.initAutocomplete();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private loadGoogleMapsScript(): void {
    // Check if already loaded
    if (typeof google !== 'undefined' && google.maps?.places) {
      this.isLoading.set(false);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );
    if (existingScript) {
      // Wait for it to load
      existingScript.addEventListener('load', () => {
        this.isLoading.set(false);
      });
      return;
    }

    // Load the script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey()}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.isLoading.set(false);
      this.initAutocomplete();
    };
    document.head.appendChild(script);
  }

  private initAutocomplete(): void {
    if (!this.searchInputRef?.nativeElement) {
      return;
    }

    // Check if Google Maps API is loaded
    if (typeof google === 'undefined' || !google.maps?.places) {
      this.initAttempts++;
      if (this.initAttempts < this.maxInitAttempts) {
        setTimeout(() => this.initAutocomplete(), 100);
      }
      return;
    }

    this.isLoading.set(false);

    // Set initial value
    if (this.initialValue()) {
      this.searchInputRef.nativeElement.value = this.initialValue();
    }

    // Initialize autocomplete - use 'geocode' to get full address details
    this.autocomplete = new google.maps.places.Autocomplete(this.searchInputRef.nativeElement, {
      types: ['geocode'], // Use geocode instead of cities to get full address components
    });

    // Set country restrictions if provided
    const countries = this.restrictCountries();
    if (countries.length > 0) {
      this.autocomplete.setComponentRestrictions({ country: countries });
    }

    // Listen for place selection
    this.autocomplete.addListener('place_changed', () => {
      this.ngZone.run(() => {
        const place = this.autocomplete?.getPlace();
        if (!place?.geometry?.location) {
          return;
        }

        const locationData = this.extractLocationData(place);
        this.inputValue.set(locationData.city);
        this.locationSelected.emit(locationData);
      });
    });
  }

  private extractLocationData(place: google.maps.places.PlaceResult): LocationData {
    const addressComponents = place.address_components || [];

    let city = place.name || '';
    let country = '';
    let countryCode = '';
    let state = '';
    let postcode = '';
    let streetAddress = '';

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
      if (component.types.includes('route') || component.types.includes('street_address')) {
        streetAddress = component.long_name;
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

    // Build street address from components (street number + route/street name)
    if (!streetAddress) {
      const streetNumber = addressComponents.find(c => c.types.includes('street_number'))?.long_name;
      const route = addressComponents.find(c => c.types.includes('route'))?.long_name;
      const premise = addressComponents.find(c => c.types.includes('premise'))?.long_name;
      const subpremise = addressComponents.find(c => c.types.includes('subpremise'))?.long_name;

      // Build address: [premise/building] [subpremise/unit], [street number] [route]
      const parts: string[] = [];
      if (premise) parts.push(premise);
      if (subpremise) parts.push(subpremise);
      if (streetNumber && route) {
        parts.push(`${streetNumber} ${route}`);
      } else if (route) {
        parts.push(route);
      }
      streetAddress = parts.join(', ');
    }

    return {
      city: city || '',
      country: country || '',
      countryCode: countryCode || '',
      lat: place.geometry?.location.lat() || 0,
      lng: place.geometry?.location.lng() || 0,
      formattedAddress: place.formatted_address || `${city}, ${country}`,
      address: streetAddress || '',
      state: state || '',
      postcode: postcode || '',
    };
  }

  onFocus(): void {
    this.isFocused.set(true);
    this.inputFocused.emit();
  }

  onBlur(): void {
    this.isFocused.set(false);
    this.inputBlurred.emit();
  }

  clearInput(): void {
    this.inputValue.set('');
    if (this.searchInputRef?.nativeElement) {
      this.searchInputRef.nativeElement.value = '';
    }
    this.locationCleared.emit();
  }
}
