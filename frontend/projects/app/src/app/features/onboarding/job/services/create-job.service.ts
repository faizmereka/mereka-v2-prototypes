import { Injectable, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CreateJobApiService } from './create-job-api.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { UploadService } from '../../services/upload.service';
import type {
  CreateJobStep,
  CreateJobFormData,
  CreateJobPayload,
  Job,
  ServiceCategory,
  JobAttachment,
  DEFAULT_CREATE_JOB_FORM,
} from '../models';

// =============================================================================
// Create Job Service - State Management
// =============================================================================

@Injectable({ providedIn: 'root' })
export class CreateJobService {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(CreateJobApiService);
  private readonly authState = inject(AuthStateService);
  private readonly uploadService = inject(UploadService);

  // =============================================================================
  // State Signals
  // =============================================================================

  private readonly _jobId = signal<string | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _isSaving = signal(false);
  private readonly _currentStep = signal<CreateJobStep>('overview');
  private readonly _visitedSteps = signal<Set<CreateJobStep>>(new Set());
  private readonly _error = signal<string | null>(null);
  private readonly _returnUrl = signal<string | null>(null);
  private readonly _categories = signal<ServiceCategory[]>([]);
  private readonly _selectedCategoryId = signal<string>('');

  readonly jobId = this._jobId.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly currentStep = this._currentStep.asReadonly();
  readonly visitedSteps = this._visitedSteps.asReadonly();
  readonly error = this._error.asReadonly();
  readonly returnUrl = this._returnUrl.asReadonly();
  readonly categories = this._categories.asReadonly();
  readonly selectedCategoryId = this._selectedCategoryId.asReadonly();

  readonly isEditMode = computed(() => !!this._jobId());
  readonly hubId = computed(() => this.authState.selectedHub()?.id || '');


  // =============================================================================
  // Reactive Forms
  // =============================================================================

  readonly overviewForm: FormGroup = this.fb.group({
    jobTitle: ['', [Validators.required, Validators.maxLength(70)]],
    employmentType: ['freelance', Validators.required],
    categoryId: ['', Validators.required],
    serviceTypeId: ['', Validators.required],
    expertLevelId: ['', Validators.required],
    jobLocation: ['remote', Validators.required],
    accessMode: ['public', Validators.required],
  });

  readonly requirementsForm: FormGroup = this.fb.group({
    jobDescription: ['', [Validators.required, Validators.maxLength(2000)]],
    jobSummary: ['', Validators.maxLength(150)],
    attachments: [[] as JobAttachment[]],
    skills: [[] as string[], [Validators.minLength(3), Validators.maxLength(5)]],
  });

  readonly timelineBudgetForm: FormGroup = this.fb.group({
    startDateType: ['asap', Validators.required],
    startDate: [null],
    duration: ['1-6-months', Validators.required],
    currency: ['MYR', Validators.required],
    pricingType: ['fixed', Validators.required],
    budgetFrom: [0, [Validators.required, Validators.min(0)]],
    budgetTo: [null],
  });

  readonly yourDetailForm: FormGroup = this.fb.group({
    contactName: ['', Validators.required],
    contactEmail: ['', [Validators.required, Validators.email]],
    contactPhone: [''],
    phoneCountryCode: ['+60'],
    organizationName: [''],
    organizationLogo: [''],
    aboutOrganization: ['', Validators.maxLength(2000)],
  });

  // =============================================================================
  // Computed - Service Types based on selected category
  // =============================================================================

  readonly serviceTypesForCategory = computed(() => {
    const categoryId = this._selectedCategoryId();
    if (!categoryId) return [];
    const category = this._categories().find(c => c.id === categoryId);
    return category?.serviceTypes || [];
  });

  /**
   * Update selected category - call this when category dropdown changes
   */
  setSelectedCategory(categoryId: string): void {
    this._selectedCategoryId.set(categoryId);
    this.overviewForm.patchValue({ categoryId, serviceTypeId: '' });
  }

  // =============================================================================
  // Initialization
  // =============================================================================

  async initialize(): Promise<void> {
    await this.loadCategories();
    this.prefillUserDetails();
  }

  private async loadCategories(): Promise<void> {
    const categories = await this.api.getCategories();
    this._categories.set(categories);
  }

  private prefillUserDetails(): void {
    const user = this.authState.user();
    const hub = this.authState.selectedHub();

    if (user) {
      this.yourDetailForm.patchValue({
        contactName: user.name || '',
        contactEmail: user.email || '',
        contactPhone: user.phoneNumber || '',
      });
    }

    if (hub) {
      this.yourDetailForm.patchValue({
        organizationName: hub.name || '',
        organizationLogo: hub.logo || '',
      });
    }
  }

  // =============================================================================
  // Navigation & Step Management
  // =============================================================================

  setCurrentStep(step: CreateJobStep): void {
    this._currentStep.set(step);
    this._visitedSteps.update(set => new Set([...set, step]));
  }

  hasVisitedStep(step: CreateJobStep): boolean {
    return this._visitedSteps().has(step);
  }

  setReturnUrl(url: string | null): void {
    this._returnUrl.set(url);
  }

  // =============================================================================
  // Validation
  // =============================================================================

  isStepValid(step: CreateJobStep): boolean {
    switch (step) {
      case 'overview':
        return this.overviewForm.valid;
      case 'requirements':
        return this.requirementsForm.valid && this.getSkills().length >= 3;
      case 'timeline-budget':
        return this.timelineBudgetForm.valid && this.getBudgetFrom() > 0;
      case 'your-detail':
        return this.yourDetailForm.valid;
      case 'confirmation':
        return true;
      default:
        return true;
    }
  }

  isReadyToPublish(): boolean {
    return this.getValidationErrors().length === 0;
  }

  /**
   * Get list of validation errors that prevent publishing
   */
  getValidationErrors(): { step: string; message: string }[] {
    const errors: { step: string; message: string }[] = [];

    // Overview validation
    if (!this.overviewForm.valid) {
      if (!this.overviewForm.get('jobTitle')?.value) {
        errors.push({ step: 'overview', message: 'Job title is required' });
      }
      if (!this.overviewForm.get('categoryId')?.value) {
        errors.push({ step: 'overview', message: 'Category is required' });
      }
      if (!this.overviewForm.get('serviceTypeId')?.value) {
        errors.push({ step: 'overview', message: 'Service type is required' });
      }
    }

    // Requirements validation
    if (!this.requirementsForm.get('jobDescription')?.value) {
      errors.push({ step: 'requirements', message: 'Job description is required' });
    }
    const skillsCount = this.getSkills().length;
    if (skillsCount < 3) {
      errors.push({ step: 'requirements', message: `Add at least 3 skills (currently ${skillsCount})` });
    }

    // Timeline & Budget validation
    if (this.getBudgetFrom() <= 0) {
      errors.push({ step: 'timeline-budget', message: 'Budget amount is required' });
    }

    // Your Detail validation
    if (!this.yourDetailForm.valid) {
      if (!this.yourDetailForm.get('contactName')?.value) {
        errors.push({ step: 'your-detail', message: 'Contact name is required' });
      }
      if (!this.yourDetailForm.get('contactEmail')?.value) {
        errors.push({ step: 'your-detail', message: 'Contact email is required' });
      }
    }

    return errors;
  }

  /**
   * Check if a specific step has validation errors
   */
  stepHasErrors(stepId: string): boolean {
    return this.getValidationErrors().some(e => e.step === stepId);
  }

  // =============================================================================
  // Form Helpers
  // =============================================================================

  getSkills(): string[] {
    return this.requirementsForm.get('skills')?.value || [];
  }

  addSkill(skill: string): void {
    const current = this.getSkills();
    if (current.length < 5 && !current.includes(skill)) {
      this.requirementsForm.patchValue({ skills: [...current, skill] });
    }
  }

  removeSkill(skill: string): void {
    const current = this.getSkills();
    this.requirementsForm.patchValue({ skills: current.filter(s => s !== skill) });
  }

  getAttachments(): JobAttachment[] {
    return this.requirementsForm.get('attachments')?.value || [];
  }

  addAttachment(attachment: JobAttachment): void {
    const current = this.getAttachments();
    this.requirementsForm.patchValue({ attachments: [...current, attachment] });
  }

  removeAttachment(id: string): void {
    const current = this.getAttachments();
    this.requirementsForm.patchValue({ attachments: current.filter(a => a.id !== id) });
  }

  getBudgetFrom(): number {
    return this.timelineBudgetForm.get('budgetFrom')?.value || 0;
  }

  // =============================================================================
  // Load Job (Edit Mode)
  // =============================================================================

  async loadJob(id: string): Promise<boolean> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const job = await this.api.getById(id);
      if (!job) {
        this._error.set('Job not found');
        return false;
      }

      this._jobId.set(id);
      this.populateFormsFromJob(job);
      return true;
    } catch (error) {
      console.error('Error loading job:', error);
      this._error.set('Failed to load job');
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private populateFormsFromJob(job: any): void {
    // Backend uses different field names than the Job interface
    // Map backend fields to form fields

    // Overview - backend uses jobTitle, serviceCategory.category, etc.
    this.overviewForm.patchValue({
      jobTitle: job.jobTitle || job.title || '',
      employmentType: job.employmentType || 'freelance',
      categoryId: job.serviceCategory?.category || job.categoryId || '',
      serviceTypeId: job.serviceCategory?.serviceType || job.serviceTypeId || '',
      expertLevelId: job.expertLevel || job.expertLevelId || '',
      jobLocation: job.jobLocation || job.location || 'remote',
      accessMode: (job.accessMode || 'PUBLIC').toLowerCase(),
    });

    // Set selected category for service type dropdown
    const categoryId = job.serviceCategory?.category || job.categoryId || '';
    if (categoryId) {
      this._selectedCategoryId.set(categoryId);
    }

    // Requirements - backend uses jobDescription, jobSkills, jobUploads
    this.requirementsForm.patchValue({
      jobDescription: job.jobDescription || job.description || '',
      jobSummary: job.jobSummary || job.summary || '',
      attachments: job.jobUploads || job.attachments || [],
      skills: job.jobSkills || job.skills || [],
    });

    // Timeline & Budget - backend uses jobBudget, jobCurrency, jobStartDate, jobEndDate
    this.timelineBudgetForm.patchValue({
      startDateType: job.startDateType || 'asap',
      startDate: job.jobStartDate ? new Date(job.jobStartDate) : (job.startDate ? new Date(job.startDate) : null),
      duration: job.jobEndDate || job.duration || '1-6-months',
      currency: job.jobCurrency || job.currency || 'MYR',
      pricingType: job.jobBudget?.pricingType || job.pricingType || 'fixed',
      budgetFrom: job.jobBudget?.fromAmount || job.budgetFrom || 0,
      budgetTo: job.jobBudget?.upToAmount || job.budgetTo || null,
    });

    // Your Detail - backend uses name, email, phoneNumber, organizationImage
    this.yourDetailForm.patchValue({
      contactName: job.name || job.contactName || '',
      contactEmail: job.email || job.contactEmail || '',
      contactPhone: job.phoneNumber || job.contactPhone || '',
      organizationName: job.organizationName || '',
      organizationLogo: job.organizationImage || job.organizationLogo || '',
      aboutOrganization: job.aboutOrganization || '',
    });
  }

  // =============================================================================
  // Save & Publish
  // =============================================================================

  async saveDraft(): Promise<Job | null> {
    return this.save('draft');
  }

  async publish(): Promise<Job | null> {
    return this.save('published');
  }

  private async save(status: 'draft' | 'published'): Promise<Job | null> {
    this._isSaving.set(true);
    this._error.set(null);

    try {
      const payload = this.buildPayload(status);
      let result: Job | null;

      if (this._jobId()) {
        result = await this.api.update(this._jobId()!, payload);
      } else {
        result = await this.api.create(payload);
        if (result?._id) {
          this._jobId.set(result._id);
        }
      }

      return result;
    } catch (error) {
      console.error('Error saving job:', error);
      this._error.set('Failed to save job');
      return null;
    } finally {
      this._isSaving.set(false);
    }
  }

  private buildPayload(status: 'draft' | 'published'): CreateJobPayload {
    const overview = this.overviewForm.value;
    const requirements = this.requirementsForm.value;
    const timelineBudget = this.timelineBudgetForm.value;
    const yourDetail = this.yourDetailForm.value;

    return {
      title: overview.jobTitle,
      employmentType: overview.employmentType,
      categoryId: overview.categoryId,
      serviceTypeId: overview.serviceTypeId,
      expertLevelId: overview.expertLevelId,
      location: overview.jobLocation,
      accessMode: overview.accessMode,
      description: requirements.jobDescription,
      summary: requirements.jobSummary,
      attachments: requirements.attachments || [],
      skills: requirements.skills || [],
      startDateType: timelineBudget.startDateType,
      startDate: timelineBudget.startDate ? new Date(timelineBudget.startDate).toISOString() : undefined,
      duration: timelineBudget.duration,
      currency: timelineBudget.currency,
      pricingType: timelineBudget.pricingType,
      budgetFrom: timelineBudget.budgetFrom,
      budgetTo: timelineBudget.budgetTo || undefined,
      contactName: yourDetail.contactName,
      contactEmail: yourDetail.contactEmail,
      contactPhone: yourDetail.contactPhone ? `${yourDetail.phoneCountryCode}${yourDetail.contactPhone}` : undefined,
      organizationName: yourDetail.organizationName || undefined,
      organizationLogo: yourDetail.organizationLogo || undefined,
      aboutOrganization: yourDetail.aboutOrganization || undefined,
      hubId: this.hubId(),
      status,
    };
  }

  // =============================================================================
  // AI Summary
  // =============================================================================

  async generateAiSummary(): Promise<string | null> {
    const description = this.requirementsForm.get('jobDescription')?.value;
    if (!description) return null;

    this._isLoading.set(true);
    try {
      const summary = await this.api.generateAiSummary(description);
      if (summary) {
        this.requirementsForm.patchValue({ jobSummary: summary });
      }
      return summary;
    } finally {
      this._isLoading.set(false);
    }
  }

  // =============================================================================
  // File Upload (Direct to Firebase Storage)
  // =============================================================================

  async uploadAttachment(file: File): Promise<JobAttachment | null> {
    // Upload directly to Firebase Storage using the existing UploadService
    const result = await this.uploadService.uploadFile(
      file,
      'job-attachments',
      {
        maxSizeBytes: 100 * 1024 * 1024, // 100MB max for job attachments
        allowedTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'application/zip',
        ],
      }
    );

    if (result.success && result.url) {
      const attachment: JobAttachment = {
        id: crypto.randomUUID(),
        url: result.url,
        name: file.name,
        size: file.size,
        type: file.type,
      };
      this.addAttachment(attachment);
      return attachment;
    }

    console.error('Error uploading attachment:', result.error);
    return null;
  }

  /**
   * Upload organization logo (image only)
   */
  async uploadOrganizationLogo(file: File): Promise<string | null> {
    const result = await this.uploadService.uploadFile(
      file,
      'organization-logos',
      {
        maxSizeBytes: 5 * 1024 * 1024, // 5MB max for logos
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      }
    );

    if (result.success && result.url) {
      this.yourDetailForm.patchValue({ organizationLogo: result.url });
      return result.url;
    }

    console.error('Error uploading logo:', result.error);
    return null;
  }

  // =============================================================================
  // Reset
  // =============================================================================

  reset(): void {
    this._jobId.set(null);
    this._currentStep.set('overview');
    this._visitedSteps.set(new Set());
    this._error.set(null);
    this._returnUrl.set(null);

    this.overviewForm.reset({
      jobTitle: '',
      employmentType: 'freelance',
      categoryId: '',
      serviceTypeId: '',
      expertLevelId: '',
      jobLocation: 'remote',
      accessMode: 'public',
    });

    this.requirementsForm.reset({
      jobDescription: '',
      jobSummary: '',
      attachments: [],
      skills: [],
    });

    this.timelineBudgetForm.reset({
      startDateType: 'asap',
      startDate: null,
      duration: '1-6-months',
      currency: 'MYR',
      pricingType: 'fixed',
      budgetFrom: 0,
      budgetTo: null,
    });

    this.yourDetailForm.reset({
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      phoneCountryCode: '+60',
      organizationName: '',
      organizationLogo: '',
      aboutOrganization: '',
    });

    // Prefill user details again
    this.prefillUserDetails();
  }

  // =============================================================================
  // Form Data Getter (for preview)
  // =============================================================================

  getFormData(): CreateJobFormData {
    const overview = this.overviewForm.value;
    const requirements = this.requirementsForm.value;
    const timelineBudget = this.timelineBudgetForm.value;
    const yourDetail = this.yourDetailForm.value;

    return {
      jobTitle: overview.jobTitle,
      employmentType: overview.employmentType,
      categoryId: overview.categoryId,
      serviceTypeId: overview.serviceTypeId,
      expertLevelId: overview.expertLevelId,
      jobLocation: overview.jobLocation,
      accessMode: overview.accessMode,
      jobDescription: requirements.jobDescription,
      jobSummary: requirements.jobSummary,
      attachments: requirements.attachments || [],
      skills: requirements.skills || [],
      startDateType: timelineBudget.startDateType,
      startDate: timelineBudget.startDate,
      duration: timelineBudget.duration,
      currency: timelineBudget.currency,
      budget: {
        pricingType: timelineBudget.pricingType,
        fromAmount: timelineBudget.budgetFrom,
        upToAmount: timelineBudget.budgetTo,
      },
      contactName: yourDetail.contactName,
      contactEmail: yourDetail.contactEmail,
      contactPhone: yourDetail.contactPhone,
      phoneCountryCode: yourDetail.phoneCountryCode,
      organization: {
        name: yourDetail.organizationName,
        logo: yourDetail.organizationLogo,
        about: yourDetail.aboutOrganization,
      },
    };
  }

  // =============================================================================
  // Helper - Get display names
  // =============================================================================

  getCategoryName(categoryId: string): string {
    const category = this._categories().find(c => c.id === categoryId);
    return category?.name || '';
  }

  getServiceTypeName(categoryId: string, serviceTypeId: string): string {
    const category = this._categories().find(c => c.id === categoryId);
    const serviceType = category?.serviceTypes.find(s => s.id === serviceTypeId);
    return serviceType?.name || '';
  }
}
