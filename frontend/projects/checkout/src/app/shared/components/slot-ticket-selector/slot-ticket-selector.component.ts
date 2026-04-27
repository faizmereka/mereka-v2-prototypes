import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import type {
  ExperienceSlot,
  ExperienceSlotTicket,
} from '../../../core/services';

export interface SelectedTicket {
  ticketId: string;
  ticketName: string;
  quantity: number;
  unitPrice: number;
}

const INITIAL_SLOTS_LIMIT = 10;

@Component({
  selector: 'app-slot-ticket-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <!-- Slot Selection with Inline Tickets -->
      @if (slots().length === 0) {
        <p class="text-neutral-500 text-center py-8">No available slots</p>
      } @else {
        <div class="space-y-2">
          @for (slot of visibleSlots(); track slot.id) {
            <div
              class="border rounded-lg overflow-hidden transition-all"
              [class.border-black]="selectedSlotId() === slot.id"
              [class.border-neutral-200]="selectedSlotId() !== slot.id"
            >
              <!-- Slot Header (clickable) -->
              <button
                type="button"
                (click)="onSelectSlot(slot)"
                [disabled]="slot.totalAvailableQuantity === 0"
                class="w-full p-3 flex items-center justify-between text-left transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
                [class.bg-neutral-50]="selectedSlotId() === slot.id"
              >
                <div class="flex items-center gap-3">
                  <!-- Radio indicator -->
                  <div
                    class="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    [class.border-black]="selectedSlotId() === slot.id"
                    [class.border-neutral-300]="selectedSlotId() !== slot.id"
                  >
                    @if (selectedSlotId() === slot.id) {
                      <div class="w-2.5 h-2.5 rounded-full bg-black"></div>
                    }
                  </div>
                  <div>
                    <div class="font-medium text-neutral-900 text-sm">
                      {{ formatDate(slot.startTime) }}
                    </div>
                    <div class="text-xs text-neutral-500">
                      {{ formatTime(slot.startTime) }} - {{ formatTime(slot.endTime) }}
                    </div>
                  </div>
                </div>
                @if (slot.totalAvailableQuantity === 0) {
                  <span class="text-xs text-red-600 font-medium">Sold Out</span>
                } @else if (slot.totalAvailableQuantity <= 5) {
                  <span class="text-xs text-orange-600">{{ slot.totalAvailableQuantity }} left</span>
                }
              </button>

              <!-- Inline Ticket Selection (expanded when selected) -->
              @if (selectedSlotId() === slot.id) {
                <div class="border-t border-neutral-200 bg-white p-3 space-y-2">
                  @for (ticket of slot.tickets; track ticket.id) {
                    <div
                      class="flex items-center justify-between py-2"
                      [class.opacity-50]="ticket.availableQuantity === 0"
                    >
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="font-medium text-sm text-neutral-900">{{ ticket.name }}</span>
                          <span class="text-sm text-neutral-600">
                            @if (ticket.type === 'Free') {
                              Free
                            } @else {
                              {{ currency() }} {{ ticket.price | number:'1.0-0' }}
                            }
                          </span>
                        </div>
                        @if (ticket.availableQuantity === 0) {
                          <span class="text-xs text-red-600">Sold Out</span>
                        } @else if (ticket.availableQuantity <= 5) {
                          <span class="text-xs text-orange-600">Only {{ ticket.availableQuantity }} left</span>
                        } @else {
                          <span class="text-xs text-neutral-500">{{ ticket.availableQuantity }} seats available</span>
                        }
                      </div>

                      <!-- Compact Quantity Controls -->
                      <div class="flex items-center gap-2">
                        <button
                          type="button"
                          (click)="decrementTicket(ticket); $event.stopPropagation()"
                          [disabled]="getTicketQuantity(ticket.id) === 0"
                          class="w-7 h-7 rounded-full border border-neutral-300 flex items-center justify-center
                                 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-600"
                        >
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                          </svg>
                        </button>
                        <span class="w-6 text-center font-medium text-sm">
                          {{ getTicketQuantity(ticket.id) }}
                        </span>
                        <button
                          type="button"
                          (click)="incrementTicket(ticket); $event.stopPropagation()"
                          [disabled]="ticket.availableQuantity === 0 || getTicketQuantity(ticket.id) >= ticket.availableQuantity"
                          class="w-7 h-7 rounded-full border border-neutral-300 flex items-center justify-center
                                 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed text-neutral-600"
                        >
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Show More Button -->
        @if (hasMoreSlots() && !showAllSlots()) {
          <button
            type="button"
            (click)="showAllSlots.set(true)"
            class="w-full py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            Show {{ remainingSlots() }} more dates
          </button>
        }
      }
    </div>
  `,
})
export class SlotTicketSelectorComponent {
  readonly slots = input.required<ExperienceSlot[]>();
  readonly currency = input<string>('MYR');

  readonly slotSelected = output<ExperienceSlot>();
  readonly ticketsSelected = output<SelectedTicket[]>();

  readonly selectedSlotId = signal<string | null>(null);
  readonly ticketQuantities = signal<Record<string, number>>({});
  readonly showAllSlots = signal(false);

  readonly visibleSlots = computed(() => {
    const all = this.slots();
    if (this.showAllSlots()) return all;
    return all.slice(0, INITIAL_SLOTS_LIMIT);
  });

  readonly hasMoreSlots = computed(() => this.slots().length > INITIAL_SLOTS_LIMIT);

  readonly remainingSlots = computed(() =>
    Math.max(0, this.slots().length - INITIAL_SLOTS_LIMIT)
  );

  readonly selectedSlot = computed(() => {
    const id = this.selectedSlotId();
    if (!id) return null;
    return this.slots().find((s) => s.id === id) || null;
  });

  readonly totalTickets = computed(() => {
    return Object.values(this.ticketQuantities()).reduce((sum, qty) => sum + qty, 0);
  });

  readonly subtotal = computed(() => {
    const slot = this.selectedSlot();
    if (!slot) return 0;

    const quantities = this.ticketQuantities();
    return slot.tickets.reduce((sum, ticket) => {
      const qty = quantities[ticket.id] || 0;
      return sum + ticket.price * qty;
    }, 0);
  });

  onSelectSlot(slot: ExperienceSlot): void {
    if (slot.totalAvailableQuantity === 0) return;

    this.selectedSlotId.set(slot.id);
    this.ticketQuantities.set({}); // Reset ticket selections
    this.slotSelected.emit(slot);
    this.emitTicketsSelected();
  }

  getTicketQuantity(ticketId: string): number {
    return this.ticketQuantities()[ticketId] || 0;
  }

  incrementTicket(ticket: ExperienceSlotTicket): void {
    if (ticket.availableQuantity === 0) return;

    const quantities = { ...this.ticketQuantities() };
    const current = quantities[ticket.id] || 0;

    if (current < ticket.availableQuantity) {
      quantities[ticket.id] = current + 1;
      this.ticketQuantities.set(quantities);
      this.emitTicketsSelected();
    }
  }

  decrementTicket(ticket: ExperienceSlotTicket): void {
    const quantities = { ...this.ticketQuantities() };
    const current = quantities[ticket.id] || 0;

    if (current > 0) {
      quantities[ticket.id] = current - 1;
      this.ticketQuantities.set(quantities);
      this.emitTicketsSelected();
    }
  }

  private emitTicketsSelected(): void {
    const slot = this.selectedSlot();
    if (!slot) return;

    const quantities = this.ticketQuantities();
    const selected: SelectedTicket[] = slot.tickets
      .filter((t) => quantities[t.id] > 0)
      .map((t) => ({
        ticketId: t.id,
        ticketName: t.name,
        quantity: quantities[t.id],
        unitPrice: t.price,
      }));

    this.ticketsSelected.emit(selected);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}
