import { Component, OnInit, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  UiPanelComponent,
  UiPanelRowComponent,
  UiInputComponent,
  UiTextareaComponent,
  UiUploadImageComponent,
  UiLocationAutocompleteComponent,
  UiPhoneInputComponent,
  IconComponent,
  type UploadedFile,
  type LocationData,
  type PhoneData,
} from '@mereka/ui';
import { ExpertOnboardingService } from '../../services';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-expert-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiPanelComponent,
    UiPanelRowComponent,
    UiInputComponent,
    UiTextareaComponent,
    UiUploadImageComponent,
    UiLocationAutocompleteComponent,
    UiPhoneInputComponent,
    IconComponent,
  ],
  templateUrl: './profile.component.html',
})
export class ExpertProfileComponent implements OnInit {
  @ViewChild('coverInput') coverInput!: ElementRef<HTMLInputElement>;

  private readonly router = inject(Router);
  readonly onboarding = inject(ExpertOnboardingService);

  // Google Maps API Key
  readonly googleMapsApiKey = environment.google.maps.apiKey;

  // UI State
  readonly isUploadingProfile = signal(false);
  readonly isUploadingCover = signal(false);

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

  // Computed values
  readonly profilePhoto = computed(() => this.profileForm.get('profilePhoto')?.value || '');
  readonly coverPhoto = computed(() => this.profileForm.get('coverPhoto')?.value || '');
  readonly bioLength = computed(() => (this.profileForm.get('bio')?.value || '').length);

  // Validation computed
  readonly nameError = computed(() => {
    const control = this.profileForm.get('name');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'Display name is required';
      if (control.errors['minlength']) return 'Name must be at least 2 characters';
      if (control.errors['maxlength']) return 'Name cannot exceed 100 characters';
    }
    return '';
  });

  readonly usernameError = computed(() => {
    const control = this.profileForm.get('username');
    if (control?.touched && control?.errors) {
      if (control.errors['minlength']) return 'Username must be at least 6 characters';
      if (control.errors['maxlength']) return 'Username cannot exceed 30 characters';
      if (control.errors['pattern']) return 'Only letters, numbers, underscores, and hyphens allowed';
    }
    // Check availability
    if (control?.value && this.onboarding.usernameAvailable() === false) {
      return this.onboarding.usernameMessage();
    }
    return '';
  });

  readonly usernameSuccess = computed(() => {
    const control = this.profileForm.get('username');
    return control?.value && control?.valid && this.onboarding.usernameAvailable() === true;
  });

  readonly professionalTitleError = computed(() => {
    const control = this.profileForm.get('professionalTitle');
    if (control?.touched && control?.errors) {
      if (control.errors['required']) return 'Professional title is required';
      if (control.errors['maxlength']) return 'Title cannot exceed 100 characters';
    }
    return '';
  });

  async ngOnInit(): Promise<void> {
    // Initialize service if not already done
    await this.onboarding.initialize();
  }

  // ============================================================================
  // Image Handlers
  // ============================================================================

  triggerCoverUpload(): void {
    this.coverInput.nativeElement.click();
  }

  async onCoverImageChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.isUploadingCover.set(true);
      try {
        await this.onboarding.uploadCoverPhoto(input.files[0]);
      } finally {
        this.isUploadingCover.set(false);
      }
    }
  }

  async onProfilePhotoLoaded(uploadedFile: UploadedFile): Promise<void> {
    this.isUploadingProfile.set(true);
    try {
      // If it's a File, upload it; if it's already a URL, just use it
      if (uploadedFile.file) {
        await this.onboarding.uploadProfilePhoto(uploadedFile.file);
      } else if (uploadedFile.preview) {
        this.profileForm.patchValue({ profilePhoto: uploadedFile.preview });
      }
    } finally {
      this.isUploadingProfile.set(false);
    }
  }

  onProfilePhotoRemoved(): void {
    this.profileForm.patchValue({ profilePhoto: '' });
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
  }

  onLocationCleared(): void {
    this.locationGroup?.patchValue({
      city: '',
      country: '',
      lat: null,
      lng: null,
      address: '',
      state: '',
      postcode: '',
    });
  }

  // ============================================================================
  // Phone Handler
  // ============================================================================

  onPhoneChange(phoneData: PhoneData): void {
    this.profileForm.patchValue({ phoneNumber: phoneData.fullNumber });
  }

  // ============================================================================
  // Username Check
  // ============================================================================

  onUsernameChange(): void {
    const username = this.profileForm.get('username')?.value;
    if (username && username.length >= 6) {
      // Debounce would be better, but for simplicity:
      this.onboarding.checkUsername(username);
    }
  }

  // ============================================================================
  // Social Links Toggle
  // ============================================================================

  activeSocialField = signal<string | null>(null);

  toggleSocialField(field: string): void {
    if (this.activeSocialField() === field) {
      this.activeSocialField.set(null);
    } else {
      this.activeSocialField.set(field);
    }
  }

  getSocialValue(key: string): string {
    return this.socialLinksGroup?.get(key)?.value || '';
  }

  hasSocialValue(key: string): boolean {
    return !!this.getSocialValue(key);
  }

  getSocialPlaceholder(key: string): string {
    const placeholders: Record<string, string> = {
      website: 'https://yourwebsite.com',
      facebook: 'https://facebook.com/yourprofile',
      instagram: 'https://instagram.com/yourprofile',
      twitter: 'https://twitter.com/yourprofile',
      linkedin: 'https://linkedin.com/in/yourprofile',
      email: 'contact@email.com',
    };
    return placeholders[key] || '';
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  goBack(): void {
    this.router.navigate(['/hub']);
  }

  async saveAndExit(): Promise<void> {
    const success = await this.onboarding.save();
    if (success) {
      const returnUrl = this.onboarding.returnUrl();
      this.router.navigate([returnUrl || '/hub']);
    }
  }

  goNext(): void {
    // Mark form as touched to show validation errors
    this.profileForm.markAllAsTouched();

    if (this.onboarding.isStepValid('your-profile')) {
      this.router.navigate(['/onboarding/expert/your-skills']);
    }
  }

  // ============================================================================
  // Error Helpers
  // ============================================================================

  hasError(controlName: string): boolean {
    const control = this.profileForm.get(controlName);
    return !!(control?.invalid && control?.touched);
  }

  getErrorMessage(controlName: string): string {
    const control = this.profileForm.get(controlName);
    if (!control?.errors) return '';

    if (control.errors['required']) return 'This field is required';
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} characters`;
    if (control.errors['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    if (control.errors['pattern']) return 'Invalid format';

    return 'Invalid value';
  }
}
