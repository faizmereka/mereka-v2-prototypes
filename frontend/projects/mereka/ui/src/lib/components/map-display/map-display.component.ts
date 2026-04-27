import { Component, input, computed, signal, inject, OnInit, NgZone, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

declare const google: {
  maps: {
    Map: new (element: HTMLElement, options?: google.maps.MapOptions) => google.maps.Map;
    Marker: new (options?: google.maps.MarkerOptions) => google.maps.Marker;
  };
};

declare namespace google.maps {
  interface MapOptions {
    center?: LatLngLiteral;
    zoom?: number;
    mapTypeControl?: boolean;
    fullscreenControl?: boolean;
    streetViewControl?: boolean;
    zoomControl?: boolean;
    draggable?: boolean;
    scrollwheel?: boolean;
    disableDoubleClickZoom?: boolean;
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
  }

  interface LatLngLiteral {
    lat: number;
    lng: number;
  }
}

@Component({
  selector: 'ui-map-display',
  imports: [CommonModule],
  templateUrl: './map-display.component.html',
})
export class UiMapDisplayComponent implements OnInit, AfterViewInit {
  private readonly ngZone = inject(NgZone);
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('mapContainer') mapContainerRef!: ElementRef<HTMLDivElement>;

  // Inputs
  readonly lat = input.required<number>();
  readonly lng = input.required<number>();
  readonly apiKey = input<string>('');
  readonly height = input<string>('300px');
  readonly zoom = input<number>(15);
  readonly interactive = input<boolean>(true);
  readonly showMarker = input<boolean>(true);
  readonly markerTitle = input<string>('');
  readonly useEmbed = input<boolean>(false);

  // State
  readonly isLoading = signal(true);
  readonly mapError = signal(false);

  private map: google.maps.Map | null = null;
  private marker: google.maps.Marker | null = null;
  private initAttempts = 0;
  private readonly maxInitAttempts = 50;

  // Computed embed URL for iframe fallback
  readonly embedUrl = computed<SafeResourceUrl>(() => {
    const lat = this.lat();
    const lng = this.lng();
    const key = this.apiKey();
    const zoom = this.zoom();

    let url: string;
    if (key) {
      url = `https://www.google.com/maps/embed/v1/place?key=${key}&q=${lat},${lng}&zoom=${zoom}`;
    } else {
      // Fallback without API key (limited features)
      url = `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  readonly googleMapsUrl = computed(() => {
    const lat = this.lat();
    const lng = this.lng();
    return `https://www.google.com/maps?q=${lat},${lng}`;
  });

  ngOnInit(): void {
    if (!this.useEmbed()) {
      this.loadGoogleMapsScript();
    } else {
      this.isLoading.set(false);
    }
  }

  ngAfterViewInit(): void {
    if (!this.useEmbed()) {
      this.initMap();
    }
  }

  private loadGoogleMapsScript(): void {
    if (typeof google !== 'undefined' && google.maps) {
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

    const key = this.apiKey();
    if (!key) {
      // No API key, fall back to embed
      this.isLoading.set(false);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.isLoading.set(false);
      this.initMap();
    };
    script.onerror = () => {
      this.mapError.set(true);
      this.isLoading.set(false);
    };
    document.head.appendChild(script);
  }

  private initMap(): void {
    if (this.useEmbed()) return;

    if (!this.mapContainerRef?.nativeElement) {
      return;
    }

    if (typeof google === 'undefined' || !google.maps) {
      this.initAttempts++;
      if (this.initAttempts < this.maxInitAttempts) {
        setTimeout(() => this.initMap(), 100);
      } else {
        this.mapError.set(true);
      }
      return;
    }

    this.isLoading.set(false);

    const center = { lat: this.lat(), lng: this.lng() };
    const interactive = this.interactive();

    this.map = new google.maps.Map(this.mapContainerRef.nativeElement, {
      center,
      zoom: this.zoom(),
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      zoomControl: interactive,
      draggable: interactive,
      scrollwheel: interactive,
      disableDoubleClickZoom: !interactive,
    });

    if (this.showMarker()) {
      this.marker = new google.maps.Marker({
        position: center,
        map: this.map,
        draggable: false,
      });
    }
  }

  openInGoogleMaps(): void {
    window.open(this.googleMapsUrl(), '_blank');
  }
}
