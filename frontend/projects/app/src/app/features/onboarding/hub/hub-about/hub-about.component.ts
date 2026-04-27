import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IconComponent, UiCollapsibleComponent, UiLocationPickerComponent, UiLocationAutocompleteComponent, ToastService, type LocationPickerData, type LocationData } from '@mereka/ui';
import {
  HubOnboardingService,
  ReferenceDataService,
  type OperatingHours,
  type DayHours,
} from '../../services';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { environment } from '../../../../../environments/environment';

interface DayOfWeek {
  short: string;
  full: string;
  key: keyof OperatingHours;
}

@Component({
  selector: 'app-hub-about',
  imports: [CommonModule, ReactiveFormsModule, IconComponent, UiCollapsibleComponent, UiLocationPickerComponent, UiLocationAutocompleteComponent],
  templateUrl: './hub-about.component.html',
})
export class HubAboutComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly authState = inject(AuthStateService);
  private readonly toastService = inject(ToastService);
  readonly onboarding = inject(HubOnboardingService);
  readonly referenceData = inject(ReferenceDataService);

  // Google Maps API Key
  readonly googleMapsApiKey = environment.google.maps.apiKey;

  // Section collapse states
  sections = signal<Record<string, boolean>>({
    title: true,
    companyType: true,
    description: true,
    focusArea: true,
    services: true,
    jobPreferences: true,
    address: true,
    availability: true,
  });

  // UI State
  isSaving = signal(false);
  customTagInput = signal('');
  showLocationPicker = signal(false);
  locationError = signal('');
  saveError = signal('');

  // Original country (for country lock validation when Stripe is connected)
  private originalCountry = signal<string | null>(null);

  // Check if Stripe is connected (country cannot be changed)
  readonly isStripeConnected = computed(() => {
    const hub = this.authState.selectedHub();
    return !!hub?.stripeAccountId;
  });

  // Check if country was changed when Stripe is connected
  readonly hasCountryChanged = computed(() => {
    if (!this.isStripeConnected()) return false;
    const original = this.originalCountry();
    const current = this.locationData?.country;
    return original !== null && current !== undefined && current !== '' && original !== current;
  });

  // Form shortcut
  get aboutForm(): FormGroup {
    return this.onboarding.aboutForm;
  }

  daysOfWeek: DayOfWeek[] = [
    { short: 'S', full: 'Sunday', key: 'sunday' },
    { short: 'M', full: 'Monday', key: 'monday' },
    { short: 'T', full: 'Tuesday', key: 'tuesday' },
    { short: 'W', full: 'Wednesday', key: 'wednesday' },
    { short: 'Th', full: 'Thursday', key: 'thursday' },
    { short: 'F', full: 'Friday', key: 'friday' },
    { short: 'S', full: 'Saturday', key: 'saturday' },
  ];

  // Location from profile form
  get locationData() {
    return this.onboarding.profileForm.get('location')?.value;
  }

  locationString = computed(() => {
    const loc = this.locationData;
    if (!loc) return '';
    return [loc.city, loc.country].filter(Boolean).join(', ');
  });

  fullLocationString = computed(() => {
    const loc = this.locationData;
    if (!loc) return '';
    return [loc.address, loc.city, loc.state, loc.country, loc.postcode].filter(Boolean).join(', ');
  });

  // Location visibility setting from about form
  displayFullAddress = computed(() => {
    return this.onboarding.aboutForm.get('displayFullAddress')?.value || false;
  });

  async ngOnInit(): Promise<void> {
    // Load reference data (focus areas, company types, experience types)
    this.referenceData.loadAll();

    // Load data if not already initialized
    if (!this.onboarding.isInitialized()) {
      const redirect = await this.onboarding.loadData();

      if (redirect === 'form') {
        this.router.navigate(['/onboarding/hub/form']);
        return;
      }

      if (redirect === 'pricing') {
        this.router.navigate(['/onboarding/hub/pricing']);
        return;
      }
    }

    // Store original country for country lock validation
    // Try to get from locationData first, fallback to authState selectedHub
    const country = this.locationData?.country || this.authState.selectedHub()?.location?.country;
    if (country) {
      this.originalCountry.set(country);
      console.log('Original country set to:', country);
    }
  }

  // ============================================================================
  // Section Toggle
  // ============================================================================

  toggleSection(sectionId: string): void {
    this.sections.update((sections) => ({
      ...sections,
      [sectionId]: !sections[sectionId],
    }));
  }

  isSectionExpanded(sectionId: string): boolean {
    return this.sections()[sectionId] ?? true;
  }

  // ============================================================================
  // Focus Area (Single Select)
  // ============================================================================

  selectFocusArea(areaId: string): void {
    this.aboutForm.patchValue({ focusArea: areaId });
  }

  isFocusAreaSelected(areaId: string): boolean {
    return this.aboutForm.get('focusArea')?.value === areaId;
  }

  // ============================================================================
  // Company Type (Soar plan)
  // ============================================================================

  selectCompanyType(typeId: string): void {
    this.aboutForm.patchValue({ companyType: typeId });
  }

  isCompanyTypeSelected(typeId: string): boolean {
    return this.aboutForm.get('companyType')?.value === typeId;
  }

  // ============================================================================
  // Experience Types
  // ============================================================================

  toggleExperience(experience: string): void {
    const current = this.aboutForm.get('experienceTypes')?.value || [];
    if (current.includes(experience)) {
      this.aboutForm.patchValue({ experienceTypes: current.filter((e: string) => e !== experience) });
    } else {
      this.aboutForm.patchValue({ experienceTypes: [...current, experience] });
    }
  }

  isExperienceSelected(experience: string): boolean {
    const types = this.aboutForm.get('experienceTypes')?.value || [];
    return types.includes(experience);
  }

  // ============================================================================
  // Tags
  // ============================================================================

  addCustomTag(): void {
    const tag = this.customTagInput().trim();
    if (!tag) return;

    const current = this.aboutForm.get('tags')?.value || [];
    if (!current.includes(tag)) {
      this.aboutForm.patchValue({ tags: [...current, tag] });
    }
    this.customTagInput.set('');
  }

  onTagInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addCustomTag();
    }
  }

  removeCustomTag(index: number): void {
    const current = this.aboutForm.get('tags')?.value || [];
    this.aboutForm.patchValue({ tags: current.filter((_: string, i: number) => i !== index) });
  }

  get tags(): string[] {
    return this.aboutForm.get('tags')?.value || [];
  }

  // ============================================================================
  // Job Preferences (Scale plan)
  // ============================================================================

  toggleJobPreference(preferenceId: string): void {
    const current = this.aboutForm.get('jobPreferences')?.value || [];
    if (current.includes(preferenceId)) {
      this.aboutForm.patchValue({ jobPreferences: current.filter((p: string) => p !== preferenceId) });
    } else {
      this.aboutForm.patchValue({ jobPreferences: [...current, preferenceId] });
    }
  }

  isJobPreferenceSelected(preferenceId: string): boolean {
    const prefs = this.aboutForm.get('jobPreferences')?.value || [];
    return prefs.includes(preferenceId);
  }

  // ============================================================================
  // Operating Hours
  // ============================================================================

  get operatingHoursGroup(): FormGroup {
    return this.aboutForm.get('operatingHours') as FormGroup;
  }

  isDayActive(dayKey: keyof OperatingHours): boolean {
    const dayGroup = this.operatingHoursGroup?.get(dayKey);
    return dayGroup ? !dayGroup.get('isClosed')?.value : false;
  }

  toggleDay(dayKey: keyof OperatingHours): void {
    const dayGroup = this.operatingHoursGroup?.get(dayKey);
    if (dayGroup) {
      const isClosed = dayGroup.get('isClosed')?.value;
      dayGroup.patchValue({ isClosed: !isClosed });
    }
  }

  getDayHours(dayKey: keyof OperatingHours): DayHours | null {
    const dayGroup = this.operatingHoursGroup?.get(dayKey);
    return dayGroup?.value || null;
  }

  updateDayHours(dayKey: keyof OperatingHours, field: 'open' | 'close', value: string): void {
    const dayGroup = this.operatingHoursGroup?.get(dayKey);
    if (dayGroup) {
      dayGroup.patchValue({ [field]: value });
    }
  }

  getActiveDays(): DayOfWeek[] {
    return this.daysOfWeek.filter((day) => this.isDayActive(day.key));
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  goBack(): void {
    this.router.navigate(['/onboarding/hub/profile']);
  }

  async saveAndExit(): Promise<void> {
    // Validate country lock before saving
    if (this.hasCountryChanged()) {
      const errorMsg = 'Country cannot be changed after Stripe is connected. You can change city but not country.';
      this.locationError.set(errorMsg);
      this.toastService.error(errorMsg);
      return;
    }

    this.isSaving.set(true);
    this.saveError.set('');
    try {
      await this.onboarding.save({ step: 3 });
      // Navigate to hub dashboard only on success
      this.router.navigate(['/hub']);
    } catch (error) {
      console.error('Error saving:', error);
      // Show backend error message
      const message = error instanceof Error ? error.message : 'Failed to save. Please try again.';
      this.saveError.set(message);
      this.toastService.error(message);
    } finally {
      this.isSaving.set(false);
    }
  }

  onContinue(): void {
    // Validate country lock before continuing
    if (this.hasCountryChanged()) {
      const errorMsg = 'Country cannot be changed after Stripe is connected. You can change city but not country.';
      this.locationError.set(errorMsg);
      this.toastService.error(errorMsg);
      return;
    }

    // Validate form before navigating
    if (!this.onboarding.validateStep(2)) {
      return;
    }

    // Just navigate - don't save (save happens on Save and Exit or confirm page)
    this.router.navigate(['/onboarding/hub/details']);
  }

  // ============================================================================
  // Error Helpers
  // ============================================================================

  hasError(controlName: string): boolean {
    if (controlName.startsWith('location.')) {
      const locationControl = this.onboarding.profileForm.get('location');
      const fieldName = controlName.replace('location.', '');
      const control = locationControl?.get(fieldName);
      return !!(control && control.invalid && (control.dirty || control.touched));
    }
    return this.onboarding.hasError(this.aboutForm, controlName);
  }

  getErrorMessage(controlName: string): string {
    if (controlName.startsWith('location.')) {
      const locationControl = this.onboarding.profileForm.get('location');
      const fieldName = controlName.replace('location.', '');
      const control = locationControl?.get(fieldName);
      if (control?.hasError('required')) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required.`;
      }
      return '';
    }
    return this.onboarding.getErrorMessage(this.aboutForm, controlName);
  }

  // ============================================================================
  // Location Handling
  // ============================================================================

  onLocationSelected(location: LocationPickerData | LocationData): void {
    // Update profile form location - handle both LocationPickerData and LocationData
    // LocationPickerData has address, state, postcode (optional)
    // LocationData only has formattedAddress, city, country, lat, lng
    const isLocationPickerData = 'address' in location || 'state' in location || 'postcode' in location;

    if (isLocationPickerData) {
      const pickerData = location as LocationPickerData;
      this.onboarding.profileForm.patchValue({
        location: {
          city: pickerData.city,
          country: pickerData.country,
          lat: pickerData.lat,
          lng: pickerData.lng,
          address: pickerData.address || '',
          state: pickerData.state || '',
          postcode: pickerData.postcode || '',
        },
      });
    } else {
      const autocompleteData = location as LocationData;
      this.onboarding.profileForm.patchValue({
        location: {
          city: autocompleteData.city,
          country: autocompleteData.country,
          lat: autocompleteData.lat,
          lng: autocompleteData.lng,
          address: autocompleteData.address || '', // Only use street address, not full formattedAddress
          state: autocompleteData.state || '',
          postcode: autocompleteData.postcode || '',
        },
      });
    }

    // Check if country changed when Stripe is connected
    const original = this.originalCountry();
    const newCountry = location.country;
    if (this.isStripeConnected() && original && newCountry !== original) {
      this.locationError.set('Country cannot be changed after Stripe is connected. You can change city but not country.');
    } else {
      this.locationError.set('');
    }
  }

  onLocationCleared(): void {
    // Clear location fields
    this.onboarding.profileForm.patchValue({
      location: {
        city: '',
        country: '',
        lat: '',
        lng: '',
        address: '',
        state: '',
        postcode: '',
      },
    });
  }

  onLocationVisibilityChange(showFull: boolean): void {
    // Update about form displayFullAddress (this gets saved to database)
    this.onboarding.aboutForm.patchValue({
      displayFullAddress: showFull,
    });
  }
}
