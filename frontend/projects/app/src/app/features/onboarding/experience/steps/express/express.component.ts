import { Component, OnInit, signal, computed, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UiScheduleFormComponent, ScheduleFormData } from '@mereka/ui';
import { ExperienceOnboardingService } from '../../services/experience-onboarding.service';
import { HubTeamService, type HubTeamMember, type HubRole } from '../../../../../core/services';
import { AuthStateService } from '../../../../../core/services/auth-state.service';
import { generateSlug } from '../../utils/slug-generator';
import { durationToMs, msToDuration } from '../../utils/fee-calculator';

@Component({
  selector: 'app-experience-express',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, UiScheduleFormComponent],
  templateUrl: './express.component.html',
})
export class ExperienceExpressComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly onboardingService = inject(ExperienceOnboardingService);
  private readonly hubTeamService = inject(HubTeamService);
  private readonly authState = inject(AuthStateService);
  private readonly destroy$ = new Subject<void>();

  readonly loading = this.onboardingService.isLoading;
  readonly isSaving = this.onboardingService.isSaving;
  readonly isEditMode = this.onboardingService.isEditMode;
  readonly currency = signal('RM');

  // Team members for host selection
  readonly teamMembers = signal<HubTeamMember[]>([]);
  readonly hubRoles = signal<HubRole[]>([]);
  readonly loadingTeamMembers = signal(false);

  // Form for express mode
  form: FormGroup;

  // Duration options
  readonly hours = ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  readonly minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
  readonly ticketTypes = ['Paid', 'Free'];

  // Schedule form data for UiScheduleFormComponent
  readonly scheduleFormData = computed<Partial<ScheduleFormData>>(() => {
    const booking = this.onboardingService.bookingForm.value;
    return {
      isMultiDay: false,
      experienceDuration: durationToMs(booking.durationHours || 1, booking.durationMinutes || 0),
      timezone: booking.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      schedules: booking.schedules || [],
    };
  });

  // Ticket state
  addingTicket = signal(false);
  ticketTypeLimit = 3;

  // Host options - current user + team members
  readonly hosts = computed(() => {
    const currentUser = this.authState.user();
    const members = this.teamMembers();

    // Start with current user as first option
    const hostOptions: Array<{ id: string; name: string; email: string; photoUrl?: string; bio?: string }> = [];

    if (currentUser) {
      hostOptions.push({
        id: currentUser.id || 'current-user',
        name: `${currentUser.name || 'Me'} (You)`,
        email: currentUser.email || '',
        photoUrl: currentUser.profilePhoto,
      });
    }

    // Add team members (excluding current user to avoid duplicates)
    members.forEach(member => {
      if (member.userId !== currentUser?.id) {
        hostOptions.push({
          id: member.userId,
          name: member.name,
          email: member.email,
          photoUrl: member.avatar ?? undefined,
          bio: member.bio ?? undefined,
        });
      }
    });

    return hostOptions;
  });

  constructor() {
    this.form = this.fb.group({
      experienceTitle: ['', [Validators.required, Validators.maxLength(70)]],
      host: ['', Validators.required],
      ticketArray: this.fb.array([], Validators.required),
    });

    // Add first ticket by default
    this.addTicketGroup(true);
  }

  ngOnInit(): void {
    // Set listing type to express
    this.onboardingService.setListingType('express');

    // Load team members for host selection
    void this.loadTeamMembers();

    // Check for edit mode
    const experienceId = this.route.snapshot.paramMap.get('id');
    if (experienceId) {
      this.loadExperienceForEdit(experienceId);
    }

    // Sync form values to service express form (buildPayload reads from expressForm)
    this.form.get('experienceTitle')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(title => {
        this.onboardingService.expressForm.patchValue({
          experienceTitle: title,
          slug: generateSlug(title || ''),
        });
      });
  }

  private async loadTeamMembers(): Promise<void> {
    this.loadingTeamMembers.set(true);
    try {
      const hubId = this.onboardingService.hubId();
      if (!hubId) {
        this.teamMembers.set([]);
        this.hubRoles.set([]);
        return;
      }

      // Load members and roles in parallel
      const [members, roles] = await Promise.all([
        this.hubTeamService.listActiveMembers(hubId, { limit: 100 }),
        this.hubTeamService.listRoles(hubId),
      ]);

      this.teamMembers.set(members);
      this.hubRoles.set(roles);

      // Set default host to current user if not already set
      const currentUser = this.authState.user();
      if (currentUser && !this.form.get('host')?.value) {
        this.form.patchValue({ host: currentUser.id || 'current-user' });
      }
    } catch {
      // Silent failure - show current user only
      this.teamMembers.set([]);
      this.hubRoles.set([]);

      // Still set current user as default
      const currentUser = this.authState.user();
      if (currentUser && !this.form.get('host')?.value) {
        this.form.patchValue({ host: currentUser.id || 'current-user' });
      }
    } finally {
      this.loadingTeamMembers.set(false);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadExperienceForEdit(id: string): Promise<void> {
    const success = await this.onboardingService.loadExperience(id);
    if (success) {
      // Populate local form from service
      const title = this.onboardingService.basicInfoForm.get('experienceTitle')?.value;
      this.form.patchValue({ experienceTitle: title });

      // Schedule data is loaded via scheduleFormData computed - UiScheduleFormComponent handles it

      // Load tickets
      const existingTickets = this.onboardingService.ticketsForm.get('tickets')?.value || [];
      if (existingTickets.length > 0) {
        this.ticketArray.clear();
        existingTickets.forEach((ticket: { ticketName: string; ticketType: string; ticketPrice: number; ticketQty: number }, index: number) => {
          this.addTicketGroup(index === 0);
          const lastIndex = this.ticketArray.length - 1;
          const ticketGroup = this.ticketArray.at(lastIndex);
          ticketGroup.patchValue({
            ticketName: ticket.ticketName,
            ticketType: ticket.ticketType,
            standardRate: ticket.ticketPrice,
            ticketQty: ticket.ticketQty,
            saved: true,
          });
          if (ticket.ticketType === 'Free') {
            ticketGroup.get('standardRate')?.disable();
          }
        });
        this.addingTicket.set(false);
      }
    }
  }

  get ticketArray(): FormArray {
    return this.form.get('ticketArray') as FormArray;
  }

  get titleLength(): number {
    return this.form.get('experienceTitle')?.value?.length || 0;
  }

  isTitleInvalid(): boolean {
    const control = this.form.get('experienceTitle');
    return !!(control?.touched && control?.invalid);
  }

  hasMaxLengthError(): boolean {
    return !!this.form.get('experienceTitle')?.errors?.['maxlength'];
  }

  // Handle schedule data changes from UiScheduleFormComponent
  onScheduleDataChange(data: ScheduleFormData): void {
    const duration = msToDuration(data.experienceDuration || 0);

    this.onboardingService.bookingForm.patchValue({
      durationHours: duration.hours,
      durationMinutes: duration.minutes,
      timeZone: data.timezone,
      isMultiDay: data.isMultiDay,
      schedules: data.schedules || [],
    });
  }

  addTicketGroup(isFirst = false): void {
    if (this.ticketArray.length >= this.ticketTypeLimit) return;

    const ticketGroup = this.fb.group({
      id: [this.generateId()],
      ticketName: [isFirst ? 'Standard Ticket' : '', [Validators.required, Validators.maxLength(40)]],
      ticketType: ['Paid', Validators.required],
      standardRate: [{ value: '', disabled: false }, [Validators.required, Validators.min(0)]],
      ticketQty: ['', [Validators.required, Validators.min(1)]],
      saved: [false],
      editing: [false],
    });

    this.ticketArray.push(ticketGroup);
    this.addingTicket.set(true);
  }

  removeTicketGroup(index: number): void {
    this.ticketArray.removeAt(index);
    if (this.ticketArray.length === 0 || this.ticketArray.controls.every(c => c.get('saved')?.value)) {
      this.addingTicket.set(false);
    }
    this.syncTicketsToService();
  }

  saveTicket(index: number): void {
    const ticketGroup = this.ticketArray.at(index);
    ticketGroup.get('saved')?.setValue(true);
    ticketGroup.get('editing')?.setValue(false);
    this.addingTicket.set(false);
    this.syncTicketsToService();
  }

  editTicket(index: number): void {
    const ticketGroup = this.ticketArray.at(index);
    ticketGroup.get('editing')?.setValue(true);
    this.addingTicket.set(true);
  }

  onTicketTypeChange(index: number): void {
    const ticketGroup = this.ticketArray.at(index);
    const ticketType = ticketGroup.get('ticketType')?.value;
    const standardRateControl = ticketGroup.get('standardRate');

    if (ticketType === 'Free') {
      standardRateControl?.setValue(0);
      standardRateControl?.disable();
    } else {
      standardRateControl?.enable();
    }
  }

  private syncTicketsToService(): void {
    const tickets = this.ticketArray.controls
      .filter(c => c.get('saved')?.value)
      .map(c => ({
        ticketType: c.get('ticketType')?.value as 'Paid' | 'Free',
        ticketName: c.get('ticketName')?.value,
        ticketPrice: c.get('standardRate')?.value || 0,
        ticketQty: c.get('ticketQty')?.value || 0,
        description: '',
        hasCutoffTime: false,
        cutoffNumber: 0,
        cutoffTime: 'Hour(s)',
        cutoffBeforeAfter: 'before',
      }));

    this.onboardingService.ticketsForm.patchValue({ tickets });
  }

  isFieldInvalid(index: number, fieldName: string): boolean {
    const control = this.ticketArray.at(index).get(fieldName);
    return !!(control?.touched && control?.invalid);
  }

  getTicketNameLength(index: number): number {
    return this.ticketArray.at(index).get('ticketName')?.value?.length || 0;
  }

  isFormValid(): boolean {
    const allTicketsSaved = this.ticketArray.controls.every(c => c.get('saved')?.value);
    const booking = this.onboardingService.bookingForm.value;
    const hasSchedule = (booking.schedules?.length ?? 0) > 0;
    const hasDuration = (booking.durationHours || 0) > 0 || (booking.durationMinutes || 0) > 0;
    return this.form.valid && allTicketsSaved && hasDuration && hasSchedule && this.ticketArray.length > 0;
  }

  goBack(): void {
    this.router.navigate(['/onboarding/experience/select-type']);
  }

  async saveAndExit(): Promise<void> {
    this.prepareForSave();
    const result = await this.onboardingService.saveDraft();
    if (result) {
      this.router.navigate(['/hub/services/experiences']);
    }
  }

  async publish(): Promise<void> {
    if (!this.isFormValid()) return;

    this.prepareForSave();
    const result = await this.onboardingService.publish();
    if (result) {
      this.router.navigate(['/hub/services/experiences']);
    }
  }

  private prepareForSave(): void {
    // Set minimal required fields for express listing
    const title = this.form.get('experienceTitle')?.value;
    const selectedHostId = this.form.get('host')?.value;

    // Get selected host details
    const selectedHost = this.hosts().find(h => h.id === selectedHostId);

    // Set express form (buildPayload reads from expressForm for express listings)
    this.onboardingService.expressForm.patchValue({
      experienceTitle: title,
      slug: generateSlug(title || ''),
    });

    // Set host details for the payload
    if (selectedHost) {
      this.onboardingService.setExpressHostDetails({
        userId: selectedHost.id,
        name: selectedHost.name.replace(' (You)', ''), // Remove "(You)" suffix
        email: selectedHost.email,
        photoUrl: selectedHost.photoUrl,
        description: selectedHost.bio,
      });
    }

    // Schedules are already set by UiScheduleFormComponent via onScheduleDataChange

    // Sync tickets
    this.syncTicketsToService();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }
}
