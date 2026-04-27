import { Component, OnInit, ViewChild, ElementRef, inject, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  IconComponent,
  UiUploadImageComponent,
  UiLocationAutocompleteComponent,
  UiPhoneInputComponent,
  ToastService,
  type IconName,
  type UploadedFile,
  type LocationData,
  type PhoneData,
} from '@mereka/ui';
import { HubOnboardingService, UploadService } from '../../services';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { environment } from '../../../../../environments/environment';

interface SocialField {
  id: string;
  key: 'website' | 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'email';
  type: string;
  placeholder: string;
  icon: IconName;
  isActive: boolean;
}

@Component({
  selector: 'app-hub-profile',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IconComponent,
    UiUploadImageComponent,
    UiLocationAutocompleteComponent,
    UiPhoneInputComponent,
  ],
  templateUrl: './hub-profile.component.html',
})
export class HubProfileComponent implements OnInit {
  @ViewChild('coverInput') coverInput!: ElementRef<HTMLInputElement>;

  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly uploadService = inject(UploadService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly authState = inject(AuthStateService);
  private readonly toastService = inject(ToastService);
  readonly onboarding = inject(HubOnboardingService);

  // Google Maps API Key
  readonly googleMapsApiKey = environment.google.maps.apiKey;

  // UI State
  copied = signal(false);
  isSaving = signal(false);
  activeSocialField = signal<string | null>(null);
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
    const current = this.locationGroup?.get('country')?.value;
    return original !== null && current !== undefined && current !== '' && original !== current;
  });

  socialFields: SocialField[] = [
    { id: 'website', key: 'website', type: 'url', placeholder: 'Website URL', icon: 'website', isActive: false },
    { id: 'facebook', key: 'facebook', type: 'url', placeholder: 'Facebook URL', icon: 'facebook', isActive: false },
    { id: 'instagram', key: 'instagram', type: 'url', placeholder: 'Instagram URL', icon: 'instagram', isActive: false },
    { id: 'twitter', key: 'twitter', type: 'url', placeholder: 'Twitter URL', icon: 'twitter', isActive: false },
    { id: 'linkedin', key: 'linkedin', type: 'url', placeholder: 'LinkedIn URL', icon: 'linkedin', isActive: false },
    { id: 'email', key: 'email', type: 'email', placeholder: 'Email Address', icon: 'email', isActive: false },
  ];

  // Form shortcuts
  get profileForm() {
    return this.onboarding.profileForm;
  }

  get locationGroup() {
    return this.profileForm.get('location');
  }

  get socialLinksGroup() {
    return this.profileForm.get('socialLinks');
  }

  async ngOnInit(): Promise<void> {
    // Load data and handle redirects
    const redirect = await this.onboarding.loadData();

    if (redirect === 'form') {
      this.router.navigate(['/onboarding/hub/form']);
      return;
    }

    if (redirect === 'pricing') {
      this.router.navigate(['/onboarding/hub/pricing']);
      return;
    }

    // Data loaded successfully - store original country for country lock validation
    // Try to get from form first, fallback to authState selectedHub
    const country = this.locationGroup?.get('country')?.value || this.authState.selectedHub()?.location?.country;
    if (country) {
      this.originalCountry.set(country);
      console.log('Original country set to:', country);
    }
  }

  // ============================================================================
  // Image Handlers
  // ============================================================================

  triggerCoverUpload(): void {
    this.coverInput.nativeElement.click();
  }

  onCoverImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result as string;
        this.profileForm.patchValue({ coverImage: result });
        this.cdr.detectChanges(); // Trigger change detection
      };
      reader.readAsDataURL(file);
    }
  }

  onLogoLoaded(uploadedFile: UploadedFile): void {
    this.profileForm.patchValue({ agencyLogo: uploadedFile.preview });
  }

  // ============================================================================
  // Location Handler
  // ============================================================================

  onLocationSelected(locationData: LocationData): void {
    this.locationGroup?.patchValue({
      city: locationData.city,
      country: locationData.country,
      lat: locationData.lat,
      lng: locationData.lng,
      address: locationData.address || locationData.formattedAddress || '',
      state: locationData.state || '',
      postcode: locationData.postcode || '',
    });

    // Check if country changed when Stripe is connected
    const original = this.originalCountry();
    if (this.isStripeConnected() && original && locationData.country !== original) {
      this.locationError.set('Country cannot be changed after Stripe is connected. You can change city but not country.');
    } else {
      this.locationError.set('');
    }
  }

  onLocationCleared(): void {
    this.locationGroup?.patchValue({
      city: '',
      country: '',
      lat: '',
      lng: '',
      address: '',
      state: '',
      postcode: '',
    });
  }

  // Map URL for preview
  get mapUrl(): SafeResourceUrl | null {
    const loc = this.locationGroup?.value;
    if (loc?.lat && loc?.lng) {
      const url = `https://www.google.com/maps/embed/v1/place?key=${this.googleMapsApiKey}&q=${loc.lat},${loc.lng}&zoom=15`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    return null;
  }

  // ============================================================================
  // Phone Handler
  // ============================================================================

  onPhoneChange(phoneData: PhoneData): void {
    this.profileForm.patchValue({ phoneNumber: phoneData.fullNumber });
  }

  // ============================================================================
  // Social Links
  // ============================================================================

  toggleSocialField(field: SocialField): void {
    if (this.activeSocialField() === field.id) {
      this.activeSocialField.set(null);
    } else {
      this.activeSocialField.set(field.id);
    }
  }

  getSocialValue(key: string): string {
    return this.socialLinksGroup?.get(key)?.value || '';
  }

  setSocialValue(key: string, value: string): void {
    this.socialLinksGroup?.patchValue({ [key]: value });
  }

  hasSocialValue(key: string): boolean {
    return !!this.getSocialValue(key);
  }

  // ============================================================================
  // URL Copy
  // ============================================================================

  copyUrl(): void {
    const url = this.onboarding.profileUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }

  // ============================================================================
  // Slug Generation
  // ============================================================================

  onNameChange(): void {
    const name = this.profileForm.get('agencyName')?.value;
    const currentSlug = this.profileForm.get('slug')?.value;
    const previousSlug = this.onboarding.previousSlug();

    // Auto-generate slug only if slug is empty or matches previous
    if (name && (!currentSlug || currentSlug === previousSlug)) {
      const generatedSlug = this.generateSlug(name);
      this.profileForm.patchValue({ slug: generatedSlug });
    }
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100);
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  goBack(): void {
    this.router.navigate(['/onboarding/hub/setup']);
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
      await this.uploadImagesAndSave();
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
    if (!this.onboarding.validateStep(1)) {
      return;
    }

    // Just navigate - don't save (save happens on Save and Exit or final step)
    this.router.navigate(['/onboarding/hub/about']);
  }

  // ============================================================================
  // Save Helper
  // ============================================================================

  private async uploadImagesAndSave(): Promise<void> {
    const slug = this.profileForm.get('slug')?.value;
    const logo = this.profileForm.get('agencyLogo')?.value;
    const cover = this.profileForm.get('coverImage')?.value;

    // Upload logo if base64
    if (logo && logo.startsWith('data:')) {
      const logoUrl = await this.uploadService.uploadBase64(logo, `hubs/${slug}/logo`);
      this.profileForm.patchValue({ agencyLogo: logoUrl });
    }

    // Upload cover if base64
    if (cover && cover.startsWith('data:')) {
      const coverUrl = await this.uploadService.uploadBase64(cover, `hubs/${slug}/cover`);
      this.profileForm.patchValue({ coverImage: coverUrl });
    }

    // Save to API
    await this.onboarding.save({ step: 2 });
  }

  // ============================================================================
  // Error Helpers
  // ============================================================================

  hasError(controlName: string): boolean {
    return this.onboarding.hasError(this.profileForm, controlName);
  }

  getErrorMessage(controlName: string): string {
    return this.onboarding.getErrorMessage(this.profileForm, controlName);
  }
}
