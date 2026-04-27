import { Injectable, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import {
  ExperienceApiService,
  type Experience,
  type CreateExperienceInput,
  type ExperienceTicket,
  type ExperienceSchedule,
  type ExperienceHost,
} from './experience-api.service';
import { ReferenceDataService } from '../../services/reference-data.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { generateSlug } from '../utils/slug-generator';
import { durationToMs, msToDuration } from '../utils/fee-calculator';
import { generateScheduleUid } from '../utils/rrule-builder';

// =============================================================================
// Types
// =============================================================================

export type ListingType = 'platform' | 'express';
export type OnboardingStep = 'select-type' | 'basic-info' | 'audience' | 'booking' | 'tickets' | 'page' | 'details' | 'confirm' | 'express';

// =============================================================================
// Experience Onboarding Service
// =============================================================================

@Injectable({ providedIn: 'root' })
export class ExperienceOnboardingService {
  private readonly fb = inject(FormBuilder);
  private readonly experienceApi = inject(ExperienceApiService);
  private readonly referenceData = inject(ReferenceDataService);
  private readonly authState = inject(AuthStateService);

  // =============================================================================
  // State Signals
  // =============================================================================

  private readonly _experienceId = signal<string | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _isSaving = signal(false);
  private readonly _listingType = signal<ListingType>('platform');
  private readonly _currentStep = signal<OnboardingStep>('select-type');
  private readonly _visitedSteps = signal<Set<OnboardingStep>>(new Set());
  private readonly _error = signal<string | null>(null);
  private readonly _expressHostDetails = signal<ExperienceHost | null>(null);
  private readonly _returnUrl = signal<string | null>(null);

  readonly experienceId = this._experienceId.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly returnUrl = this._returnUrl.asReadonly();
  readonly listingType = this._listingType.asReadonly();
  readonly currentStep = this._currentStep.asReadonly();
  readonly visitedSteps = this._visitedSteps.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isEditMode = computed(() => !!this._experienceId());
  readonly hubId = computed(() => this.authState.selectedHub()?.id || '');

  // =============================================================================
  // Reactive Forms
  // =============================================================================

  readonly basicInfoForm: FormGroup = this.fb.group({
    experienceTitle: ['', [Validators.required, Validators.maxLength(100)]],
    slug: ['', Validators.required],
    experienceCategory: ['', Validators.required],
    experienceTopics: [[] as { theme: string; topic: string }[]],
    experienceType: ['Physical', Validators.required],
    location: [null],
    meetingLink: [''],
    virtualHostingLocation: [null],  // Country for virtual hosting
    hostDetails: [[] as ExperienceHost[]],
    noHost: [false],
  });

  readonly audienceForm: FormGroup = this.fb.group({
    audienceType: ['Everyone', Validators.required],
    targetAudience: [[] as string[]],
    expertiseLevel: [''],
    expertiseFields: [[] as string[]],
    primaryLanguage: ['English'],
    secondaryLanguage: [[] as string[]],
  });

  readonly bookingForm: FormGroup = this.fb.group({
    durationHours: [1, [Validators.required, Validators.min(0)]],
    durationMinutes: [0, [Validators.min(0), Validators.max(59)]],
    timeZone: [Intl.DateTimeFormat().resolvedOptions().timeZone],
    schedules: [[] as unknown[]],
  });

  readonly ticketsForm: FormGroup = this.fb.group({
    feePaidBy: ['learner'],
    tickets: [[] as ExperienceTicket[]],  // Plain FormControl for easier patching
  });

  readonly pageForm: FormGroup = this.fb.group({
    experienceDescription: [''],
    coverPhoto: [''],
    gallery: [[] as string[]],
    video: [''],
  });

  readonly detailsForm: FormGroup = this.fb.group({
    learnerOutcome: [''],
    instruction: [''],
    materialProvided: [''],
    materialNeedToBring: [''],
    poster: [''],
    customQuestions: [{ isQuestionMandatory: false, questionArray: [] }],
  });

  readonly expressForm: FormGroup = this.fb.group({
    experienceTitle: ['', [Validators.required, Validators.maxLength(100)]],
    slug: ['', Validators.required],
    externalLink: [''],
    coverPhoto: [''],
    experienceDescription: [''],
  });

  // =============================================================================
  // Computed Values
  // =============================================================================

  get ticketsValue(): ExperienceTicket[] {
    return (this.ticketsForm.get('tickets')?.value as ExperienceTicket[]) || [];
  }

  // =============================================================================
  // Initialization
  // =============================================================================

  async initialize(): Promise<void> {
    await this.referenceData.loadExperienceReferenceData();
  }

  // =============================================================================
  // Navigation & Step Management
  // =============================================================================

  setListingType(type: ListingType): void {
    this._listingType.set(type);
  }

  /**
   * Set host details for express listing
   */
  setExpressHostDetails(host: ExperienceHost): void {
    this._expressHostDetails.set(host);
  }

  setCurrentStep(step: OnboardingStep): void {
    this._currentStep.set(step);
    this._visitedSteps.update(set => new Set([...set, step]));
  }

  hasVisitedStep(step: OnboardingStep): boolean {
    return this._visitedSteps().has(step);
  }

  // Get selected hub info
  getSelectedHub(): { id: string; name: string } | null {
    const hub = this.authState.selectedHub();
    if (hub) {
      return { id: hub.id, name: hub.name };
    }
    return null;
  }

  getSelectedHubLocation(): { address?: string; city?: string; state?: string; country?: string; postcode?: string; lat?: number; lng?: number } | null {
    const hub = this.authState.selectedHub();
    return hub?.location || null;
  }

  // =============================================================================
  // Title/Slug Handling
  // =============================================================================

  generateSlugFromTitle(title: string): void {
    const slug = generateSlug(title);
    if (this._listingType() === 'express') {
      this.expressForm.patchValue({ slug });
    } else {
      this.basicInfoForm.patchValue({ slug });
    }
  }

  async checkSlugAvailability(slug: string): Promise<boolean> {
    return this.experienceApi.checkSlugAvailability(slug, this._experienceId() || undefined);
  }

  // =============================================================================
  // Ticket Management
  // =============================================================================

  addTicket(): void {
    const newTicket = {
      id: crypto.randomUUID(),
      ticketType: 'Free',
      ticketName: '',
      ticketPrice: 0,
      ticketQty: 10,
      description: '',
      hasCutoffTime: false,
      cutoffNumber: 0,
      cutoffTime: 'Hour(s)',
      cutoffBeforeAfter: 'Before Experience starts',
    };
    const tickets = this.ticketsValue;
    this.ticketsForm.patchValue({ tickets: [...tickets, newTicket] });
  }

  removeTicket(index: number): void {
    const tickets = this.ticketsValue;
    this.ticketsForm.patchValue({ tickets: tickets.filter((_, i) => i !== index) });
  }

  duplicateTicket(index: number): void {
    const tickets = this.ticketsValue;
    const ticket = tickets[index];
    if (ticket) {
      const newTicket: ExperienceTicket = {
        ...ticket,
        id: crypto.randomUUID(),
        ticketName: `${ticket.ticketName} (Copy)`,
      };
      this.ticketsForm.patchValue({ tickets: [...tickets, newTicket] });
    }
  }

  // =============================================================================
  // Schedule Management
  // =============================================================================

  addSchedule(scheduleData: Partial<{ recurringType: string; startDate: Date; recurringRule: string[] }>): void {
    const schedules = this.bookingForm.get('schedules')?.value || [];
    const newSchedule = {
      uid: generateScheduleUid(),
      recurringType: scheduleData.recurringType || 'no_repeat',
      startDate: scheduleData.startDate || new Date(),
      recurringRule: scheduleData.recurringRule || [],
      isNew: true,
    };
    this.bookingForm.patchValue({ schedules: [...schedules, newSchedule] });
  }

  removeSchedule(uid: string): void {
    const schedules = this.bookingForm.get('schedules')?.value || [];
    this.bookingForm.patchValue({
      schedules: schedules.filter((s: { uid: string }) => s.uid !== uid),
    });
  }

  // =============================================================================
  // Load Experience (Edit Mode)
  // =============================================================================

  async loadExperience(id: string): Promise<boolean> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const experience = await this.experienceApi.getById(id);
      if (!experience) {
        this._error.set('Experience not found');
        return false;
      }

      this._experienceId.set(id);
      this._listingType.set(experience.listingType || 'platform');
      this.populateFormsFromExperience(experience);
      return true;
    } catch (error) {
      console.error('Error loading experience:', error);
      this._error.set('Failed to load experience');
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  private populateFormsFromExperience(exp: Experience): void {
    // Basic Info
    this.basicInfoForm.patchValue({
      experienceTitle: exp.experienceTitle,
      slug: exp.slug,
      experienceCategory: exp.experienceCategory,
      experienceTopics: exp.experienceTopics || [],
      experienceType: exp.experienceType,
      location: exp.location,
      meetingLink: exp.meetingLink,
      virtualHostingLocation: exp.virtualHostingLocation || null,
      hostDetails: exp.hostDetails || [],
      noHost: exp.noHost,
    });

    // Audience
    this.audienceForm.patchValue({
      audienceType: exp.audienceType,
      targetAudience: exp.targetAudience || [],
      expertiseLevel: exp.expertiseLevel,
      expertiseFields: exp.expertiseFields || [],
      primaryLanguage: exp.primaryLanguage,
      secondaryLanguage: exp.secondaryLanguage || [],
    });

    // Booking
    const duration = msToDuration(exp.experienceDuration || 0);
    this.bookingForm.patchValue({
      durationHours: duration.hours,
      durationMinutes: duration.minutes,
      timeZone: exp.timeZone,
      schedules: exp.schedules || [],
    });

    // Tickets
    const ticketData = (exp.ticket || []).map(ticket => ({
      id: ticket.id || crypto.randomUUID(),
      ticketType: ticket.ticketType,
      ticketName: ticket.ticketName,
      ticketPrice: ticket.ticketPrice,
      ticketQty: ticket.ticketQty,
      description: ticket.description || '',
      hasCutoffTime: ticket.hasCutoffTime || false,
      cutoffNumber: ticket.cutoffNumber || 0,
      cutoffTime: ticket.cutoffTime || 'Hour(s)',
      cutoffBeforeAfter: ticket.cutoffBeforeAfter || 'Before Experience starts',
    }));
    this.ticketsForm.patchValue({ feePaidBy: exp.feePaidBy, tickets: ticketData });

    // Page
    this.pageForm.patchValue({
      experienceDescription: exp.experienceDescription,
      coverPhoto: exp.coverPhoto,
      gallery: exp.gallery || [],
      video: exp.video,
    });

    // Details
    this.detailsForm.patchValue({
      learnerOutcome: exp.learnerOutcome,
      instruction: exp.instruction,
      materialProvided: exp.materialProvided,
      materialNeedToBring: exp.materialNeedToBring,
      poster: exp.poster,
      customQuestions: exp.customQuestions || { isQuestionMandatory: false, questionArray: [] },
    });

    // Express (if applicable)
    if (exp.listingType === 'express') {
      this.expressForm.patchValue({
        experienceTitle: exp.experienceTitle,
        slug: exp.slug,
        coverPhoto: exp.coverPhoto,
        experienceDescription: exp.experienceDescription,
      });
    }
  }

  // =============================================================================
  // Save & Publish
  // =============================================================================

  async saveDraft(): Promise<Experience | null> {
    return this.save('DRAFTED');
  }

  async publish(): Promise<Experience | null> {
    return this.save('ACTIVE');
  }

  private async save(status: 'ACTIVE' | 'DRAFTED'): Promise<Experience | null> {
    this._isSaving.set(true);
    this._error.set(null);

    try {
      const payload = this.buildPayload(status);
      let result: Experience | null;

      if (this._experienceId()) {
        result = await this.experienceApi.update(this._experienceId()!, payload);
      } else {
        result = await this.experienceApi.create(payload as CreateExperienceInput);
        if (result?._id) {
          this._experienceId.set(result._id);
        }
      }

      return result;
    } catch (error) {
      console.error('Error saving experience:', error);
      this._error.set('Failed to save experience');
      return null;
    } finally {
      this._isSaving.set(false);
    }
  }

  private buildPayload(status: 'ACTIVE' | 'DRAFTED'): CreateExperienceInput {
    const hubId = this.hubId();
    const listingType = this._listingType();

    if (listingType === 'express') {
      const express = this.expressForm.value;
      const booking = this.bookingForm.value;
      const tickets = this.ticketsForm.value;

      // Get host details from express flow (set by setExpressHostDetails)
      // Fall back to current user if not set
      const expressHost = this._expressHostDetails();
      const user = this.authState.user();
      const hostDetails: ExperienceHost[] = expressHost
        ? [expressHost]
        : user
          ? [{
              userId: user.id || '',
              name: user.name || '',
              email: user.email || '',
              photoUrl: user.profilePhoto || '',
            }]
          : [];

      return {
        experienceTitle: express.experienceTitle,
        slug: express.slug,
        experienceDescription: express.experienceDescription || '',
        coverPhoto: express.coverPhoto || '',
        experienceType: 'Physical',
        hubId,
        listingType: 'express',
        status,
        audienceType: 'Everyone',
        noHost: hostDetails.length === 0,
        hostDetails: this.transformHostDetailsForApi(hostDetails),
        feePaidBy: tickets.feePaidBy || 'learner',
        currency: 'MYR',
        // Include booking data
        experienceDuration: durationToMs(booking.durationHours, booking.durationMinutes),
        timeZone: booking.timeZone,
        schedules: this.convertSchedulesForApi(booking.schedules || []),
        // Include tickets
        ticket: this.ticketsValue,
      };
    }

    const basicInfo = this.basicInfoForm.value;
    const audience = this.audienceForm.value;
    const booking = this.bookingForm.value;
    const tickets = this.ticketsForm.value;
    const page = this.pageForm.value;
    const details = this.detailsForm.value;

    return {
      // Basic Info
      experienceTitle: basicInfo.experienceTitle,
      slug: basicInfo.slug,
      experienceCategory: basicInfo.experienceCategory,
      experienceTopics: basicInfo.experienceTopics,
      experienceType: basicInfo.experienceType,
      location: basicInfo.location,
      meetingLink: basicInfo.meetingLink,
      virtualHostingLocation: basicInfo.virtualHostingLocation,
      hostDetails: this.transformHostDetailsForApi(basicInfo.hostDetails || []),
      noHost: basicInfo.noHost,

      // Audience
      audienceType: audience.audienceType,
      targetAudience: audience.targetAudience,
      expertiseLevel: audience.expertiseLevel,
      expertiseFields: audience.expertiseFields,
      primaryLanguage: audience.primaryLanguage,
      secondaryLanguage: audience.secondaryLanguage,

      // Booking
      experienceDuration: durationToMs(booking.durationHours, booking.durationMinutes),
      timeZone: booking.timeZone,
      schedules: this.convertSchedulesForApi(booking.schedules || []),

      // Tickets
      feePaidBy: tickets.feePaidBy,
      ticket: this.ticketsValue,

      // Page
      experienceDescription: page.experienceDescription,
      coverPhoto: page.coverPhoto,
      gallery: page.gallery,
      video: page.video,

      // Details
      learnerOutcome: details.learnerOutcome,
      instruction: details.instruction,
      materialProvided: details.materialProvided,
      materialNeedToBring: details.materialNeedToBring,
      poster: details.poster,
      customQuestions: details.customQuestions,

      // Meta
      hubId,
      listingType: 'platform',
      status,
      currency: 'MYR',
    };
  }

  // =============================================================================
  // Validation
  // =============================================================================

  isStepValid(step: OnboardingStep): boolean {
    switch (step) {
      case 'basic-info':
        return this.basicInfoForm.valid;
      case 'audience':
        return this.audienceForm.valid;
      case 'booking':
        return this.bookingForm.valid && (this.bookingForm.get('schedules')?.value?.length ?? 0) > 0;
      case 'tickets':
        return this.ticketsForm.valid && this.ticketsValue.length > 0;
      case 'page':
        return this.pageForm.valid;
      case 'details':
        return true; // Optional step
      case 'express':
        return this.expressForm.valid;
      default:
        return true;
    }
  }

  isReadyToPublish(): boolean {
    if (this._listingType() === 'express') {
      return this.expressForm.valid;
    }
    return (
      this.basicInfoForm.valid &&
      this.audienceForm.valid &&
      this.bookingForm.valid &&
      (this.bookingForm.get('schedules')?.value?.length ?? 0) > 0 &&
      this.ticketsForm.valid &&
      this.ticketsValue.length > 0 &&
      this.pageForm.valid
    );
  }

  // =============================================================================
  // Reset
  // =============================================================================

  setReturnUrl(url: string | null): void {
    this._returnUrl.set(url);
  }

  reset(): void {
    this._experienceId.set(null);
    this._listingType.set('platform');
    this._currentStep.set('select-type');
    this._visitedSteps.set(new Set());
    this._error.set(null);
    this._returnUrl.set(null);

    this.basicInfoForm.reset({
      experienceTitle: '',
      slug: '',
      experienceCategory: '',
      experienceTopics: [],
      experienceType: 'Physical',
      location: null,
      meetingLink: '',
      hostDetails: [],
      noHost: false,
    });

    this.audienceForm.reset({
      audienceType: 'Everyone',
      targetAudience: [],
      expertiseLevel: '',
      expertiseFields: [],
      primaryLanguage: 'English',
      secondaryLanguage: [],
    });

    this.bookingForm.reset({
      durationHours: 1,
      durationMinutes: 0,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      schedules: [],
    });

    this.ticketsForm.reset({ feePaidBy: 'learner', tickets: [] });

    this.pageForm.reset({
      experienceDescription: '',
      coverPhoto: '',
      gallery: [],
      video: '',
    });

    this.detailsForm.reset({
      learnerOutcome: '',
      instruction: '',
      materialProvided: '',
      materialNeedToBring: '',
      poster: '',
      customQuestions: { isQuestionMandatory: false, questionArray: [] },
    });

    this.expressForm.reset({
      experienceTitle: '',
      slug: '',
      externalLink: '',
      coverPhoto: '',
      experienceDescription: '',
    });
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  /**
   * Convert schedules to API format with ISO date strings
   */
  private convertSchedulesForApi(schedules: unknown[]): ExperienceSchedule[] {
    return (schedules || []).map((schedule: unknown) => {
      const s = schedule as { uid: string; startDate: string; endDate: string; recurringType: string; recurringRule: string[] };
      return {
        uid: s.uid,
        startDate: this.convertToIsoDate(s.startDate),
        endDate: s.endDate ? this.convertToIsoDate(s.endDate) : undefined,
        recurringType: s.recurringType || 'no_repeat',
        recurringRule: s.recurringRule || [],
      };
    });
  }

  /**
   * Convert date string from "YYYY-MM-DD HH:mmAM/PM" format to ISO format
   */
  private convertToIsoDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString();

    // If already ISO format, return as-is
    if (dateStr.includes('T')) {
      return dateStr;
    }

    // Parse format: "YYYY-MM-DD HH:mmAM/PM"
    const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})(AM|PM)$/);
    if (match) {
      const [, date, hours, minutes, period] = match;
      let hour = parseInt(hours, 10);
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      return new Date(`${date}T${hour.toString().padStart(2, '0')}:${minutes}:00`).toISOString();
    }

    // Fallback: try parsing as-is
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }

  /**
   * Transform hostDetails from frontend format to API format
   * - Removes frontend-only fields (isNew, isEditing)
   * - Keeps all backend fields: userId, name, email, photoUrl, roleId, description
   */
  private transformHostDetailsForApi(hosts: ExperienceHost[]): Array<{
    userId?: string;
    name?: string;
    email?: string;
    photoUrl?: string;
    roleId?: string;
    description?: string;
  }> {
    return (hosts || []).map(host => ({
      userId: host.userId,
      name: host.name,
      email: host.email,
      photoUrl: host.photoUrl,
      roleId: host.roleId,
      description: host.description,
    }));
  }
}
