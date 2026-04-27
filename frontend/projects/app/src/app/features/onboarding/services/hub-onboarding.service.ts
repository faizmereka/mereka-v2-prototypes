import { Injectable, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthStateService } from '../../../core/services';
import type { HubLocation, SocialLinks, HubSubscription } from './hub.service';

// ============================================================================
// Types
// ============================================================================

export interface DayHours {
  open?: string;
  close?: string;
  isClosed?: boolean;
}

export interface OperatingHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface PortfolioItem {
  title: string;
  description?: string;
  images?: string[];
  year?: string;
}

export interface EmploymentItem {
  title: string;
  company: string;
  duration?: string;
  description?: string;
}

export interface EducationItem {
  degree: string;
  institution: string;
  year: string;
}

export interface OnboardingHubProfile {
  id: string;
  name: string;
  slug: string;
  logo: string;
  phoneNumber: string;
  coverImage?: string;
  description?: string;
  companyType?: string;
  introVideo?: string;
  gallery?: string[];
  autoPopulateImages?: boolean;
  portfolio?: PortfolioItem[];
  location?: HubLocation;
  displayFullAddress?: boolean;
  operatingHours?: OperatingHours;
  socialLinks?: SocialLinks;
  focusAreas?: string[];
  experienceTypes?: string[];
  tags?: string[];
  onboardingStep?: number;
}

export interface UserFields {
  // Common fields (synced with Hub for Scale plan)
  profileImage?: string;
  coverImage?: string;
  phoneNumber?: string;
  bio?: string;
  location?: HubLocation;
  socialLinks?: SocialLinks;
  // Scale-specific fields
  professionalTitle?: string;
  jobPreferences?: string[];
  employment?: EmploymentItem[];
  education?: EducationItem[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Hub Onboarding Service - Reactive Forms Based
// ============================================================================

@Injectable({
  providedIn: 'root',
})
export class HubOnboardingService {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly authState = inject(AuthStateService);
  private readonly apiUrl = `${environment.apiUrl}/hub-profile`;

  // ============================================================================
  // State Signals
  // ============================================================================

  private readonly _hubId = signal<string | null>(null);
  private readonly _planCode = signal<'scale' | 'soar' | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _isSaving = signal(false);
  private readonly _error = signal('');
  private readonly _isInitialized = signal(false);
  private readonly _previousSlug = signal('');

  // ============================================================================
  // Public Readonly Signals
  // ============================================================================

  readonly hubId = this._hubId.asReadonly();
  readonly planCode = this._planCode.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly error = this._error.asReadonly();
  readonly isInitialized = this._isInitialized.asReadonly();
  readonly previousSlug = this._previousSlug.asReadonly();

  // ============================================================================
  // Computed Signals
  // ============================================================================

  readonly isScalePlan = computed(() => this._planCode() === 'scale');
  readonly isSoarPlan = computed(() => this._planCode() === 'soar');

  readonly profileUrl = computed(() => {
    const slug = this.profileForm.get('slug')?.value;
    if (!slug) return '';
    return this.isScalePlan()
      ? `https://mereka.io/expert/${slug}`
      : `https://mereka.io/hub/${slug}`;
  });

  // ============================================================================
  // Reactive Forms
  // ============================================================================

  /**
   * Profile Form - Step 1: Basic hub info
   * Fields: agencyName, slug, agencyLogo, phoneNumber, location
   */
  profileForm: FormGroup = this.fb.group({
    agencyName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
    slug: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
    agencyLogo: ['', [Validators.required]],
    phoneNumber: ['', [Validators.required]],
    coverImage: [''],
    location: this.fb.group({
      city: ['', [Validators.required]],
      state: [''],
      country: ['', [Validators.required]],
      lat: ['', [Validators.required]],
      lng: ['', [Validators.required]],
      address: [''],
      postcode: [''],
    }),
    socialLinks: this.fb.group({
      website: [''],
      facebook: [''],
      linkedin: [''],
      instagram: [''],
      twitter: [''],
      email: [''],
    }),
  });

  /**
   * About Form - Step 2: Description, focus area, tags
   * Scale plan: includes professionalTitle, jobPreferences
   */
  aboutForm: FormGroup = this.fb.group({
    // Hub fields (both plans)
    description: ['', [Validators.required, Validators.maxLength(1000)]],
    focusArea: ['', [Validators.required]], // Single select
    experienceTypes: [[] as string[]],
    tags: [[] as string[]],
    companyType: [''], // Required for Soar plan - set dynamically

    // Address details
    displayFullAddress: [false],
    operatingHours: this.fb.group({
      monday: this.createDayHoursGroup(),
      tuesday: this.createDayHoursGroup(),
      wednesday: this.createDayHoursGroup(),
      thursday: this.createDayHoursGroup(),
      friday: this.createDayHoursGroup(),
      saturday: this.createDayHoursGroup(),
      sunday: this.createDayHoursGroup(),
    }),

    // Scale plan only (user fields)
    professionalTitle: [''],
    jobPreferences: [[] as string[]],
  });

  /**
   * Details Form - Step 3: Media, portfolio, experience
   * Scale plan: includes employment, education
   */
  detailsForm: FormGroup = this.fb.group({
    // Hub fields (both plans)
    introVideo: [''],
    gallery: [[] as string[]],
    autoPopulateImages: [false],
    portfolio: this.fb.array([]),

    // Scale plan only (user fields)
    employment: this.fb.array([]),
    education: this.fb.array([]),
  });

  // ============================================================================
  // Form Array Helpers
  // ============================================================================

  private createDayHoursGroup(): FormGroup {
    return this.fb.group({
      open: ['09:00'],
      close: ['17:00'],
      isClosed: [false],
    });
  }

  createPortfolioGroup(data?: PortfolioItem): FormGroup {
    return this.fb.group({
      title: [data?.title || '', [Validators.required]],
      description: [data?.description || ''],
      images: [data?.images || []],
      year: [data?.year || ''],
    });
  }

  createEmploymentGroup(data?: EmploymentItem): FormGroup {
    return this.fb.group({
      title: [data?.title || '', [Validators.required]],
      company: [data?.company || '', [Validators.required]],
      duration: [data?.duration || ''],
      description: [data?.description || ''],
    });
  }

  createEducationGroup(data?: EducationItem): FormGroup {
    return this.fb.group({
      degree: [data?.degree || '', [Validators.required]],
      institution: [data?.institution || '', [Validators.required]],
      year: [data?.year || '', [Validators.required]],
    });
  }

  // Form array getters
  get portfolioArray(): FormArray {
    return this.detailsForm.get('portfolio') as FormArray;
  }

  get employmentArray(): FormArray {
    return this.detailsForm.get('employment') as FormArray;
  }

  get educationArray(): FormArray {
    return this.detailsForm.get('education') as FormArray;
  }

  // Form array operations
  addPortfolio(data?: PortfolioItem): void {
    this.portfolioArray.push(this.createPortfolioGroup(data));
  }

  removePortfolio(index: number): void {
    this.portfolioArray.removeAt(index);
  }

  addEmployment(data?: EmploymentItem): void {
    this.employmentArray.push(this.createEmploymentGroup(data));
  }

  removeEmployment(index: number): void {
    this.employmentArray.removeAt(index);
  }

  addEducation(data?: EducationItem): void {
    this.educationArray.push(this.createEducationGroup(data));
  }

  removeEducation(index: number): void {
    this.educationArray.removeAt(index);
  }

  // ============================================================================
  // Validation Helpers
  // ============================================================================

  /**
   * Update validators based on plan
   * - Soar plan: companyType is required
   * - Scale plan: professionalTitle, jobPreferences are relevant
   */
  updateValidatorsForPlan(): void {
    const companyTypeControl = this.aboutForm.get('companyType');

    if (this.isSoarPlan()) {
      companyTypeControl?.setValidators([Validators.required]);
    } else {
      companyTypeControl?.clearValidators();
    }

    companyTypeControl?.updateValueAndValidity();
  }

  /**
   * Get error message for a form control
   */
  getErrorMessage(form: FormGroup, controlName: string): string {
    const control = form.get(controlName);
    if (!control || !control.errors || !control.touched) return '';

    if (control.errors['required']) {
      const fieldNames: Record<string, string> = {
        agencyName: 'Hub name',
        slug: 'URL slug',
        agencyLogo: 'Logo',
        phoneNumber: 'Phone number',
        description: 'Description',
        focusArea: 'Focus area',
        companyType: 'Company type',
        professionalTitle: 'Professional title',
      };
      return `${fieldNames[controlName] || controlName} is required.`;
    }

    if (control.errors['minlength']) {
      return `Minimum ${control.errors['minlength'].requiredLength} characters required.`;
    }

    if (control.errors['maxlength']) {
      return `Maximum ${control.errors['maxlength'].requiredLength} characters allowed.`;
    }

    return '';
  }

  /**
   * Check if form control has error
   */
  hasError(form: FormGroup, controlName: string): boolean {
    const control = form.get(controlName);
    return !!(control?.invalid && control?.touched);
  }

  /**
   * Mark all controls in a form as touched
   */
  markFormTouched(form: FormGroup): void {
    Object.keys(form.controls).forEach((key) => {
      const control = form.get(key);
      if (control instanceof FormGroup) {
        this.markFormTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }

  // ============================================================================
  // API Methods
  // ============================================================================

  /**
   * Load data from API and populate forms
   * Returns navigation path if redirect is needed:
   * - 'form' → No hub exists, go to create form
   * - 'pricing' → Hub exists but no subscription, go to pricing
   * - null → Data loaded, stay on current page
   */
  async loadData(): Promise<'form' | 'pricing' | null> {
    if (this._isLoading()) return null;

    this._isLoading.set(true);
    this._error.set('');

    try {
      const hubId = this.authState.selectedHub()?.id;

      let params = new HttpParams()
        .set('includeSubscription', 'true')
        .set('includeUserFields', 'true');

      if (hubId) {
        params = params.set('hubId', hubId);
      }

      const response = await firstValueFrom(
        this.http.get<
          ApiResponse<{
            hub: OnboardingHubProfile;
            subscription?: HubSubscription;
            userFields?: UserFields;
          }>
        >(`${this.apiUrl}/me`, {
          withCredentials: true,
          params,
        })
      );

      if (response.success && response.data) {
        const { hub, subscription } = response.data;

        // Check if hub exists
        if (!hub || !hub.name) {
          return 'form';
        }

        // Check if subscription exists
        if (!subscription || !subscription.planCode) {
          // Populate basic hub data for display on pricing page
          this._hubId.set(hub.id);
          this._previousSlug.set(hub.slug || '');
          this.profileForm.patchValue({
            agencyName: hub.name || '',
            slug: hub.slug || '',
          });
          return 'pricing';
        }

        // Full data - populate all forms
        this.populateFormsFromResponse(response.data);
        return null;
      }

      // No data returned - go to form
      return 'form';
    } catch (error) {
      // No hub found - go to form
      console.log('No existing hub profile found');
      return 'form';
    } finally {
      this._isLoading.set(false);
      this._isInitialized.set(true);
    }
  }

  /**
   * Populate all forms from API response
   * For Scale plan: Uses User fields as fallback when Hub fields are empty
   */
  private populateFormsFromResponse(data: {
    hub: OnboardingHubProfile;
    subscription?: HubSubscription;
    userFields?: UserFields;
  }): void {
    const { hub, subscription, userFields } = data;

    // Set state
    this._hubId.set(hub.id);
    this._previousSlug.set(hub.slug || '');

    if (subscription) {
      this._planCode.set(subscription.planCode);
      this.updateValidatorsForPlan();
    }

    const isScale = subscription?.planCode === 'scale';

    // For Scale plan, use User fields as fallback when Hub fields are empty
    // This ensures the form shows user's existing data if they haven't filled hub fields yet
    const resolveField = <T>(hubValue: T | undefined | null, userValue: T | undefined | null): T | null => {
      if (hubValue !== undefined && hubValue !== null && hubValue !== '') {
        return hubValue;
      }
      if (isScale && userValue !== undefined && userValue !== null && userValue !== '') {
        return userValue;
      }
      return hubValue ?? null;
    };

    // Populate profile form
    // For Scale plan: common fields like logo, coverImage, phoneNumber, location, socialLinks
    // can come from User collection if not set in Hub
    this.profileForm.patchValue({
      agencyName: hub.name || '',
      slug: hub.slug || '',
      agencyLogo: resolveField(hub.logo, userFields?.profileImage) || '',
      phoneNumber: resolveField(hub.phoneNumber, userFields?.phoneNumber) || '',
      coverImage: resolveField(hub.coverImage, userFields?.coverImage) || '',
      location: this.resolveLocation(hub.location, isScale ? userFields?.location : undefined),
      socialLinks: this.resolveSocialLinks(hub.socialLinks, isScale ? userFields?.socialLinks : undefined),
    });

    // Populate about form
    // For Scale plan: description can come from User.bio
    this.aboutForm.patchValue({
      description: resolveField(hub.description, userFields?.bio) || '',
      focusArea: hub.focusAreas?.[0] || '', // Single select - take first value
      experienceTypes: hub.experienceTypes || [],
      tags: hub.tags || [],
      companyType: hub.companyType || '',
      displayFullAddress: hub.displayFullAddress || false,
      operatingHours: hub.operatingHours || {},
      professionalTitle: userFields?.professionalTitle || '',
      jobPreferences: userFields?.jobPreferences || [],
    });

    // Populate details form
    this.detailsForm.patchValue({
      introVideo: hub.introVideo || '',
      gallery: hub.gallery || [],
      autoPopulateImages: hub.autoPopulateImages || false,
    });

    // Populate form arrays
    this.portfolioArray.clear();
    this.employmentArray.clear();
    this.educationArray.clear();

    // Portfolio (All users)
    if (hub.portfolio) {
      hub.portfolio.forEach((item) => this.addPortfolio(item));
    }

    // Employment (Scale plan)
    if (userFields?.employment) {
      userFields.employment.forEach((item) => this.addEmployment(item));
    }

    // Education (Scale plan)
    if (userFields?.education) {
      userFields.education.forEach((item) => this.addEducation(item));
    }
  }

  /**
   * Resolve location by merging Hub and User locations
   * Always normalizes fields to ensure consistent form patching
   * Uses nullish coalescing (??) to preserve empty strings from hub data
   */
  private resolveLocation(hubLocation?: HubLocation, userLocation?: HubLocation): Partial<HubLocation> {
    // Always normalize fields to ensure they're not undefined
    // Use ?? for strings to preserve empty string values from hubLocation
    return {
      city: hubLocation?.city ?? userLocation?.city ?? '',
      state: hubLocation?.state ?? userLocation?.state ?? '',
      country: hubLocation?.country ?? userLocation?.country ?? '',
      lat: hubLocation?.lat ?? userLocation?.lat,
      lng: hubLocation?.lng ?? userLocation?.lng,
      address: hubLocation?.address ?? userLocation?.address ?? '',
      postcode: hubLocation?.postcode ?? userLocation?.postcode ?? '',
    };
  }

  /**
   * Resolve social links by merging Hub and User social links
   */
  private resolveSocialLinks(hubLinks?: SocialLinks, userLinks?: SocialLinks): Partial<SocialLinks> {
    if (!userLinks) {
      return hubLinks || {};
    }

    return {
      website: hubLinks?.website || userLinks?.website || '',
      facebook: hubLinks?.facebook || userLinks?.facebook || '',
      linkedin: hubLinks?.linkedin || userLinks?.linkedin || '',
      instagram: hubLinks?.instagram || userLinks?.instagram || '',
      twitter: hubLinks?.twitter || userLinks?.twitter || '',
      email: hubLinks?.email || userLinks?.email || '',
    };
  }

  /**
   * Save all form data to API
   */
  async save(options?: { step?: number; }): Promise<void> {
    this._isSaving.set(true);
    this._error.set('');

    try {
      const profileValue = this.profileForm.value;
      const aboutValue = this.aboutForm.value;
      const detailsValue = this.detailsForm.value;

      // Filter out empty social links (backend requires valid URI format)
      const cleanSocialLinks = this.filterEmptyValues(profileValue.socialLinks);

      // Build payload - use _hubId or fallback to authState.selectedHub
      const hubId = this._hubId() || this.authState.selectedHub()?.id;
      const payload: Record<string, unknown> = {
        // Hub ID (for users with multiple hubs)
        hubId: hubId || undefined,

        // Profile form fields
        agencyName: profileValue.agencyName,
        slug: profileValue.slug?.toLowerCase(),
        agencyLogo: profileValue.agencyLogo,
        phoneNumber: profileValue.phoneNumber,
        coverImage: profileValue.coverImage || undefined,
        socialLinks: Object.keys(cleanSocialLinks).length > 0 ? cleanSocialLinks : undefined,

        // Location (convert lat/lng to strings, only include if valid)
        location: profileValue.location
          ? {
            ...profileValue.location,
            // Only convert lat/lng if they have actual values (not empty string)
            lat: profileValue.location.lat ? String(profileValue.location.lat) : undefined,
            lng: profileValue.location.lng ? String(profileValue.location.lng) : undefined,
          }
          : undefined,

        // About form fields
        description: aboutValue.description || undefined,
        focusAreas: aboutValue.focusArea ? [aboutValue.focusArea] : [], // Convert single to array for API
        experienceTypes: aboutValue.experienceTypes,
        tags: aboutValue.tags,
        companyType: aboutValue.companyType || undefined,
        displayFullAddress: aboutValue.displayFullAddress,
        operatingHours: aboutValue.operatingHours,

        // Details form fields
        introVideo: detailsValue.introVideo || undefined,
        gallery: detailsValue.gallery,
        autoPopulateImages: detailsValue.autoPopulateImages,
        portfolio: detailsValue.portfolio,
      };

      // Scale plan user fields
      if (this.isScalePlan()) {
        payload['professionalTitle'] = aboutValue.professionalTitle || undefined;
        payload['jobPreferences'] = aboutValue.jobPreferences;
        payload['employment'] = detailsValue.employment;
        payload['education'] = detailsValue.education;
      }

      // Onboarding step
      if (options?.step) {
        payload['onboardingStep'] = options.step;
      }

      await firstValueFrom(
        this.http.patch<ApiResponse<unknown>>(this.apiUrl, payload, {
          withCredentials: true,
        })
      );

      // Update previous slug after successful save
      if (profileValue.slug) {
        this._previousSlug.set(profileValue.slug.toLowerCase());
      }
    } catch (error: unknown) {
      console.error('Error saving hub profile:', error);
      // Extract error message from API response (HttpErrorResponse)
      let message = 'Failed to save';
      if (error && typeof error === 'object') {
        const httpError = error as { error?: { error?: { message?: string }; message?: string } };
        message = httpError.error?.error?.message || httpError.error?.message || message;
      }
      this._error.set(message);
      throw new Error(message);
    } finally {
      this._isSaving.set(false);
    }
  }

  /**
   * Validate a specific form step
   */
  validateStep(step: number): boolean {
    switch (step) {
      case 1:
        this.markFormTouched(this.profileForm);
        return this.profileForm.valid;
      case 2:
        this.markFormTouched(this.aboutForm);
        return this.aboutForm.valid;
      case 3:
        this.markFormTouched(this.detailsForm);
        return this.detailsForm.valid;
      default:
        return true;
    }
  }

  /**
   * Check if all forms are valid
   */
  isAllFormsValid(): boolean {
    return this.profileForm.valid && this.aboutForm.valid && this.detailsForm.valid;
  }

  /**
   * Filter out empty string values from an object
   */
  private filterEmptyValues(obj: Record<string, string> | null | undefined): Record<string, string> {
    if (!obj) return {};
    return Object.fromEntries(
      Object.entries(obj).filter(([, value]) => value && value.trim() !== '')
    );
  }

  /**
   * Publish hub for approval
   */
  async publish(): Promise<{ success: boolean; hubId?: string; status?: string; missingFields?: string[]; }> {
    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponse<{ hubId?: string; status?: string; message?: string; }>>(
          `${this.apiUrl}/publish`,
          {},
          { withCredentials: true }
        )
      );

      if (response.success && response.data) {
        return {
          success: true,
          hubId: response.data.hubId,
          status: response.data.status,
        };
      }

      throw new Error('Failed to publish hub');
    } catch (error: unknown) {
      console.error('Error publishing hub:', error);
      // Extract error message from API response (HttpErrorResponse)
      let message = 'Failed to publish';
      if (error && typeof error === 'object') {
        const httpError = error as { error?: { error?: { message?: string }; message?: string } };
        message = httpError.error?.error?.message || httpError.error?.message || message;
      }
      this._error.set(message);
      throw new Error(message);
    }
  }

  /**
   * Reset all forms and state
   */
  reset(): void {
    this.profileForm.reset();
    this.aboutForm.reset();
    this.detailsForm.reset();
    this.portfolioArray.clear();
    this.employmentArray.clear();
    this.educationArray.clear();

    this._hubId.set(null);
    this._planCode.set(null);
    this._previousSlug.set('');
    this._error.set('');
    this._isInitialized.set(false);
  }
}
