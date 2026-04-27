import { Injectable, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ExpertOnboardingApiService } from './expert-onboarding-api.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { UploadService } from '../../services/upload.service';
import type {
  ExpertOnboardingStep,
  ExpertOnboardingData,
  ExpertValidationError,
  ExpertPortfolioItem,
  ExpertEmploymentItem,
  ExpertEducationItem,
  ExpertLanguage,
  Skill,
  Language,
  FocusArea,
  JobPreference,
  UpdateExpertProfileRequest,
} from '../models';

// =============================================================================
// Expert Onboarding Service - State Management
// =============================================================================

// Default focus areas (fallback if API doesn't return data)
const DEFAULT_FOCUS_AREAS: FocusArea[] = [
  { _id: 'arts-culture', name: 'Arts & Culture' },
  { _id: 'career-business', name: 'Career & Business' },
  { _id: 'design-branding', name: 'Design & Branding' },
  { _id: 'esg', name: 'ESG' },
  { _id: 'health-wellness', name: 'Health & Wellness' },
  { _id: 'tech-ai', name: 'Tech & AI' },
];

@Injectable({ providedIn: 'root' })
export class ExpertOnboardingService {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ExpertOnboardingApiService);
  private readonly authState = inject(AuthStateService);
  private readonly uploadService = inject(UploadService);

  // =============================================================================
  // State Signals
  // =============================================================================

  private readonly _isLoading = signal(false);
  private readonly _isSaving = signal(false);
  private readonly _isInitialized = signal(false);
  private readonly _currentStep = signal<ExpertOnboardingStep>('your-profile');
  private readonly _visitedSteps = signal<Set<ExpertOnboardingStep>>(new Set());
  private readonly _error = signal<string | null>(null);
  private readonly _returnUrl = signal<string | null>(null);

  // Reference data
  private readonly _skills = signal<Skill[]>([]);
  private readonly _languages = signal<Language[]>([]);
  private readonly _focusAreas = signal<FocusArea[]>([]);
  private readonly _jobPreferences = signal<JobPreference[]>([]);

  // Username availability
  private readonly _usernameAvailable = signal<boolean | null>(null);
  private readonly _usernameChecking = signal(false);
  private readonly _usernameMessage = signal<string>('');

  // Public readonly signals
  readonly isLoading = this._isLoading.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly isInitialized = this._isInitialized.asReadonly();
  readonly currentStep = this._currentStep.asReadonly();
  readonly visitedSteps = this._visitedSteps.asReadonly();
  readonly error = this._error.asReadonly();
  readonly returnUrl = this._returnUrl.asReadonly();

  readonly skills = this._skills.asReadonly();
  readonly languages = this._languages.asReadonly();
  readonly focusAreas = this._focusAreas.asReadonly();
  readonly jobPreferences = this._jobPreferences.asReadonly();

  readonly usernameAvailable = this._usernameAvailable.asReadonly();
  readonly usernameChecking = this._usernameChecking.asReadonly();
  readonly usernameMessage = this._usernameMessage.asReadonly();

  // =============================================================================
  // Reactive Forms
  // =============================================================================

  readonly profileForm: FormGroup = this.fb.group({
    profilePhoto: [''],
    coverPhoto: [''],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    username: ['', [Validators.minLength(6), Validators.maxLength(30), Validators.pattern(/^[a-zA-Z0-9_-]+$/)]],
    phoneNumber: [''],
    bio: ['', Validators.maxLength(500)],
    location: this.fb.group({
      city: [''],
      country: [''],
      lat: [null],
      lng: [null],
      address: [''],
      state: [''],
      postcode: [''],
    }),
    socialLinks: this.fb.group({
      website: [''],
      facebook: [''],
      instagram: [''],
      twitter: [''],
      linkedin: [''],
      email: [''],
    }),
    professionalTitle: ['', [Validators.required, Validators.maxLength(100)]],
  });

  readonly skillsForm: FormGroup = this.fb.group({
    focusAreaId: [''],
    skills: [[] as string[]],
    languages: this.fb.array([]),
    introVideo: [''],
    jobPreferences: [[] as string[]],
    hourlyRate: [null],
    currency: ['MYR'],
  });

  readonly backgroundForm: FormGroup = this.fb.group({
    portfolio: this.fb.array([]),
    employment: this.fb.array([]),
    education: this.fb.array([]),
  });

  // =============================================================================
  // Computed Values
  // =============================================================================

  readonly userId = computed(() => this.authState.user()?.id || '');

  // Profile form getters
  readonly profilePhotoUrl = computed(() => this.profileForm.get('profilePhoto')?.value || '');
  readonly coverPhotoUrl = computed(() => this.profileForm.get('coverPhoto')?.value || '');

  // Skills form getters
  readonly selectedSkills = computed(() => (this.skillsForm.get('skills')?.value as string[]) || []);
  readonly selectedJobPreferences = computed(() => (this.skillsForm.get('jobPreferences')?.value as string[]) || []);

  // Background form getters
  get portfolioArray(): FormArray {
    return this.backgroundForm.get('portfolio') as FormArray;
  }

  get employmentArray(): FormArray {
    return this.backgroundForm.get('employment') as FormArray;
  }

  get educationArray(): FormArray {
    return this.backgroundForm.get('education') as FormArray;
  }

  get languagesArray(): FormArray {
    return this.skillsForm.get('languages') as FormArray;
  }

  // =============================================================================
  // Initialization
  // =============================================================================

  async initialize(): Promise<void> {
    if (this._isInitialized()) return;

    this._isLoading.set(true);
    this._error.set(null);

    try {
      // Load reference data in parallel
      const [skills, languages, focusAreas, jobPreferences] = await Promise.all([
        this.api.getSkills(),
        this.api.getLanguages(),
        this.api.getFocusAreas(),
        this.api.getJobPreferences(),
      ]);

      this._skills.set(skills);
      this._languages.set(languages);
      // Use default focus areas if API returns empty (endpoint may not exist yet)
      this._focusAreas.set(focusAreas.length > 0 ? focusAreas : DEFAULT_FOCUS_AREAS);
      this._jobPreferences.set(jobPreferences);

      // Load existing profile data
      await this.loadExistingProfile();

      this._isInitialized.set(true);
    } catch (error) {
      console.error('Error initializing expert onboarding:', error);
      this._error.set('Failed to load onboarding data');
    } finally {
      this._isLoading.set(false);
    }
  }

  private async loadExistingProfile(): Promise<void> {
    const profile = await this.api.getMyProfile();
    if (!profile) return;

    // Populate profile form
    this.profileForm.patchValue({
      profilePhoto: profile.profilePhoto || '',
      coverPhoto: profile.coverPhoto || '',
      name: profile.name || '',
      username: profile.username || '',
      phoneNumber: profile.phoneNumber || '',
      bio: profile.bio || '',
      location: {
        city: profile.location?.city || '',
        country: profile.location?.country || '',
        lat: profile.location?.lat || null,
        lng: profile.location?.lng || null,
        address: profile.location?.address || '',
        state: profile.location?.state || '',
        postcode: profile.location?.postcode || '',
      },
      socialLinks: {
        website: profile.socialLinks?.website || '',
        facebook: profile.socialLinks?.facebook || '',
        instagram: profile.socialLinks?.instagram || '',
        twitter: profile.socialLinks?.twitter || '',
        linkedin: profile.socialLinks?.linkedin || '',
        email: profile.socialLinks?.email || '',
      },
      professionalTitle: profile.professionalTitle || '',
    });

    // Populate skills form
    const skillIds = profile.skills?.map((s) => (typeof s === 'object' ? s._id : s)) || [];
    const langArray = profile.languages?.map((l) => ({
      languageId: typeof l.languageId === 'object' ? l.languageId._id : l.languageId,
      proficiency: l.proficiency.toLowerCase() as ExpertLanguage['proficiency'],
    })) || [];
    const jobPrefIds = profile.jobPreferences?.map((jp) => (typeof jp === 'object' ? jp._id : jp)) || [];

    // Handle focusAreaId - could be string or populated object
    const focusAreaIdValue = typeof profile.focusAreaId === 'object' && profile.focusAreaId
      ? (profile.focusAreaId as { _id: string })._id
      : profile.focusAreaId || '';

    this.skillsForm.patchValue({
      focusAreaId: focusAreaIdValue,
      skills: skillIds,
      introVideo: profile.introVideo || '',
      jobPreferences: jobPrefIds,
      hourlyRate: profile.hourlyRate || null,
    });

    // Populate languages array
    this.languagesArray.clear();
    langArray.forEach((lang) => {
      this.languagesArray.push(this.createLanguageFormGroup(lang));
    });

    // Add default empty language row if none exist (to match V1 design)
    if (this.languagesArray.length === 0) {
      this.languagesArray.push(this.createLanguageFormGroup());
    }

    // Populate portfolio array
    this.portfolioArray.clear();
    profile.portfolio?.forEach((item) => {
      this.portfolioArray.push(this.createPortfolioFormGroup(item));
    });

    // Populate employment array
    this.employmentArray.clear();
    profile.employment?.forEach((item) => {
      this.employmentArray.push(this.createEmploymentFormGroup(item));
    });

    // Populate education array
    this.educationArray.clear();
    profile.education?.forEach((item) => {
      this.educationArray.push(this.createEducationFormGroup(item));
    });
  }

  // =============================================================================
  // Form Array Helpers
  // =============================================================================

  private createLanguageFormGroup(data?: Partial<ExpertLanguage>): FormGroup {
    return this.fb.group({
      languageId: [data?.languageId || '', Validators.required],
      proficiency: [data?.proficiency || 'conversational', Validators.required],
    });
  }

  private createPortfolioFormGroup(data?: Partial<ExpertPortfolioItem>): FormGroup {
    return this.fb.group({
      id: [data?.id || crypto.randomUUID()],
      title: [data?.title || '', Validators.required],
      description: [data?.description || ''],
      images: [data?.images || []],
      skills: [data?.skills || []],
      year: [data?.year || ''],
      projectLink: [data?.projectLink || ''],
    });
  }

  private createEmploymentFormGroup(data?: Partial<ExpertEmploymentItem>): FormGroup {
    return this.fb.group({
      id: [data?.id || crypto.randomUUID()],
      title: [data?.title || '', Validators.required],
      company: [data?.company || '', Validators.required],
      city: [data?.city || ''],
      country: [data?.country || ''],
      startDate: [data?.startDate || ''],
      endDate: [data?.endDate || ''],
      duration: [data?.duration || ''],
      description: [data?.description || '', Validators.maxLength(200)],
      isOngoing: [data?.isOngoing || false],
    });
  }

  private createEducationFormGroup(data?: Partial<ExpertEducationItem>): FormGroup {
    return this.fb.group({
      id: [data?.id || crypto.randomUUID()],
      degree: [data?.degree || '', Validators.required],
      institution: [data?.institution || '', Validators.required],
      startDate: [data?.startDate || ''],
      endDate: [data?.endDate || ''],
      year: [data?.year || ''],
      description: [data?.description || '', Validators.maxLength(200)],
    });
  }

  // Public methods to add items
  addLanguage(): void {
    this.languagesArray.push(this.createLanguageFormGroup());
  }

  removeLanguage(index: number): void {
    this.languagesArray.removeAt(index);
  }

  addPortfolio(): void {
    this.portfolioArray.push(this.createPortfolioFormGroup());
  }

  removePortfolio(index: number): void {
    this.portfolioArray.removeAt(index);
  }

  addEmployment(): void {
    this.employmentArray.push(this.createEmploymentFormGroup());
  }

  removeEmployment(index: number): void {
    this.employmentArray.removeAt(index);
  }

  addEducation(): void {
    this.educationArray.push(this.createEducationFormGroup());
  }

  removeEducation(index: number): void {
    this.educationArray.removeAt(index);
  }

  // =============================================================================
  // Navigation & Step Management
  // =============================================================================

  setCurrentStep(step: ExpertOnboardingStep): void {
    this._currentStep.set(step);
    this._visitedSteps.update((set) => new Set([...set, step]));
  }

  hasVisitedStep(step: ExpertOnboardingStep): boolean {
    return this._visitedSteps().has(step);
  }

  setReturnUrl(url: string | null): void {
    this._returnUrl.set(url);
  }

  // =============================================================================
  // Username Validation
  // =============================================================================

  async checkUsername(username: string): Promise<void> {
    if (!username || username.length < 6) {
      this._usernameAvailable.set(null);
      this._usernameMessage.set('');
      return;
    }

    this._usernameChecking.set(true);
    try {
      const result = await this.api.checkUsername(username);
      this._usernameAvailable.set(result.available);
      this._usernameMessage.set(result.message || (result.available ? 'Username is available' : 'Username is taken'));
    } catch {
      this._usernameAvailable.set(null);
      this._usernameMessage.set('Error checking username');
    } finally {
      this._usernameChecking.set(false);
    }
  }

  // =============================================================================
  // Validation
  // =============================================================================

  isStepValid(step: ExpertOnboardingStep): boolean {
    switch (step) {
      case 'your-profile':
        const nameValid = this.profileForm.get('name')?.valid ?? false;
        const titleValid = this.profileForm.get('professionalTitle')?.valid ?? false;
        return nameValid && titleValid;
      case 'your-skills':
        return true; // Skills step is optional
      case 'your-background':
        return true; // Background step is optional
      case 'confirmation':
        return true;
      default:
        return true;
    }
  }

  stepHasErrors(step: ExpertOnboardingStep): boolean {
    const errors = this.getValidationErrors().filter((e) => e.step === step);
    return errors.length > 0;
  }

  isReadyToSubmit(): boolean {
    return this.getValidationErrors().length === 0;
  }

  getValidationErrors(): ExpertValidationError[] {
    const errors: ExpertValidationError[] = [];

    // Profile validation
    const nameControl = this.profileForm.get('name');
    if (!nameControl?.value || nameControl.value.trim().length < 2) {
      errors.push({
        step: 'your-profile',
        field: 'name',
        message: 'Display name is required (minimum 2 characters)',
      });
    }

    // Professional title validation (required for expert profile)
    const titleControl = this.profileForm.get('professionalTitle');
    if (!titleControl?.value || titleControl.value.trim().length === 0) {
      errors.push({
        step: 'your-profile',
        field: 'professionalTitle',
        message: 'Professional title is required',
      });
    }

    // Username validation (if provided)
    const username = this.profileForm.get('username')?.value;
    if (username && (username.length < 6 || username.length > 30)) {
      errors.push({
        step: 'your-profile',
        field: 'username',
        message: 'Username must be 6-30 characters',
      });
    }

    if (username && this._usernameAvailable() === false) {
      errors.push({
        step: 'your-profile',
        field: 'username',
        message: 'Username is not available',
      });
    }

    return errors;
  }

  // =============================================================================
  // Data Collection
  // =============================================================================

  getFormData(): ExpertOnboardingData {
    const profile = this.profileForm.value;
    const skills = this.skillsForm.value;
    const background = this.backgroundForm.value;

    return {
      // Profile
      profilePhoto: profile.profilePhoto,
      coverPhoto: profile.coverPhoto,
      name: profile.name,
      username: profile.username,
      location: profile.location,
      phoneNumber: profile.phoneNumber,
      bio: profile.bio,
      socialLinks: profile.socialLinks,
      professionalTitle: profile.professionalTitle,

      // Skills
      focusAreaId: skills.focusAreaId,
      skills: skills.skills,
      languages: this.languagesArray.value,
      introVideo: skills.introVideo,
      jobPreferences: skills.jobPreferences,
      hourlyRate: skills.hourlyRate,
      currency: skills.currency,

      // Background
      portfolio: background.portfolio,
      employment: background.employment,
      education: background.education,
    };
  }

  // =============================================================================
  // Save & Submit
  // =============================================================================

  async save(): Promise<boolean> {
    this._isSaving.set(true);
    this._error.set(null);

    try {
      const formData = this.getFormData();
      const payload = this.transformToApiPayload(formData);

      const success = await this.api.saveProfile(payload);

      if (!success) {
        this._error.set('Failed to save profile');
      }

      return success;
    } catch (error) {
      console.error('Error saving profile:', error);
      this._error.set('An error occurred while saving');
      return false;
    } finally {
      this._isSaving.set(false);
    }
  }

  async submit(): Promise<boolean> {
    if (!this.isReadyToSubmit()) {
      this._error.set('Please complete all required fields');
      return false;
    }

    return this.save();
  }

  private transformToApiPayload(data: ExpertOnboardingData): UpdateExpertProfileRequest {
    return {
      // Profile fields
      name: data.name,
      username: data.username || undefined,
      profilePhoto: data.profilePhoto || undefined,
      coverPhoto: data.coverPhoto || undefined,
      bio: data.bio || undefined,
      phoneNumber: data.phoneNumber || undefined,
      location: data.location?.city
        ? {
            city: data.location.city,
            country: data.location.country,
            lat: data.location.lat,
            lng: data.location.lng,
            address: data.location.address,
            state: data.location.state,
            postcode: data.location.postcode,
          }
        : undefined,
      socialLinks: data.socialLinks,

      // Expert fields
      professionalTitle: data.professionalTitle || undefined,
      focusAreaId: data.focusAreaId || undefined,
      skills: data.skills?.length ? data.skills : undefined,
      languages: data.languages?.length
        ? data.languages.map((l) => ({
            languageId: l.languageId,
            proficiency: l.proficiency,
          }))
        : undefined,
      introVideo: data.introVideo || undefined,
      jobPreferences: data.jobPreferences?.length ? data.jobPreferences : undefined,
      hourlyRate: data.hourlyRate || undefined,

      // Background
      portfolio: data.portfolio?.length
        ? data.portfolio.map((p) => ({
            title: p.title,
            description: p.description,
            images: p.images,
            skills: p.skills,
            year: p.year,
          }))
        : undefined,
      employment: data.employment?.length
        ? data.employment.map((e) => ({
            title: e.title,
            company: e.company,
            duration: e.duration,
            description: e.description,
          }))
        : undefined,
      education: data.education?.length
        ? data.education.map((e) => ({
            degree: e.degree,
            institution: e.institution,
            year: e.year,
          }))
        : undefined,
    };
  }

  // =============================================================================
  // Image Upload
  // =============================================================================

  async uploadProfilePhoto(file: File): Promise<string | null> {
    try {
      const result = await this.uploadService.uploadFile(file, 'users/profile', {
        maxSizeBytes: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      });

      if (result.success && result.url) {
        this.profileForm.patchValue({ profilePhoto: result.url });
        return result.url;
      }

      return null;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      return null;
    }
  }

  async uploadCoverPhoto(file: File): Promise<string | null> {
    try {
      const result = await this.uploadService.uploadFile(file, 'users/covers', {
        maxSizeBytes: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      });

      if (result.success && result.url) {
        this.profileForm.patchValue({ coverPhoto: result.url });
        return result.url;
      }

      return null;
    } catch (error) {
      console.error('Error uploading cover photo:', error);
      return null;
    }
  }

  async uploadPortfolioImage(file: File, portfolioIndex: number): Promise<string | null> {
    try {
      const result = await this.uploadService.uploadFile(file, 'users/portfolio', {
        maxSizeBytes: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      });

      if (result.success && result.url) {
        const portfolio = this.portfolioArray.at(portfolioIndex);
        if (portfolio) {
          const currentImages = portfolio.get('images')?.value || [];
          portfolio.patchValue({ images: [...currentImages, result.url] });
        }
        return result.url;
      }

      return null;
    } catch (error) {
      console.error('Error uploading portfolio image:', error);
      return null;
    }
  }

  // =============================================================================
  // Skills Management
  // =============================================================================

  addSkill(skillId: string): void {
    const currentSkills = this.skillsForm.get('skills')?.value || [];
    if (!currentSkills.includes(skillId)) {
      this.skillsForm.patchValue({ skills: [...currentSkills, skillId] });
    }
  }

  removeSkill(skillId: string): void {
    const currentSkills = this.skillsForm.get('skills')?.value || [];
    this.skillsForm.patchValue({
      skills: currentSkills.filter((id: string) => id !== skillId),
    });
  }

  addJobPreference(prefId: string): void {
    const current = this.skillsForm.get('jobPreferences')?.value || [];
    if (!current.includes(prefId)) {
      this.skillsForm.patchValue({ jobPreferences: [...current, prefId] });
    }
  }

  removeJobPreference(prefId: string): void {
    const current = this.skillsForm.get('jobPreferences')?.value || [];
    this.skillsForm.patchValue({
      jobPreferences: current.filter((id: string) => id !== prefId),
    });
  }

  // =============================================================================
  // Reset
  // =============================================================================

  reset(): void {
    this._isInitialized.set(false);
    this._currentStep.set('your-profile');
    this._visitedSteps.set(new Set());
    this._error.set(null);
    this._returnUrl.set(null);
    this._usernameAvailable.set(null);
    this._usernameMessage.set('');

    this.profileForm.reset();
    this.skillsForm.reset({ currency: 'MYR' });
    this.backgroundForm.reset();

    this.languagesArray.clear();
    this.portfolioArray.clear();
    this.employmentArray.clear();
    this.educationArray.clear();
  }
}
