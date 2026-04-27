import { Injectable, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ExpertiseApiService, type Expertise, type CreateExpertiseInput, type ExpertiseTicket as ApiExpertiseTicket, type ExpertiseOperatingHours as ApiOperatingHours, type ExpertiseHost as ApiExpertiseHost } from '../../../../core/services/expertise-api.service';
import { AuthStateService } from '../../../../core/services/auth-state.service';
import { getErrorMessage } from '../../../../core/utils/api-error.util';

// =============================================================================
// Types
// =============================================================================

export type OnboardingStep = 'your-expertise' | 'availability-rates' | 'booking-details' | 'confirmation';

export interface ExpertiseHost {
  userId?: string;
  name?: string;
  email?: string;
  photoUrl?: string;
  roleId?: string;
  description?: string;
}

export interface ExpertiseTicket {
  id: string;
  ticketType: 'Free' | 'Paid';
  ticketName: string;
  sessionDuration: number;
  durationUnit: 'minutes' | 'hours';
  ticketPrice: number;
  ticketQty: number;
  description?: string;
  expertiseMode?: 'online' | 'physical' | 'hybrid';
  asapBookings?: boolean;
  hasBufferTime?: boolean;
  bufferTime?: number;
}

export interface OperatingHours {
  sameOperatingHoursForAll?: boolean;
  allOperatingStartTime?: string;
  allOperatingEndTime?: string;
  days?: Array<{
    day: string;
    isActive: boolean;
    fullDay?: boolean;
    startTime?: string;
    endTime?: string;
  }>;
}

export interface CustomQuestion {
  questionLabel: string;
  questionType: 'text' | 'dropdown' | 'checkbox' | 'multiple_choice';
  saveStatus: boolean;
  dropDown?: string[];
  checkBox?: string[];
  multipleChoices?: string[];
}

export type LocationType = 'hub' | 'new' | 'other';

export interface ExpertiseLocation {
  locationType?: LocationType;
  venueName?: string;
  autofill?: boolean;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  lat?: number;
  lng?: number;
}

// =============================================================================
// Expertise Onboarding Service
// =============================================================================

@Injectable({ providedIn: 'root' })
export class ExpertiseOnboardingService {
  private readonly fb = inject(FormBuilder);
  private readonly expertiseApi = inject(ExpertiseApiService);
  private readonly authState = inject(AuthStateService);

  // =============================================================================
  // State Signals
  // =============================================================================

  private readonly _expertiseId = signal<string | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _isSaving = signal(false);
  private readonly _currentStep = signal<OnboardingStep>('your-expertise');
  private readonly _visitedSteps = signal<Set<OnboardingStep>>(new Set());
  private readonly _error = signal<string | null>(null);

  readonly expertiseId = this._expertiseId.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isSaving = this._isSaving.asReadonly();
  readonly currentStep = this._currentStep.asReadonly();
  readonly visitedSteps = this._visitedSteps.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isEditMode = computed(() => !!this._expertiseId());

  // Hub ID for file uploads
  get hubId(): string {
    return this.authState.selectedHub()?.id || '';
  }

  // Hub name for location form
  get hubName(): string {
    return this.authState.selectedHub()?.name || '';
  }

  // Hub location for location form
  get hubLocation(): ExpertiseLocation | null {
    const loc = this.authState.selectedHub()?.location;
    if (!loc) return null;
    return {
      locationType: 'hub',
      address: loc.address,
      city: loc.city,
      state: loc.state,
      country: loc.country,
      lat: loc.lat,
      lng: loc.lng,
    };
  }

  // =============================================================================
  // Reactive Forms
  // =============================================================================

  readonly basicInfoForm: FormGroup = this.fb.group({
    expertiseTitle: ['', [Validators.required, Validators.maxLength(200)]],
    slug: ['', Validators.required],
    expertiseDescription: ['', Validators.required],
    expertiseSummary: ['', [Validators.required, Validators.maxLength(200)]],
    host: [null as ExpertiseHost | null, Validators.required],
    tags: [[] as string[]],
    primaryLanguage: ['English', Validators.required],
    secondaryLanguages: [[] as string[]],
  });

  readonly bookingForm: FormGroup = this.fb.group({
    linkMode: ['send'], // send, input
    expertiseLink: [''],
    location: [null as ExpertiseLocation | null],
    availabilityType: ['manual', Validators.required], // manual, flexible
    operatingHours: [null as OperatingHours | null],
  });

  readonly pricingForm: FormGroup = this.fb.group({
    audienceType: ['Everyone'], // Everyone, Hidden
    feePaidBy: ['learner', Validators.required], // learner, expert
    tickets: [[] as ExpertiseTicket[]],
  });

  readonly pageForm: FormGroup = this.fb.group({
    coverPhoto: ['', Validators.required],
    gallery: [[] as string[]],
    expertiseInstructions: [''],
    customQuestions: [{ isQuestionMandatory: false, questionArray: [] as CustomQuestion[] }],
  });

  // =============================================================================
  // Computed Values
  // =============================================================================

  get ticketsValue(): ExpertiseTicket[] {
    return (this.pricingForm.get('tickets')?.value as ExpertiseTicket[]) || [];
  }

  // =============================================================================
  // Navigation & Step Management
  // =============================================================================

  setCurrentStep(step: OnboardingStep): void {
    this._currentStep.set(step);
    this._visitedSteps.update(set => new Set([...set, step]));
  }

  hasVisitedStep(step: OnboardingStep): boolean {
    return this._visitedSteps().has(step);
  }

  // =============================================================================
  // Slug Generation
  // =============================================================================

  generateSlugFromTitle(title: string): void {
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    this.basicInfoForm.patchValue({ slug });
  }

  // =============================================================================
  // Ticket Management
  // =============================================================================

  addTicket(): void {
    const newTicket: ExpertiseTicket = {
      id: crypto.randomUUID(),
      ticketType: 'Paid',
      ticketName: '',
      sessionDuration: 60,
      durationUnit: 'minutes',
      ticketPrice: 0,
      ticketQty: 10,
      description: '',
      hasBufferTime: false,
      bufferTime: 0,
      expertiseMode: 'online',
    };
    const tickets = this.ticketsValue;
    this.pricingForm.patchValue({ tickets: [...tickets, newTicket] });
  }

  removeTicket(index: number): void {
    const tickets = this.ticketsValue;
    this.pricingForm.patchValue({ tickets: tickets.filter((_, i) => i !== index) });
  }

  updateTicket(index: number, updates: Partial<ExpertiseTicket>): void {
    const tickets = [...this.ticketsValue];
    if (tickets[index]) {
      tickets[index] = { ...tickets[index], ...updates };
      this.pricingForm.patchValue({ tickets });
    }
  }

  duplicateTicket(index: number): void {
    const tickets = this.ticketsValue;
    const ticket = tickets[index];
    if (ticket) {
      const newTicket: ExpertiseTicket = {
        ...ticket,
        id: crypto.randomUUID(),
        ticketName: `${ticket.ticketName} (Copy)`,
      };
      this.pricingForm.patchValue({ tickets: [...tickets, newTicket] });
    }
  }

  setTickets(tickets: ExpertiseTicket[]): void {
    this.pricingForm.patchValue({ tickets });
  }

  // =============================================================================
  // Custom Questions Management
  // =============================================================================

  addCustomQuestion(): void {
    const current = this.pageForm.get('customQuestions')?.value || { isQuestionMandatory: false, questionArray: [] };
    const newQuestion: CustomQuestion = {
      questionLabel: '',
      questionType: 'text',
      saveStatus: false,
    };
    current.questionArray.push(newQuestion);
    this.pageForm.patchValue({ customQuestions: { ...current } });
  }

  removeCustomQuestion(index: number): void {
    const current = this.pageForm.get('customQuestions')?.value || { isQuestionMandatory: false, questionArray: [] };
    current.questionArray.splice(index, 1);
    this.pageForm.patchValue({ customQuestions: { ...current } });
  }

  updateCustomQuestion(index: number, updates: Partial<CustomQuestion>): void {
    const current = this.pageForm.get('customQuestions')?.value || { isQuestionMandatory: false, questionArray: [] };
    if (current.questionArray[index]) {
      current.questionArray[index] = { ...current.questionArray[index], ...updates };
      this.pageForm.patchValue({ customQuestions: { ...current } });
    }
  }

  // =============================================================================
  // API Integration
  // =============================================================================

  /**
   * Load existing expertise for editing
   */
  async loadExpertise(expertiseId: string): Promise<boolean> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const expertise = await this.expertiseApi.getById(expertiseId);
      if (!expertise) {
        this._error.set('Expertise not found');
        return false;
      }

      this._expertiseId.set(expertiseId);
      this.populateFormsFromExpertise(expertise);
      return true;
    } catch (error) {
      console.error('Error loading expertise:', error);
      this._error.set(getErrorMessage(error));
      return false;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Save expertise as draft (create or update)
   */
  async saveAsDraft(): Promise<string | null> {
    this._isSaving.set(true);
    this._error.set(null);

    try {
      const payload = this.transformToApiPayload('draft');
      let result: Expertise | null;

      if (this._expertiseId()) {
        result = await this.expertiseApi.update(this._expertiseId()!, payload);
      } else {
        result = await this.expertiseApi.create(payload as CreateExpertiseInput);
      }

      if (result?._id) {
        this._expertiseId.set(result._id);
        return result._id;
      }
      return null;
    } catch (error) {
      console.error('Error saving draft:', error);
      this._error.set(getErrorMessage(error));
      return null;
    } finally {
      this._isSaving.set(false);
    }
  }

  /**
   * Publish expertise (create/update then publish)
   */
  async publish(): Promise<boolean> {
    this._isSaving.set(true);
    this._error.set(null);

    try {
      // First save the expertise
      const payload = this.transformToApiPayload('published');
      let result: Expertise | null;

      if (this._expertiseId()) {
        result = await this.expertiseApi.update(this._expertiseId()!, payload);
      } else {
        result = await this.expertiseApi.create(payload as CreateExpertiseInput);
      }

      if (!result?._id) {
        this._error.set('Failed to save expertise. Please try again.');
        return false;
      }

      this._expertiseId.set(result._id);

      // Then publish it
      const published = await this.expertiseApi.publish(result._id);
      if (!published) {
        this._error.set('Failed to publish expertise. Please check all required fields and try again.');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error publishing expertise:', error);
      this._error.set(getErrorMessage(error));
      return false;
    } finally {
      this._isSaving.set(false);
    }
  }

  /**
   * Transform form data to API payload
   */
  private transformToApiPayload(status: 'draft' | 'published'): CreateExpertiseInput {
    const basicInfo = this.basicInfoForm.value;
    const booking = this.bookingForm.value;
    const pricing = this.pricingForm.value;
    const page = this.pageForm.value;

    const hubId = this.authState.selectedHub()?.id || '';
    const userId = this.authState.user()?.id || '';

    // Transform tickets to API format
    const tickets: ApiExpertiseTicket[] = (pricing.tickets || []).map((t: ExpertiseTicket) => ({
      id: t.id,
      ticketName: t.ticketName,
      ticketType: t.ticketType,
      standardRate: t.ticketPrice,
      ticketQty: t.ticketQty,
      description: t.description,
      expertiseMode: t.expertiseMode || 'online',
      sessionDuration: t.sessionDuration,
      durationUnit: t.durationUnit,
      hasBufferTime: t.hasBufferTime,
      bufferTime: t.bufferTime,
      instantBooking: t.asapBookings ?? false,
    }));

    // Transform host
    const host: ApiExpertiseHost = {
      id: basicInfo.host?.userId || userId,
      name: basicInfo.host?.name || this.authState.user()?.name || '',
      email: basicInfo.host?.email || this.authState.user()?.email || '',
      profileUrl: basicInfo.host?.photoUrl || this.authState.user()?.profilePhoto || '',
      roleId: basicInfo.host?.roleId,
      description: basicInfo.host?.description || '',
    };

    // Transform operating hours
    let operatingHours: ApiOperatingHours | undefined;
    if (booking.operatingHours) {
      const days = booking.operatingHours.days || [];
      operatingHours = {
        sameOperatingHoursForAll: booking.operatingHours.sameOperatingHoursForAll,
        allOperatingStartTime: booking.operatingHours.allOperatingStartTime,
        allOperatingEndTime: booking.operatingHours.allOperatingEndTime,
        days: days.map((d: { day: string; isActive: boolean; fullDay?: boolean; startTime?: string; endTime?: string }) => ({
          key: d.day.toLowerCase().slice(0, 3),
          fullTitle: d.day,
          title: d.day.slice(0, 3),
          isActive: d.isActive,
          fullDay: d.fullDay,
          startTime: d.startTime,
          endTime: d.endTime,
        })),
      };
    }

    return {
      expertiseTitle: basicInfo.expertiseTitle,
      slug: basicInfo.slug,
      expertiseDescription: basicInfo.expertiseDescription,
      expertiseSummary: basicInfo.expertiseSummary,
      host,
      tags: basicInfo.tags || [],
      primaryLanguage: basicInfo.primaryLanguage,
      secondaryLanguages: basicInfo.secondaryLanguages || [],
      audienceType: pricing.audienceType || 'Everyone',
      availabilityType: booking.availabilityType,
      operatingHours,
      feePaidBy: pricing.feePaidBy,
      ticket: tickets,
      linkMode: booking.linkMode === 'send' ? 'send' : 'display',
      expertiseLink: booking.expertiseLink,
      location: booking.location || undefined,
      coverPhoto: page.coverPhoto,
      gallery: page.gallery || [],
      expertiseInstructions: page.expertiseInstructions,
      customQuestions: page.customQuestions,
      hubId,
      createdBy: userId,
      status,
    };
  }

  /**
   * Populate forms from loaded expertise
   */
  private populateFormsFromExpertise(expertise: Expertise): void {
    // Basic Info
    this.basicInfoForm.patchValue({
      expertiseTitle: expertise.expertiseTitle,
      slug: expertise.slug,
      expertiseDescription: expertise.expertiseDescription,
      expertiseSummary: expertise.expertiseSummary,
      host: expertise.host ? {
        userId: expertise.host.id,
        name: expertise.host.name,
        email: expertise.host.email,
        photoUrl: expertise.host.profileUrl,
        roleId: expertise.host.roleId,
        description: expertise.host.description,
      } : null,
      tags: expertise.tags || [],
      primaryLanguage: expertise.primaryLanguage,
      secondaryLanguages: expertise.secondaryLanguages || [],
    });

    // Booking
    this.bookingForm.patchValue({
      linkMode: expertise.linkMode === 'send' ? 'send' : 'input',
      expertiseLink: expertise.expertiseLink || '',
      location: expertise.location || null,
      availabilityType: expertise.availabilityType || 'manual',
      operatingHours: expertise.operatingHours ? {
        sameOperatingHoursForAll: expertise.operatingHours.sameOperatingHoursForAll,
        allOperatingStartTime: expertise.operatingHours.allOperatingStartTime,
        allOperatingEndTime: expertise.operatingHours.allOperatingEndTime,
        days: (expertise.operatingHours.days || []).map(d => ({
          day: d.fullTitle,
          isActive: d.isActive,
          fullDay: d.fullDay,
          startTime: d.startTime,
          endTime: d.endTime,
        })),
      } : null,
    });

    // Pricing
    const tickets: ExpertiseTicket[] = (expertise.ticket || []).map(t => ({
      id: t.id,
      ticketType: t.ticketType,
      ticketName: t.ticketName,
      sessionDuration: t.sessionDuration ?? 60,
      durationUnit: t.durationUnit ?? 'minutes',
      ticketPrice: t.standardRate,
      ticketQty: t.ticketQty,
      description: t.description,
      hasBufferTime: t.hasBufferTime ?? false,
      bufferTime: t.bufferTime ?? 0,
      expertiseMode: t.expertiseMode ?? 'online',
      asapBookings: t.instantBooking ?? false,
    }));

    this.pricingForm.patchValue({
      audienceType: expertise.audienceType || 'Everyone',
      feePaidBy: expertise.feePaidBy || 'learner',
      tickets,
    });

    // Page
    this.pageForm.patchValue({
      coverPhoto: expertise.coverPhoto || '',
      gallery: expertise.gallery || [],
      expertiseInstructions: expertise.expertiseInstructions || '',
      customQuestions: expertise.customQuestions || { isQuestionMandatory: false, questionArray: [] },
    });
  }

  // =============================================================================
  // Validation
  // =============================================================================

  isStepValid(step: OnboardingStep): boolean {
    switch (step) {
      case 'your-expertise':
        return this.basicInfoForm.valid;
      case 'availability-rates':
        const availType = this.bookingForm.get('availabilityType')?.value;
        const hasOperatingHours = availType === 'flexible' || this.bookingForm.get('operatingHours')?.value;
        return hasOperatingHours && this.ticketsValue.length > 0;
      case 'booking-details':
        const hasCoverPhoto = !!this.pageForm.get('coverPhoto')?.value;
        return hasCoverPhoto;
      case 'confirmation':
        return true;
      default:
        return true;
    }
  }

  isReadyToPublish(): boolean {
    return (
      this.basicInfoForm.valid &&
      this.ticketsValue.length > 0 &&
      !!this.pageForm.get('coverPhoto')?.value
    );
  }

  // =============================================================================
  // Reset
  // =============================================================================

  reset(): void {
    this._expertiseId.set(null);
    this._currentStep.set('your-expertise');
    this._visitedSteps.set(new Set());
    this._error.set(null);

    this.basicInfoForm.reset({
      expertiseTitle: '',
      slug: '',
      expertiseDescription: '',
      expertiseSummary: '',
      host: null,
      tags: [],
      primaryLanguage: 'English',
      secondaryLanguages: [],
    });

    this.bookingForm.reset({
      linkMode: 'send',
      expertiseLink: '',
      availabilityType: 'manual',
      operatingHours: null,
    });

    this.pricingForm.reset({
      audienceType: 'Everyone',
      feePaidBy: 'learner',
      tickets: [],
    });

    this.pageForm.reset({
      coverPhoto: '',
      gallery: [],
      expertiseInstructions: '',
      customQuestions: { isQuestionMandatory: false, questionArray: [] },
    });
  }

  // =============================================================================
  // Get All Data (for confirmation display)
  // =============================================================================

  getAllData(): {
    basicInfo: ReturnType<FormGroup['value']>;
    booking: ReturnType<FormGroup['value']>;
    pricing: ReturnType<FormGroup['value']>;
    page: ReturnType<FormGroup['value']>;
  } {
    return {
      basicInfo: this.basicInfoForm.value,
      booking: this.bookingForm.value,
      pricing: this.pricingForm.value,
      page: this.pageForm.value,
    };
  }
}
