import { Component, OnInit, ViewChild, ElementRef, signal, computed, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import {
  UiPanelComponent,
  UiPanelRowComponent,
  UiUploadImageComponent,
  IconComponent,
  UiLocationAutocompleteComponent,
  UiPhoneInputComponent,
  type UploadedFile,
  type IconName,
  type LocationData,
  type PhoneData,
} from '@mereka/ui';
import { UserProfileService, UploadService } from '../../../services';
import { environment } from '../../../../../../environments/environment';

interface SocialField {
  id: string;
  controlName: string;
  type: string;
  placeholder: string;
  icon: IconName;
  isActive: boolean;
}

@Component({
  selector: 'app-learner-personal-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiPanelComponent,
    UiPanelRowComponent,
    UiUploadImageComponent,
    IconComponent,
    UiLocationAutocompleteComponent,
    UiPhoneInputComponent,
  ],
  templateUrl: './personal-details.component.html',
})
export class LearnerPersonalDetailsComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly userProfileService = inject(UserProfileService);
  private readonly uploadService = inject(UploadService);
  private readonly usernameCheck$ = new Subject<string>();
  @ViewChild('coverInput') coverInput!: ElementRef<HTMLInputElement>;

  // Google Maps API Key
  readonly googleMapsApiKey = environment.google.maps.apiKey;

  // Reactive Form
  profileForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required]],
    userName: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(30)]],
    phoneNumber: ['', [Validators.required]],
    aboutMe: ['', [Validators.required]],
    webUrl: [''],
    linkedinUrl: [''],
    fbUrl: [''],
    instaUrl: [''],
    twitterUrl: [''],
    emailUrl: [''],
  });

  // Image data (not part of reactive form due to special handling)
  profileUrl = signal('');
  coverImage = signal('');

  // Location data (special handling for autocomplete)
  location = signal('');
  locationData = signal<LocationData | null>(null);

  // Validation states
  isSlugAvailable = signal(false);
  isSlugChecking = signal(false);
  profilePhotoError = signal('');
  previousSlug = signal('');

  // Social media fields
  socialFields = signal<SocialField[]>([
    { id: 'website', controlName: 'webUrl', type: 'url', placeholder: 'Website URL', icon: 'website', isActive: false },
    { id: 'facebook', controlName: 'fbUrl', type: 'url', placeholder: 'Facebook URL', icon: 'facebook', isActive: false },
    { id: 'instagram', controlName: 'instaUrl', type: 'url', placeholder: 'Instagram URL', icon: 'instagram', isActive: false },
    { id: 'twitter', controlName: 'twitterUrl', type: 'url', placeholder: 'Twitter URL', icon: 'twitter', isActive: false },
    { id: 'linkedin', controlName: 'linkedinUrl', type: 'url', placeholder: 'LinkedIn URL', icon: 'linkedin', isActive: false },
    { id: 'email', controlName: 'emailUrl', type: 'email', placeholder: 'Email Address', icon: 'email', isActive: false },
  ]);

  // API states
  isLoading = signal(false);
  isSaving = signal(false);
  saveError = signal('');

  // Computed property to check if form is valid
  isFormValid = computed(() => {
    return (
      this.profileUrl() !== '' &&
      this.profileForm.valid &&
      this.isSlugAvailable()
    );
  });

  /**
   * Validate form and show all errors
   * Returns true if valid, false otherwise
   */
  validateForm(): boolean {
    // Mark all fields as touched to show errors
    this.profileForm.markAllAsTouched();

    let isValid = true;

    // Validate profile photo
    if (!this.profileUrl()) {
      this.profilePhotoError.set('Profile photo is required.');
      isValid = false;
    } else {
      this.profilePhotoError.set('');
    }

    // Check username availability
    const userName = this.profileForm.get('userName')?.value;
    if (userName && !this.isSlugAvailable()) {
      isValid = false;
    }

    return isValid && this.profileForm.valid;
  }

  ngOnInit(): void {
    this.setupUsernameCheck();
    this.setupFormValueChanges();
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.usernameCheck$.complete();
  }

  private setupFormValueChanges(): void {
    // Watch for username changes to check availability
    this.profileForm.get('userName')?.valueChanges
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((username: string) => {
        if (username && username.length >= 6 && username.length <= 30) {
          if (username === this.previousSlug()) {
            this.isSlugAvailable.set(true);
          } else {
            this.usernameCheck$.next(username);
          }
        } else {
          this.isSlugAvailable.set(false);
        }
      });

    // Watch for fullName changes to auto-generate username
    this.profileForm.get('fullName')?.valueChanges.subscribe((name: string) => {
      const currentUserName = this.profileForm.get('userName')?.value;
      if (name && (!currentUserName || currentUserName === this.previousSlug())) {
        this.generateUsernameFromName(name);
      }
    });
  }

  private setupUsernameCheck(): void {
    this.usernameCheck$
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe(async (username) => {
        if (username.length < 6 || username.length > 30) return;

        this.isSlugChecking.set(true);
        try {
          const result = await this.userProfileService.checkUsername(username);
          this.isSlugAvailable.set(result.available);
        } catch (error) {
          console.error('Error checking username:', error);
        } finally {
          this.isSlugChecking.set(false);
        }
      });
  }

  private async loadProfile(): Promise<void> {
    this.isLoading.set(true);
    try {
      const profile = await this.userProfileService.getMyProfile();

      // Populate form with profile data
      this.profileForm.patchValue({
        fullName: profile.name || '',
        userName: profile.username || '',
        phoneNumber: profile.phoneNumber || '',
        aboutMe: profile.bio || '',
        webUrl: profile.socialLinks?.website || '',
        linkedinUrl: profile.socialLinks?.linkedin || '',
        fbUrl: profile.socialLinks?.facebook || '',
        instaUrl: profile.socialLinks?.instagram || '',
        twitterUrl: profile.socialLinks?.twitter || '',
      });

      // Set image signals
      this.profileUrl.set(profile.profilePhoto || '');
      this.coverImage.set(profile.coverPhoto || '');

      // Set location
      this.location.set(profile.location?.city || '');
      if (profile.location) {
        const loc = profile.location as { city?: string; country?: string; countryCode?: string; lat?: number; lng?: number; formattedAddress?: string };
        this.locationData.set({
          city: loc.city || '',
          country: loc.country || '',
          countryCode: loc.countryCode || '',
          lat: loc.lat || 0,
          lng: loc.lng || 0,
          formattedAddress: loc.formattedAddress || '',
        });
      }

      // Store previous slug
      this.previousSlug.set(profile.username || '');

      if (profile.username) {
        this.isSlugAvailable.set(true);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private generateUsernameFromName(name: string): void {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 30);

    if (slug.length >= 6) {
      this.profileForm.patchValue({ userName: slug });
    }
  }

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
        this.coverImage.set(result);
      };
      reader.readAsDataURL(file);
    }
  }

  setImgToForm(imageData: string | UploadedFile, key: string): void {
    const imageUrl = typeof imageData === 'string' ? imageData : imageData.preview;
    if (key === 'profileUrl') {
      this.profileUrl.set(imageUrl);
      if (imageUrl) {
        this.profilePhotoError.set('');
      }
    }
  }

  onLocationSelected(locationData: LocationData): void {
    this.locationData.set(locationData);
    this.location.set(locationData.city);
  }

  onLocationCleared(): void {
    this.locationData.set(null);
    this.location.set('');
  }

  onPhoneChange(phoneData: PhoneData): void {
    this.profileForm.patchValue({ phoneNumber: phoneData.fullNumber });
  }

  // Social media field methods
  toggleSocialField(field: SocialField): void {
    this.socialFields.update((fields) =>
      fields.map((f) => ({
        ...f,
        isActive: f.id === field.id ? !f.isActive : false,
      }))
    );
  }

  getSocialValue(controlName: string): string {
    return this.profileForm.get(controlName)?.value || '';
  }

  setSocialValue(controlName: string, value: string): void {
    this.profileForm.patchValue({ [controlName]: value });
  }

  hasSocialValue(controlName: string): boolean {
    return !!this.profileForm.get(controlName)?.value;
  }

  // Helper to check if field has error and is touched
  hasError(controlName: string): boolean {
    const control = this.profileForm.get(controlName);
    return !!(control?.invalid && control?.touched);
  }

  // Get error message for a field
  getErrorMessage(controlName: string): string {
    const control = this.profileForm.get(controlName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.errors['required']) {
      const fieldNames: Record<string, string> = {
        fullName: 'Display name',
        userName: 'Username',
        phoneNumber: 'Phone number',
        aboutMe: 'About me',
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

  // Get username error (includes availability check)
  getUsernameError(): string {
    const control = this.profileForm.get('userName');
    if (!control?.touched) return '';

    if (control.errors?.['required']) {
      return 'Username is required.';
    }
    if (control.errors?.['minlength'] || control.errors?.['maxlength']) {
      return 'Please use between 6 to 30 characters.';
    }
    const value = control.value;
    if (value && !/^[a-zA-Z0-9][a-zA-Z0-9._\-]*[a-zA-Z0-9]$/.test(value)) {
      return 'Username must start and end with a letter or number.';
    }
    if (value && !this.isSlugAvailable() && !this.isSlugChecking()) {
      return 'This username is already taken.';
    }
    return '';
  }

  async saveProfile(): Promise<void> {
    if (!this.validateForm()) return;

    this.isSaving.set(true);
    this.saveError.set('');

    try {
      const formValue = this.profileForm.value;

      // Upload images to Firebase Storage first
      const uploadPath = `users/${formValue.userName}/profile`;

      const [profilePhotoResult, coverPhotoResult] = await Promise.all([
        this.uploadService.uploadBase64(this.profileUrl(), uploadPath),
        this.uploadService.uploadBase64(this.coverImage(), uploadPath),
      ]);

      // Extract URLs from upload results
      const profilePhotoUrl = profilePhotoResult.success ? profilePhotoResult.url : this.profileUrl();
      const coverPhotoUrl = coverPhotoResult.success ? coverPhotoResult.url : this.coverImage();

      await this.userProfileService.updateMyProfile({
        name: formValue.fullName,
        username: formValue.userName,
        profilePhoto: profilePhotoUrl,
        coverPhoto: coverPhotoUrl,
        phoneNumber: formValue.phoneNumber,
        bio: formValue.aboutMe,
        location: this.locationData() ? {
          city: this.locationData()!.city,
          country: this.locationData()!.country,
          lat: this.locationData()!.lat,
          lng: this.locationData()!.lng,
        } : undefined,
        socialLinks: {
          website: formValue.webUrl,
          linkedin: formValue.linkedinUrl,
          facebook: formValue.fbUrl,
          instagram: formValue.instaUrl,
          twitter: formValue.twitterUrl,
        },
      });

      // Update image URLs with uploaded URLs
      if (profilePhotoUrl) this.profileUrl.set(profilePhotoUrl);
      if (coverPhotoUrl) this.coverImage.set(coverPhotoUrl);

      // Update previousSlug after successful save
      this.previousSlug.set(formValue.userName);
    } catch (error) {
      console.error('Error saving profile:', error);
      this.saveError.set(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      this.isSaving.set(false);
    }
  }
}
