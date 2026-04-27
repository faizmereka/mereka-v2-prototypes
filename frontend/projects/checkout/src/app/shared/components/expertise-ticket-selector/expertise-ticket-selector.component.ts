import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import type {
  ExpertiseTicketInfo,
  ExpertiseDateSlots,
  ExpertiseTimeSlot,
} from '../../../core/services';

export interface SelectedExpertiseSlot {
  ticketId: string;
  ticketName: string;
  date: string;
  time: string;
  unitPrice: number;
}

const INITIAL_DATES_LIMIT = 10;

@Component({
  selector: 'app-expertise-ticket-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <!-- Ticket Selection (if multiple tickets) -->
      @if (tickets().length > 1) {
        <div class="space-y-2">
          <h3 class="font-medium text-neutral-900 text-sm">Select Session Type</h3>
          <div class="space-y-2">
            @for (ticket of tickets(); track ticket.id) {
              <button
                type="button"
                (click)="onSelectTicket(ticket)"
                class="w-full p-3 border rounded-lg text-left transition-all flex items-center justify-between"
                [class.border-black]="selectedTicketId() === ticket.id"
                [class.bg-neutral-50]="selectedTicketId() === ticket.id"
                [class.border-neutral-200]="selectedTicketId() !== ticket.id"
              >
                <div class="flex items-center gap-3">
                  <!-- Radio indicator -->
                  <div
                    class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    [class.border-black]="selectedTicketId() === ticket.id"
                    [class.border-neutral-300]="selectedTicketId() !== ticket.id"
                  >
                    @if (selectedTicketId() === ticket.id) {
                      <div class="w-2.5 h-2.5 rounded-full bg-black"></div>
                    }
                  </div>
                  <div>
                    <div class="font-medium text-neutral-900 text-sm">{{ ticket.name }}</div>
                    <div class="text-xs text-neutral-500">
                      {{ ticket.sessionDuration }} {{ ticket.durationUnit }} · {{ ticket.mode }}
                    </div>
                  </div>
                </div>
                <div class="text-sm font-medium text-neutral-900">
                  @if (ticket.type === 'Free') {
                    Free
                  } @else {
                    {{ currency() }} {{ ticket.price | number:'1.0-0' }}
                  }
                </div>
              </button>
            }
          </div>
        </div>
      }

      <!-- Date & Time Selection -->
      @if (availableDates().length === 0) {
        <p class="text-neutral-500 text-center py-8">No available dates</p>
      } @else {
        <div class="space-y-2">
          <h3 class="font-medium text-neutral-900 text-sm">Select Date & Time</h3>
          <div class="space-y-2">
            @for (dateSlot of visibleDates(); track dateSlot.date) {
              <div
                class="border rounded-lg overflow-hidden transition-all"
                [class.border-black]="selectedDate() === dateSlot.date"
                [class.border-neutral-200]="selectedDate() !== dateSlot.date"
              >
                <!-- Date Header (clickable) -->
                <button
                  type="button"
                  (click)="onSelectDate(dateSlot)"
                  class="w-full p-3 flex items-center justify-between text-left transition-colors"
                  [class.bg-neutral-50]="selectedDate() === dateSlot.date"
                >
                  <div class="flex items-center gap-3">
                    <!-- Radio indicator -->
                    <div
                      class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      [class.border-black]="selectedDate() === dateSlot.date"
                      [class.border-neutral-300]="selectedDate() !== dateSlot.date"
                    >
                      @if (selectedDate() === dateSlot.date) {
                        <div class="w-2.5 h-2.5 rounded-full bg-black"></div>
                      }
                    </div>
                    <div>
                      <div class="font-medium text-neutral-900 text-sm">
                        {{ formatDate(dateSlot.date) }}
                      </div>
                      <div class="text-xs text-neutral-500">
                        {{ dateSlot.dayOfWeek }} · {{ getAvailableSlotsCount(dateSlot) }} slots available
                      </div>
                    </div>
                  </div>
                </button>

                <!-- Inline Time Slots (expanded when selected) -->
                @if (selectedDate() === dateSlot.date) {
                  <div class="border-t border-neutral-200 bg-white p-3">
                    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      @for (slot of dateSlot.slots; track slot.time) {
                        <button
                          type="button"
                          (click)="onSelectTime(slot); $event.stopPropagation()"
                          [disabled]="!slot.available"
                          class="px-3 py-2 text-sm rounded-lg border transition-colors text-center"
                          [class.border-black]="selectedTime() === slot.time && slot.available"
                          [class.bg-black]="selectedTime() === slot.time && slot.available"
                          [class.text-white]="selectedTime() === slot.time && slot.available"
                          [class.border-neutral-200]="selectedTime() !== slot.time || !slot.available"
                          [class.hover:border-neutral-400]="slot.available && selectedTime() !== slot.time"
                          [class.opacity-40]="!slot.available"
                          [class.cursor-not-allowed]="!slot.available"
                          [class.line-through]="!slot.available"
                        >
                          {{ formatTime(slot.time) }}
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Show More Button -->
          @if (hasMoreDates() && !showAllDates()) {
            <button
              type="button"
              (click)="showAllDates.set(true)"
              class="w-full py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Show {{ remainingDates() }} more dates
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class ExpertiseTicketSelectorComponent {
  readonly tickets = input.required<ExpertiseTicketInfo[]>();
  readonly availableDates = input.required<ExpertiseDateSlots[]>();
  readonly currency = input<string>('MYR');

  readonly slotSelected = output<SelectedExpertiseSlot | null>();
  readonly ticketChanged = output<ExpertiseTicketInfo>();

  readonly selectedTicketId = signal<string | null>(null);
  readonly selectedDate = signal<string | null>(null);
  readonly selectedTime = signal<string | null>(null);
  readonly showAllDates = signal(false);

  readonly visibleDates = computed(() => {
    const all = this.availableDates();
    if (this.showAllDates()) return all;
    return all.slice(0, INITIAL_DATES_LIMIT);
  });

  readonly hasMoreDates = computed(() => this.availableDates().length > INITIAL_DATES_LIMIT);

  readonly remainingDates = computed(() =>
    Math.max(0, this.availableDates().length - INITIAL_DATES_LIMIT)
  );

  readonly selectedTicket = computed(() => {
    const id = this.selectedTicketId();
    if (!id) return this.tickets()[0] || null;
    return this.tickets().find((t) => t.id === id) || null;
  });

  // Auto-select first ticket if only one
  ngOnInit(): void {
    const tickets = this.tickets();
    if (tickets.length === 1) {
      this.selectedTicketId.set(tickets[0].id);
    }
  }

  onSelectTicket(ticket: ExpertiseTicketInfo): void {
    this.selectedTicketId.set(ticket.id);
    // Reset date/time selection when ticket changes (different session durations may affect availability)
    this.selectedDate.set(null);
    this.selectedTime.set(null);
    this.ticketChanged.emit(ticket);
    this.emitSelection();
  }

  onSelectDate(dateSlot: ExpertiseDateSlots): void {
    this.selectedDate.set(dateSlot.date);
    this.selectedTime.set(null); // Reset time when date changes
    this.emitSelection();
  }

  onSelectTime(slot: ExpertiseTimeSlot): void {
    if (!slot.available) return;
    this.selectedTime.set(slot.time);
    this.emitSelection();
  }

  getAvailableSlotsCount(dateSlot: ExpertiseDateSlots): number {
    return dateSlot.slots.filter((s) => s.available).length;
  }

  private emitSelection(): void {
    const ticket = this.selectedTicket();
    const date = this.selectedDate();
    const time = this.selectedTime();

    if (!ticket || !date || !time) {
      this.slotSelected.emit(null);
      return;
    }

    this.slotSelected.emit({
      ticketId: ticket.id,
      ticketName: ticket.name,
      date,
      time,
      unitPrice: ticket.price,
    });
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatTime(timeStr: string): string {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }
}
