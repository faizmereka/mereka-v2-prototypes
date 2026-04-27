import { Component, OnInit, OnDestroy, Input, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  UiUploadImageComponent,
  IconComponent,
  UiLocationAutocompleteComponent,
  UiPhoneInputComponent,
  type UploadedFile,
  type LocationData,
  type PhoneData,
} from '@mereka/ui';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { HubService, UploadService } from '../../services';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-hub-profile-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiUploadImageComponent,
    IconComponent,
    UiLocationAutocompleteComponent,
    UiPhoneInputComponent,
  ],
  templateUrl: './hub-profile-form.component.html',
})
export class HubProfileFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly hubService = inject(HubService);
  private readonly uploadService = inject(UploadService);
  private readonly authState = inject(AuthStateService);
  private readonly slugCheck$ = new Subject<string>();

  @Input() showUrlInput = true;

  // Google Maps API Key
  readonly googleMapsApiKey = environment.google.maps.apiKey;

  // Reactive Form - slug validators are set dynamically based on showUrlInput
  hubForm: FormGroup = this.fb.group({
    hubName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
    slug: [''], // Validators set in ngOnInit based on showUrlInput
    phoneNumber: ['', [Validators.required]],
  });

  // Image data (not part of reactive form due to special handling)
  hubLogo = signal('');

  // Location data (special handling for autocomplete)
  location = signal('');
  locationData = signal<LocationData | null>(null);

  // Validation states
  isSlugAvailable = signal(true);
  isSlugChecking = signal(false);
  logoError = signal('');
  locationError = signal('');
  previousSlug = signal('');

  // API states
  isLoading = signal(false);
  isSaving = signal(false);
  saveError = signal('');

  // Computed property to check if form is valid
  isFormValid = computed(() => {
    const baseValid = this.hubLogo() !== '' && this.hubForm.valid && this.locationData() !== null;
    // Only check slug availability if URL input is shown
    if (this.showUrlInput) {
      return baseValid && this.isSlugAvailable();
    }
    return baseValid;
  });

  /**
   * Validate form and show all errors
   * Returns true if valid, false otherwise
   */
  validateForm(): boolean {
    // Mark all fields as touched to show errors
    this.hubForm.markAllAsTouched();

    let isValid = true;

    // Validate logo
    if (!this.hubLogo()) {
      this.logoError.set('Hub logo is required.');
      isValid = false;
    } else {
      this.logoError.set('');
    }

    // Validate location
    if (!this.locationData()) {
      this.locationError.set('Location is required.');
      isValid = false;
    } else {
      this.locationError.set('');
    }

    // Check slug availability only if URL input is shown
    if (this.showUrlInput) {
      const slug = this.hubForm.get('slug')?.value;
      if (slug && !this.isSlugAvailable()) {
        isValid = false;
      }
    }

    return isValid && this.hubForm.valid;
  }

  ngOnInit(): void {
    // Set slug validators based on showUrlInput
    if (this.showUrlInput) {
      this.hubForm.get('slug')?.setValidators([
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100),
      ]);
    }

    this.setupSlugCheck();
    this.setupFormValueChanges();
    this.loadHubProfile();
  }

  ngOnDestroy(): void {
    this.slugCheck$.complete();
  }

  private setupFormValueChanges(): void {
    // Watch for slug changes to check availability
    this.hubForm.get('slug')?.valueChanges
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((slug: string) => {
        if (slug && slug.length >= 3) {
          if (slug === this.previousSlug()) {
            this.isSlugAvailable.set(true);
          } else {
            this.slugCheck$.next(slug);
          }
        } else {
          this.isSlugAvailable.set(false);
        }
      });

    // Watch for hubName changes to auto-generate slug
    this.hubForm.get('hubName')?.valueChanges.subscribe((name: string) => {
      const currentSlug = this.hubForm.get('slug')?.value;
      if (name && (!currentSlug || currentSlug === this.previousSlug())) {
        this.generateSlugFromName(name);
      }
    });
  }

  private setupSlugCheck(): void {
    this.slugCheck$
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe(async (slug) => {
        if (slug.length < 3) return;

        this.isSlugChecking.set(true);
        try {
          const result = await this.hubService.checkSlug(slug);
          this.isSlugAvailable.set(result.available);
        } catch (error) {
          console.error('Error checking slug:', error);
          // Assume available on error to not block user
          this.isSlugAvailable.set(true);
        } finally {
          this.isSlugChecking.set(false);
        }
      });
  }

  private async loadHubProfile(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.hubService.getHubProfile();
      const profile = data.hub;

      if (!profile) {
        console.log('No existing hub profile found');
        return;
      }

      // Populate form with profile data
      this.hubForm.patchValue({
        hubName: profile.agencyName || '',
        slug: profile.slug || '',
        phoneNumber: profile.phoneNumber || '',
      });

      // Set image signal
      this.hubLogo.set(profile.agencyLogo || '');

      // Set location
      if (profile.location) {
        this.location.set(profile.location.city || '');
        this.locationData.set({
          city: profile.location.city || '',
          country: profile.location.country || '',
          countryCode: '',
          lat: Number(profile.location.lat) || 0,
          lng: Number(profile.location.lng) || 0,
          formattedAddress: `${profile.location.city}, ${profile.location.country}`,
        });
      }

      // Store previous slug
      this.previousSlug.set(profile.slug || '');

      if (profile.slug) {
        this.isSlugAvailable.set(true);
      }
    } catch (error) {
      // No existing profile - this is expected for new users
      console.log('No existing hub profile found');
    } finally {
      this.isLoading.set(false);
    }
  }

  private generateSlugFromName(name: string): void {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);

    if (slug.length >= 3) {
      this.hubForm.patchValue({ slug });
    }
  }

  onLogoLoaded(uploadedFile: UploadedFile): void {
    this.hubLogo.set(uploadedFile.preview);
    this.logoError.set('');
  }

  onLocationSelected(locationData: LocationData): void {
    this.locationData.set(locationData);
    this.location.set(locationData.city);
    this.locationError.set('');
  }

  onLocationCleared(): void {
    this.locationData.set(null);
    this.location.set('');
  }

  onPhoneChange(phoneData: PhoneData): void {
    this.hubForm.patchValue({ phoneNumber: phoneData.fullNumber });
  }

  copySlugUrl(): void {
    const slug = this.hubForm.get('slug')?.value;
    const url = `https://mereka.io/hub/${slug}`;
    navigator.clipboard.writeText(url);
  }

  // Helper to check if field has error and is touched
  hasError(controlName: string): boolean {
    const control = this.hubForm.get(controlName);
    return !!(control?.invalid && control?.touched);
  }

  // Get error message for a field
  getErrorMessage(controlName: string): string {
    const control = this.hubForm.get(controlName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.errors['required']) {
      const fieldNames: Record<string, string> = {
        hubName: 'Hub name',
        slug: 'URL slug',
        phoneNumber: 'Phone number',
      };
      return `${fieldNames[controlName] || controlName} is required.`;
    }
    if (control.errors['minlength']) {
      return `Please use at least ${control.errors['minlength'].requiredLength} characters.`;
    }
    if (control.errors['maxlength']) {
      return `Please use at most ${control.errors['maxlength'].requiredLength} characters.`;
    }
    return '';
  }

  // Get slug error (includes availability check)
  getSlugError(): string {
    const control = this.hubForm.get('slug');
    if (!control?.touched) return '';

    if (control.errors?.['required']) {
      return 'URL slug is required.';
    }
    if (control.errors?.['minlength'] || control.errors?.['maxlength']) {
      return 'Please use between 3 to 100 characters.';
    }
    const value = control.value;
    if (value && !/^[a-z0-9-]+$/.test(value)) {
      return 'Only lowercase letters, numbers, and hyphens allowed.';
    }
    if (value && !this.isSlugAvailable() && !this.isSlugChecking()) {
      return 'This URL is already taken.';
    }
    return '';
  }

  async saveProfile(): Promise<void> {
    if (!this.validateForm()) return;

    this.isSaving.set(true);
    this.saveError.set('');

    try {
      const formValue = this.hubForm.value;

      // Generate slug from hubName if not provided (when showUrlInput is false)
      let slug = formValue.slug?.toLowerCase() || '';
      if (!slug && formValue.hubName) {
        slug = formValue.hubName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 100);
      }

      // Upload logo to Firebase Storage first
      const uploadPath = `hubs/${slug}/logo`;
      const uploadResult = await this.uploadService.uploadBase64(this.hubLogo(), uploadPath);
      
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error?.message || 'Failed to upload logo');
      }
      
      const logoUrl = uploadResult.url;

      const location = this.locationData();
      if (!location) {
        throw new Error('Location is required');
      }

      // Check if we're creating or updating
      const isNewHub = !this.previousSlug();

      if (isNewHub) {
        await this.hubService.createHubProfile({
          agencyName: formValue.hubName, // Map hubName to agencyName for API
          slug: slug,
          agencyLogo: logoUrl,
          phoneNumber: formValue.phoneNumber,
          location: {
            city: location.city,
            country: location.country,
            lat: location.lat,
            lng: location.lng,
          },
        });

        // Refresh auth state to update selectedHub with the newly created hub
        // This ensures hubId is available when navigating to pricing/subscription
        await this.authState.refresh();
      } else {
        await this.hubService.updateHubProfile({
          agencyName: formValue.hubName, // Map hubName to agencyName for API
          slug: slug,
          agencyLogo: logoUrl,
          phoneNumber: formValue.phoneNumber,
          location: {
            city: location.city,
            country: location.country,
            lat: location.lat,
            lng: location.lng,
          },
        });
      }

      // Update logo URL with uploaded URL
      this.hubLogo.set(logoUrl);

      // Update previousSlug after successful save
      this.previousSlug.set(slug);
    } catch (error) {
      console.error('Error saving hub profile:', error);
      this.saveError.set(error instanceof Error ? error.message : 'Failed to save hub profile');
      throw error; // Re-throw so parent can handle
    } finally {
      this.isSaving.set(false);
    }
  }
}
