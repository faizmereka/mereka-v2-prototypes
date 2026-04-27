import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { OperatingHours, OperatingDay, ExpertiseTicket, ExpertiseDateSlots, ExpertiseTimeSlot } from '../../models';

export interface TimeSlot {
  time: string; // HH:mm format
  label: string; // Display format (e.g., "9:00 AM")
  endTime: string; // End time for this session
  endLabel: string;
  available: boolean; // From API - whether slot is bookable
}

export interface SelectedTimeSlot {
  slot: TimeSlot;
  date: Date;
}

@Component({
  selector: 'app-expertise-time-slots',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './expertise-time-slots.component.html',
})
export class ExpertiseTimeSlotsComponent {
  readonly selectedDate = input<Date | null>(null);
  readonly operatingDay = input<OperatingDay | null>(null);
  readonly operatingHours = input<OperatingHours | null>(null);
  readonly selectedTicket = input<ExpertiseTicket | null>(null);
  readonly apiSlots = input<ExpertiseDateSlots | null>(null); // API slots for selected date
  readonly timeSlotSelected = output<SelectedTimeSlot>();

  readonly selectedSlot = signal<TimeSlot | null>(null);

  readonly dateLabel = computed(() => {
    const date = this.selectedDate();
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  });

  readonly timeSlots = computed<TimeSlot[]>(() => {
    const date = this.selectedDate();
    const apiData = this.apiSlots();
    const ticket = this.selectedTicket();

    if (!date) return [];

    // If we have API slots data, use it
    if (apiData && apiData.slots.length > 0) {
      const sessionDuration = this.getSessionDurationMinutes(ticket);
      return apiData.slots.map((slot) => ({
        time: slot.time,
        label: this.formatTime(slot.time),
        endTime: this.calculateEndTime(slot.time, sessionDuration),
        endLabel: this.formatTime(this.calculateEndTime(slot.time, sessionDuration)),
        available: slot.available,
      }));
    }

    // Fall back to client-side generation
    const day = this.operatingDay();
    const opHours = this.operatingHours();

    // Get start and end times
    let startTime: string;
    let endTime: string;

    if (day && day.isActive && !day.fullDay) {
      startTime = day.startTime || '09:00';
      endTime = day.endTime || '17:00';
    } else if (opHours?.allOperatingHours) {
      startTime = opHours.allOperatingStartTime || '09:00';
      endTime = opHours.allOperatingEndTime || '17:00';
    } else {
      // Default operating hours
      startTime = '09:00';
      endTime = '17:00';
    }

    // Session duration in minutes
    const sessionDuration = this.getSessionDurationMinutes(ticket);
    const bufferTime = ticket?.hasBufferTime ? (ticket.bufferTime || 0) : 0;
    const slotInterval = sessionDuration + bufferTime;

    return this.generateTimeSlots(startTime, endTime, sessionDuration, slotInterval);
  });

  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const startMinutes = this.timeToMinutes(startTime);
    return this.minutesToTime(startMinutes + durationMinutes);
  }

  readonly hasSlots = computed(() => this.timeSlots().length > 0);

  private getSessionDurationMinutes(ticket: ExpertiseTicket | null): number {
    if (!ticket?.sessionDuration) return 60; // Default 1 hour

    if (ticket.durationUnit === 'hours') {
      return ticket.sessionDuration * 60;
    }
    return ticket.sessionDuration;
  }

  private generateTimeSlots(
    startTime: string,
    endTime: string,
    sessionDuration: number,
    slotInterval: number
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];

    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    for (let current = startMinutes; current + sessionDuration <= endMinutes; current += slotInterval) {
      const time = this.minutesToTime(current);
      const slotEndTime = this.minutesToTime(current + sessionDuration);

      slots.push({
        time,
        label: this.formatTime(time),
        endTime: slotEndTime,
        endLabel: this.formatTime(slotEndTime),
        available: true, // Client-side generation assumes all slots are available
      });
    }

    return slots;
  }

  private timeToMinutes(time: string): number {
    const [hours, mins] = time.split(':').map(Number);
    return hours * 60 + mins;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  private formatTime(time: string): string {
    const [hours, mins] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  }

  selectSlot(slot: TimeSlot): void {
    const date = this.selectedDate();
    if (!date || !slot.available) return;

    this.selectedSlot.set(slot);
    this.timeSlotSelected.emit({ slot, date });
  }

  isSelected(slot: TimeSlot): boolean {
    const selected = this.selectedSlot();
    return selected?.time === slot.time;
  }
}
