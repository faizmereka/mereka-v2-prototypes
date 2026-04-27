import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@mereka/ui';
import { ExpertiseDatePickerComponent, type SelectedDate } from '../expertise-date-picker/expertise-date-picker.component';
import { ExpertiseTimeSlotsComponent, type SelectedTimeSlot, type TimeSlot } from '../expertise-time-slots/expertise-time-slots.component';
import type { ExpertiseTicket, OperatingHours, OperatingDay, ExpertiseSlotsResponse, ExpertiseDateSlots } from '../../models';
import { ExpertiseService } from '../../services/expertise.service';

export interface BookingDialogData {
  ticket: ExpertiseTicket;
  operatingHours: OperatingHours | null;
  slug: string; // Required for API call
}

export interface BookingDialogResult {
  date: Date;
  timeSlot: TimeSlot;
}

type DialogStep = 'date' | 'time';

@Component({
  selector: 'app-expertise-booking-dialog',
  standalone: true,
  imports: [CommonModule, ExpertiseDatePickerComponent, ExpertiseTimeSlotsComponent],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-semibold text-neutral-900">Select Date & Time</h2>
          <p class="text-sm text-neutral-500 mt-1">{{ data.ticket.ticketName }} - {{ durationDisplay() }}</p>
        </div>
        <button
          type="button"
          (click)="close()"
          class="p-2 hover:bg-neutral-100 rounded-full transition-colors">
          <svg class="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="min-h-[320px] flex items-center justify-center">
          <div class="text-center">
            <svg class="animate-spin h-8 w-8 mx-auto text-primary" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="mt-3 text-sm text-neutral-500">Loading available slots...</p>
          </div>
        </div>
      } @else if (error()) {
        <!-- Error State -->
        <div class="min-h-[320px] flex items-center justify-center">
          <div class="text-center max-w-sm">
            <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-neutral-900 mb-2">Not Available</h3>
            <p class="text-sm text-neutral-600">{{ error() }}</p>
          </div>
        </div>
      } @else {
        <!-- Steps indicator -->
        <div class="flex items-center gap-2 mb-6">
          <div
            [class]="step() === 'date'
              ? 'flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-full text-sm font-medium'
              : 'flex items-center gap-2 px-3 py-1.5 bg-neutral-100 text-neutral-600 rounded-full text-sm'">
            <span class="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-xs">1</span>
            <span>Date</span>
          </div>
          <svg class="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          <div
            [class]="step() === 'time'
              ? 'flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-full text-sm font-medium'
              : 'flex items-center gap-2 px-3 py-1.5 bg-neutral-100 text-neutral-600 rounded-full text-sm'">
            <span class="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-xs">2</span>
            <span>Time</span>
          </div>
        </div>

        <!-- Content -->
        <div class="min-h-[320px]">
          @if (step() === 'date') {
            <app-expertise-date-picker
              [operatingHours]="data.operatingHours"
              [availableDates]="availableDates()"
              (dateSelected)="onDateSelected($event)" />
          } @else {
            <div class="space-y-4">
              <!-- Back to date -->
              <button
                type="button"
                (click)="goBackToDate()"
                class="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span>{{ selectedDateDisplay() }}</span>
              </button>

              <app-expertise-time-slots
                [selectedDate]="selectedDate()"
                [operatingDay]="selectedOperatingDay()"
                [operatingHours]="data.operatingHours"
                [selectedTicket]="data.ticket"
                [apiSlots]="selectedDateSlots()"
                (timeSlotSelected)="onTimeSlotSelected($event)" />
            </div>
          }
        </div>

        <!-- Footer -->
        @if (selectedTimeSlot()) {
          <div class="mt-6 pt-4 border-t border-neutral-100">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-neutral-500">Selected</p>
                <p class="font-medium text-neutral-900">
                  {{ selectedDateDisplay() }} at {{ selectedTimeSlot()?.label }}
                </p>
              </div>
              <button
                type="button"
                (click)="confirm()"
                class="px-6 py-2.5 bg-primary text-white font-medium rounded-full hover:bg-primary-dark transition-colors">
                Confirm
              </button>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class ExpertiseBookingDialogComponent implements OnInit {
  private readonly dialogRef = inject(DialogRef<BookingDialogResult>);
  private readonly expertiseService = inject(ExpertiseService);
  readonly data = inject<BookingDialogData>(DIALOG_DATA);

  readonly step = signal<DialogStep>('date');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selectedDate = signal<Date | null>(null);
  readonly selectedOperatingDay = signal<OperatingDay | null>(null);
  readonly selectedDateSlots = signal<ExpertiseDateSlots | null>(null);
  readonly selectedTimeSlot = signal<TimeSlot | null>(null);
  readonly availableDates = signal<ExpertiseDateSlots[]>([]);

  readonly durationDisplay = computed(() => {
    const ticket = this.data.ticket;
    if (!ticket.sessionDuration) return '';
    if (ticket.durationUnit === 'hours') {
      return ticket.sessionDuration === 1 ? '1 hour' : `${ticket.sessionDuration} hours`;
    }
    return `${ticket.sessionDuration} min`;
  });

  readonly selectedDateDisplay = computed(() => {
    const date = this.selectedDate();
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  });

  async ngOnInit(): Promise<void> {
    await this.loadSlots();
  }

  private async loadSlots(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const slotsData = await this.expertiseService.getExpertiseSlots(
        this.data.slug,
        this.data.ticket.id
      );
      if (slotsData) {
        this.availableDates.set(slotsData.availableDates);
        if (slotsData.availableDates.length === 0) {
          this.error.set('This expertise is not available for booking. Please contact the host to set up their operating hours.');
        }
      }
    } catch (error) {
      console.error('Failed to load slots:', error);
      this.error.set('Failed to load available slots. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  onDateSelected(event: SelectedDate): void {
    this.selectedDate.set(event.date);
    this.selectedOperatingDay.set(event.operatingDay);
    this.selectedDateSlots.set(event.dateSlots || null);
    this.selectedTimeSlot.set(null);
    this.step.set('time');
  }

  onTimeSlotSelected(event: SelectedTimeSlot): void {
    this.selectedTimeSlot.set(event.slot);
  }

  goBackToDate(): void {
    this.step.set('date');
  }

  confirm(): void {
    const date = this.selectedDate();
    const timeSlot = this.selectedTimeSlot();
    if (date && timeSlot) {
      this.dialogRef.close({ date, timeSlot });
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
