import { Component, OnInit, inject, computed, signal, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UiCollapsibleComponent, UiExpertiseTicketFormComponent, ExpertisePackage } from '@mereka/ui';
import {
  ExpertiseOnboardingService,
  type OperatingHours,
  type ExpertiseTicket,
} from '../../services/expertise-onboarding.service';

interface DaySchedule {
  day: string;
  label: string;
  isActive: boolean;
  fullDay: boolean;
  startTime: string;
  endTime: string;
}

@Component({
  selector: 'app-expertise-availability-rates',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, UiCollapsibleComponent, UiExpertiseTicketFormComponent],
  templateUrl: './availability-rates.component.html',
})
export class ExpertiseAvailabilityRatesComponent implements OnInit, AfterViewInit {
  @ViewChild('ticketFormComponent') ticketFormComponent!: UiExpertiseTicketFormComponent;
  private readonly onboardingService = inject(ExpertiseOnboardingService);

  // Expose forms from service
  readonly bookingForm = this.onboardingService.bookingForm;
  readonly pricingForm = this.onboardingService.pricingForm;

  // Track availability type reactively
  readonly availabilityType = signal<string>('');

  // =============================================================================
  // Audience Options (Expertise Access)
  // =============================================================================

  readonly audienceOptions = [
    {
      value: 'Everyone',
      label: 'Everyone',
      tooltip: null as string | null,
    },
    {
      value: 'Hidden',
      label: 'I want my Expertise to be hidden',
      tooltip:
        'This means that your Expertise can only be found using a direct URL. It will not be visible upon search.',
    },
  ];

  // =============================================================================
  // Availability Options
  // =============================================================================

  readonly availabilityTypeOptions = [
    {
      value: 'flexible',
      label: 'Flexible',
      description: 'This Expertise does not require a meeting schedule or it will be discussed upon booking',
    },
    {
      value: 'autofill',
      label: 'Autofill from profile operating hours',
      description: 'Use your hub\'s operating hours as availability',
    },
    {
      value: 'manual',
      label: 'Manually fill available hours',
      description: 'Define specific days and times when you are available',
    },
  ];

  // Time options for dropdowns
  readonly timeOptions = this.generateTimeOptions();

  // Operating hours state
  readonly days = signal<DaySchedule[]>([
    { day: 'monday', label: 'Monday', isActive: true, fullDay: false, startTime: '09:00', endTime: '17:00' },
    { day: 'tuesday', label: 'Tuesday', isActive: true, fullDay: false, startTime: '09:00', endTime: '17:00' },
    { day: 'wednesday', label: 'Wednesday', isActive: true, fullDay: false, startTime: '09:00', endTime: '17:00' },
    { day: 'thursday', label: 'Thursday', isActive: true, fullDay: false, startTime: '09:00', endTime: '17:00' },
    { day: 'friday', label: 'Friday', isActive: true, fullDay: false, startTime: '09:00', endTime: '17:00' },
    { day: 'saturday', label: 'Saturday', isActive: false, fullDay: false, startTime: '10:00', endTime: '14:00' },
    { day: 'sunday', label: 'Sunday', isActive: false, fullDay: false, startTime: '10:00', endTime: '14:00' },
  ]);

  readonly sameHoursForAll = signal(false);
  readonly allStartTime = signal('09:00');
  readonly allEndTime = signal('17:00');

  readonly isManualAvailability = computed(() => {
    return this.availabilityType() === 'manual';
  });

  readonly isAutofillAvailability = computed(() => {
    return this.availabilityType() === 'autofill';
  });

  readonly isFlexibleAvailability = computed(() => {
    return this.availabilityType() === 'flexible';
  });

  // Show operating hours UI for both manual and autofill
  readonly showOperatingHours = computed(() => {
    const type = this.availabilityType();
    return type === 'manual' || type === 'autofill';
  });

  // =============================================================================
  // Service Fee Options
  // =============================================================================

  readonly feePaidByOptions = [
    {
      value: 'learner',
      label: 'Learner pays service fee',
      description: 'Service fee will be added to the booking price',
    },
    {
      value: 'expert',
      label: 'I will absorb the service fee',
      description: 'Service fee will be deducted from your earnings',
    },
  ];

  // =============================================================================
  // Ticket Management
  // =============================================================================

  readonly editingTicketIndex = signal<number | null>(null);
  readonly editingTicket = signal<ExpertiseTicket | null>(null);

  readonly durationUnitOptions = [
    { value: 'minutes', label: 'Minutes' },
    { value: 'hours', label: 'Hours' },
  ];

  readonly packageModeOptions = [
    { value: 'online', label: 'Online' },
    { value: 'physical', label: 'In-Person' },
    { value: 'hybrid', label: 'Both' },
  ];

  get tickets(): ExpertiseTicket[] {
    return this.onboardingService.ticketsValue;
  }

  readonly hasTickets = computed(() => this.tickets.length > 0);

  // =============================================================================
  // Lifecycle
  // =============================================================================

  ngOnInit(): void {
    // Initialize availability type signal from form
    const initialAvailabilityType = this.bookingForm.get('availabilityType')?.value || '';
    this.availabilityType.set(initialAvailabilityType);

    // Subscribe to availability type changes
    this.bookingForm.get('availabilityType')?.valueChanges.subscribe((value) => {
      this.availabilityType.set(value || '');
    });

    // Load existing operating hours
    const existingHours = this.bookingForm.get('operatingHours')?.value as OperatingHours | null;
    if (existingHours?.days) {
      this.days.set(
        existingHours.days.map((d) => ({
          day: d.day,
          label: this.getDayLabel(d.day),
          isActive: d.isActive,
          fullDay: d.fullDay || false,
          startTime: d.startTime || '09:00',
          endTime: d.endTime || '17:00',
        }))
      );
      this.sameHoursForAll.set(existingHours.sameOperatingHoursForAll || false);
      if (existingHours.allOperatingStartTime) {
        this.allStartTime.set(existingHours.allOperatingStartTime);
      }
      if (existingHours.allOperatingEndTime) {
        this.allEndTime.set(existingHours.allOperatingEndTime);
      }
    }
  }

  ngAfterViewInit(): void {
    // Set existing packages to the ticket form component
    const existingTickets = this.tickets;
    if (existingTickets.length > 0 && this.ticketFormComponent) {
      setTimeout(() => {
        // Convert ExpertiseTicket to ExpertisePackage format
        const packages: ExpertisePackage[] = existingTickets.map(t => ({
          id: t.id,
          ticketType: t.ticketType as 'Paid' | 'Free',
          ticketName: t.ticketName,
          sessionDuration: t.sessionDuration,
          durationUnit: t.durationUnit as 'minutes' | 'hours',
          ticketPrice: t.ticketPrice,
          expertiseMode: (t.expertiseMode ?? 'online') as 'online' | 'physical',
          asapBookings: t.asapBookings ?? false,
          hasBufferTime: t.hasBufferTime ?? false,
          bufferTime: t.bufferTime ?? 15,
          description: t.description ?? '',
          isEditing: false,
          isSaved: true,
        }));
        this.ticketFormComponent.setPackages(packages);
      });
    }
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private getDayLabel(day: string): string {
    const labels: Record<string, string> = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
    };
    return labels[day] || day;
  }

  private generateTimeOptions(): Array<{ value: string; label: string }> {
    const options: Array<{ value: string; label: string }> = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const h = hour.toString().padStart(2, '0');
        const m = minute.toString().padStart(2, '0');
        const period = hour < 12 ? 'AM' : 'PM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        options.push({
          value: `${h}:${m}`,
          label: `${displayHour}:${m.padStart(2, '0')} ${period}`,
        });
      }
    }
    return options;
  }

  // =============================================================================
  // Operating Hours Methods
  // =============================================================================

  updateOperatingHours(): void {
    const hours: OperatingHours = {
      sameOperatingHoursForAll: this.sameHoursForAll(),
      allOperatingStartTime: this.sameHoursForAll() ? this.allStartTime() : undefined,
      allOperatingEndTime: this.sameHoursForAll() ? this.allEndTime() : undefined,
      days: this.days().map((d) => ({
        day: d.day,
        isActive: d.isActive,
        fullDay: d.fullDay,
        startTime: d.startTime,
        endTime: d.endTime,
      })),
    };
    this.bookingForm.patchValue({ operatingHours: hours });
  }

  toggleDay(index: number): void {
    const updated = [...this.days()];
    updated[index] = { ...updated[index], isActive: !updated[index].isActive };
    this.days.set(updated);
    this.updateOperatingHours();
  }

  toggleFullDay(index: number): void {
    const updated = [...this.days()];
    updated[index] = { ...updated[index], fullDay: !updated[index].fullDay };
    this.days.set(updated);
    this.updateOperatingHours();
  }

  updateDayTime(index: number, field: 'startTime' | 'endTime', value: string): void {
    const updated = [...this.days()];
    updated[index] = { ...updated[index], [field]: value };
    this.days.set(updated);
    this.updateOperatingHours();
  }

  toggleSameHoursForAll(): void {
    this.sameHoursForAll.update((v) => !v);
    this.updateOperatingHours();
  }

  updateAllStartTime(value: string): void {
    this.allStartTime.set(value);
    this.updateOperatingHours();
  }

  updateAllEndTime(value: string): void {
    this.allEndTime.set(value);
    this.updateOperatingHours();
  }

  // =============================================================================
  // Ticket Methods
  // =============================================================================

  addTicket(): void {
    this.onboardingService.addTicket();
    this.editTicket(this.tickets.length - 1);
  }

  editTicket(index: number): void {
    this.editingTicketIndex.set(index);
    this.editingTicket.set({ ...this.tickets[index] });
  }

  cancelEdit(): void {
    this.editingTicketIndex.set(null);
    this.editingTicket.set(null);
  }

  saveTicket(): void {
    const index = this.editingTicketIndex();
    const ticket = this.editingTicket();
    if (index !== null && ticket) {
      this.onboardingService.updateTicket(index, ticket);
      this.cancelEdit();
    }
  }

  removeTicket(index: number): void {
    if (confirm('Are you sure you want to remove this package?')) {
      this.onboardingService.removeTicket(index);
      if (this.editingTicketIndex() === index) {
        this.cancelEdit();
      }
    }
  }

  duplicateTicket(index: number): void {
    this.onboardingService.duplicateTicket(index);
  }

  updateEditingTicket(field: keyof ExpertiseTicket, value: unknown): void {
    const current = this.editingTicket();
    if (current) {
      this.editingTicket.set({ ...current, [field]: value });
    }
  }

  // Handler for the new ticket form component
  onPackagesChange(packages: ExpertisePackage[]): void {
    // Convert ExpertisePackage to ExpertiseTicket format and update service
    const tickets: ExpertiseTicket[] = packages.map(pkg => ({
      id: pkg.id,
      ticketType: pkg.ticketType,
      ticketName: pkg.ticketName,
      sessionDuration: pkg.sessionDuration,
      durationUnit: pkg.durationUnit,
      ticketPrice: pkg.ticketPrice,
      ticketQty: 10, // Default quantity
      description: pkg.description,
      expertiseMode: pkg.expertiseMode,
      asapBookings: pkg.asapBookings,
      hasBufferTime: pkg.hasBufferTime,
      bufferTime: pkg.bufferTime,
    }));
    this.onboardingService.setTickets(tickets);
  }

  formatDuration(ticket: ExpertiseTicket): string {
    const unit = ticket.durationUnit === 'hours' ? 'hr' : 'min';
    return `${ticket.sessionDuration} ${unit}`;
  }

  formatPrice(ticket: ExpertiseTicket): string {
    if (ticket.ticketType === 'Free') {
      return 'Free';
    }
    return `MYR ${ticket.ticketPrice.toFixed(2)}`;
  }

  formatMode(ticket: ExpertiseTicket): string {
    if (ticket.expertiseMode === 'physical') return 'In-Person';
    if (ticket.expertiseMode === 'hybrid') return 'Both';
    return 'Online';
  }
}
